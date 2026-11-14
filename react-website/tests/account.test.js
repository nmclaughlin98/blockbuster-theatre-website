import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { QRCodeSVG } from 'qrcode.react';
import { createServer } from 'vite';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/account' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });

const vite = await createServer({
  configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});
const { Account } = await vite.ssrLoadModule('/src/components/pages/account/Account.jsx');
const { Header } = await vite.ssrLoadModule('/src/components/shared/Header/Header.jsx');
const { getAccountBookings } = await vite.ssrLoadModule('/src/components/pages/shared/bookingApi.js');
const { COGNITO_AUTH_STATE_CHANGE_EVENT } = await vite.ssrLoadModule('/src/auth/cognitoAuth.js');
after(() => vite.close());

const session = {
  tokens: {
    accessToken: { toString: () => 'access-token' },
    idToken: { payload: { given_name: 'Jane', family_name: 'Doe', email: 'jane@example.com' } },
  },
};
const makeBooking = (bookingId, date, time) => ({
  bookingId, bookingRef: `REF-${bookingId}`, movieTitle: `Film ${bookingId}`, date, time, screen: '2', seats: ['A1', 'A2'],
});

async function render(component, props) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(createElement(component, props));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return {
    container,
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

test('shows account bookings, switches to history, and logs out', async () => {
  let signedIn = true;
  const authClient = {
    fetchAuthSession: async () => signedIn ? session : {},
    signOut: async () => { signedIn = false; },
  };
  const page = await render(Account, {
    authClient,
    loadBookings: async (token) => {
      assert.equal(token, 'access-token');
      return [makeBooking('past', '2020-01-01', '10:00'), makeBooking('future', '2099-01-01', '10:00')];
    },
  });
  assert.match(page.container.textContent, /Welcome, Jane Doe/);
  assert.equal(page.container.querySelector('input[type="email"]').value, 'jane@example.com');
  assert.equal(page.container.querySelector('input[type="tel"]').placeholder, 'Not available');
  assert.ok(page.container.querySelector('input[type="email"]').readOnly);
  assert.ok([...page.container.querySelectorAll('button')].find((button) => button.textContent === 'Save changes').disabled);
  assert.equal([...page.container.querySelectorAll('button')].find((button) => button.textContent === 'View ticket').disabled, false);
  assert.ok([...page.container.querySelectorAll('[role="switch"]')].every((toggle) => toggle.disabled));
  assert.match(page.container.textContent, /Film future/);
  assert.doesNotMatch(page.container.textContent, /Film past/);
  const history = [...page.container.querySelectorAll('button')].find((button) => button.textContent === 'History');
  await act(async () => history.click());
  assert.equal(history.getAttribute('aria-pressed'), 'true');
  assert.match(page.container.textContent, /Film past/);
  assert.doesNotMatch(page.container.textContent, /Film future/);
  const logout = [...page.container.querySelectorAll('button')].find((button) => button.textContent === 'Log out');
  await act(async () => { logout.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.match(page.container.textContent, /log in to view your account/i);
  assert.doesNotMatch(page.container.textContent, /Film past/);
  assert.doesNotMatch(page.container.textContent, /jane@example.com/);
  await page.unmount();
});

test('opens the selected booking ticket and closes with Escape, backdrop or close button', async () => {
  const first = { ...makeBooking('first', '2099-01-01', '10:00'), bookingRef: 'BBT-111111', seats: ['A1', 'A2'] };
  const second = { ...makeBooking('second', '2099-01-02', '19:30'), bookingRef: 'BBT-222222', screen: '5', seats: ['F10', 'F11'] };
  const page = await render(Account, {
    authClient: { fetchAuthSession: async () => session },
    loadBookings: async () => [first, second],
  });
  const ticketButtons = [...page.container.querySelectorAll('button')].filter((button) => button.textContent === 'View ticket');

  ticketButtons[0].focus();
  await act(async () => ticketButtons[0].click());
  let modal = document.body.querySelector('[role="dialog"]');
  assert.equal(modal.getAttribute('aria-label'), 'Your ticket');
  assert.match(modal.textContent, /BLOCKBUSTERTHEATREBooking confirmed/);
  assert.match(modal.textContent, /Film first/);
  assert.match(modal.textContent, /Screen 2/);
  assert.match(modal.textContent, /A1, A2/);
  assert.match(modal.textContent, /BBT-111111/);
  assert.doesNotMatch(modal.textContent, /Guest Name|Ticket Breakdown|Total/);
  const svgContainer = document.createElement('div');
  svgContainer.innerHTML = renderToStaticMarkup(createElement(QRCodeSVG, {
    value: 'BBT-111111', size: 160, level: 'M', boostLevel: false, marginSize: 4,
    bgColor: '#ffffff', fgColor: '#0c0d12', role: 'img',
    'aria-label': 'QR code for booking reference BBT-111111',
  }));
  assert.equal(modal.querySelector('svg').outerHTML, svgContainer.querySelector('svg').outerHTML);
  assert.equal(document.activeElement.getAttribute('aria-label'), 'Close ticket');
  assert.equal(document.body.classList.contains('noScroll'), true);
  const tab = new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  await act(async () => document.dispatchEvent(tab));
  assert.equal(tab.defaultPrevented, true);
  assert.equal(document.activeElement.getAttribute('aria-label'), 'Close ticket');

  await act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  assert.equal(document.body.querySelector('[role="dialog"]'), null);
  assert.equal(document.body.classList.contains('noScroll'), false);
  assert.equal(document.activeElement, ticketButtons[0]);

  await act(async () => ticketButtons[1].click());
  modal = document.body.querySelector('[role="dialog"]');
  assert.match(modal.textContent, /Film second/);
  assert.match(modal.textContent, /Screen 5/);
  assert.match(modal.textContent, /F10, F11/);
  assert.match(modal.textContent, /BBT-222222/);
  assert.match(modal.textContent, /19:30/);
  assert.equal(modal.querySelector('svg').getAttribute('aria-label'), 'QR code for booking reference BBT-222222');
  await act(async () => modal.parentElement.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  assert.equal(document.body.querySelector('[role="dialog"]'), null);

  await act(async () => ticketButtons[1].click());
  await act(async () => document.body.querySelector('[aria-label="Close ticket"]').click());
  assert.equal(document.body.querySelector('[role="dialog"]'), null);
  await page.unmount();
});

test('does not open a ticket for a booking without a reference', async () => {
  const booking = makeBooking('legacy', '2099-01-01', '10:00');
  delete booking.bookingRef;
  const page = await render(Account, {
    authClient: { fetchAuthSession: async () => session },
    loadBookings: async () => [booking],
  });
  assert.equal([...page.container.querySelectorAll('button')].find((button) => button.textContent === 'View ticket').disabled, true);
  assert.match(page.container.textContent, /No booking reference is available/);
  await page.unmount();
});

test('closes an open ticket when the authenticated session changes', async () => {
  let signedIn = true;
  const page = await render(Account, {
    authClient: { fetchAuthSession: async () => signedIn ? session : {} },
    loadBookings: async () => [makeBooking('private', '2099-01-01', '10:00')],
  });
  await act(async () => [...page.container.querySelectorAll('button')].find((button) => button.textContent === 'View ticket').click());
  assert.ok(document.body.querySelector('[role="dialog"]'));
  signedIn = false;
  await act(async () => {
    window.dispatchEvent(new window.Event(COGNITO_AUTH_STATE_CHANGE_EVENT));
    await Promise.resolve();
  });
  assert.equal(document.body.querySelector('[role="dialog"]'), null);
  assert.equal(document.body.classList.contains('noScroll'), false);
  await page.unmount();
});

test('shows booking failures instead of an empty history', async () => {
  const page = await render(Account, {
    authClient: { fetchAuthSession: async () => session },
    loadBookings: async () => { throw new Error('service failed'); },
  });
  assert.match(page.container.querySelector('[role="alert"]').textContent, /Could not load your bookings/);
  assert.equal(page.container.querySelector('input[type="email"]').value, 'jane@example.com');
  assert.doesNotMatch(page.container.textContent, /No upcoming bookings/);
  await page.unmount();
});

test('shows available phone claims and labels missing profile details', async () => {
  const page = await render(Account, {
    authClient: {
      fetchAuthSession: async () => ({
        tokens: {
          accessToken: { toString: () => 'access-token' },
          idToken: { payload: { phone_number: '+441234567890' } },
        },
      }),
    },
    loadBookings: async () => [],
  });
  assert.equal(page.container.querySelector('input[type="tel"]').value, '+441234567890');
  assert.match(page.container.textContent, /Name unavailable/);
  assert.match(page.container.textContent, /Email unavailable/);
  await page.unmount();
});

test('categorizes screenings using the theatre time on the same day', async () => {
  const RealDate = globalThis.Date;
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : ['2030-07-01T11:00:00Z']));
    }
    static now() { return new RealDate('2030-07-01T11:00:00Z').getTime(); }
  };
  try {
    const page = await render(Account, {
      authClient: { fetchAuthSession: async () => session },
      loadBookings: async () => [
        makeBooking('earlier', '2030-07-01', '11:59'),
        makeBooking('now', '2030-07-01', '12:00'),
      ],
    });
    assert.match(page.container.textContent, /Film now/);
    assert.doesNotMatch(page.container.textContent, /Film earlier/);
    await act(async () => [...page.container.querySelectorAll('button')].find((button) => button.textContent === 'History').click());
    assert.match(page.container.textContent, /Film earlier/);
    assert.doesNotMatch(page.container.textContent, /Film now/);
    await page.unmount();
  } finally {
    globalThis.Date = RealDate;
  }
});

test('does not show previous bookings after the session changes', async () => {
  let signedIn = true;
  let resolveBookings;
  const pending = new Promise((resolve) => { resolveBookings = resolve; });
  const page = await render(Account, {
    authClient: { fetchAuthSession: async () => signedIn ? session : {} },
    loadBookings: async () => pending,
  });
  signedIn = false;
  await act(async () => {
    window.dispatchEvent(new window.Event(COGNITO_AUTH_STATE_CHANGE_EVENT));
    await Promise.resolve();
    resolveBookings([makeBooking('private', '2099-01-01', '10:00')]);
    await Promise.resolve();
  });
  assert.match(page.container.textContent, /log in to view your account/i);
  assert.doesNotMatch(page.container.textContent, /Film private/);
  await page.unmount();
});

test('keeps the account visible when logout fails', async () => {
  const page = await render(Account, {
    authClient: {
      fetchAuthSession: async () => session,
      signOut: async () => { throw new Error('sign-out failed'); },
    },
    loadBookings: async () => [],
  });
  await act(async () => {
    [...page.container.querySelectorAll('button')].find((button) => button.textContent === 'Log out').click();
    await Promise.resolve();
  });
  assert.match(page.container.querySelector('[role="alert"]').textContent, /Could not log out/);
  assert.match(page.container.textContent, /Welcome, Jane Doe/);
  await page.unmount();
});

test('header links to the account only when authenticated', async () => {
  const signedIn = await render(Header, { authClient: { fetchAuthSession: async () => session } });
  assert.equal(signedIn.container.querySelector('.nav-account-cta-btn').getAttribute('href'), '/account');
  await signedIn.unmount();
  const signedOut = await render(Header, { authClient: { fetchAuthSession: async () => ({}) } });
  assert.equal(signedOut.container.querySelector('.nav-account-cta-btn').getAttribute('href'), '/login');
  await signedOut.unmount();
});

test('booking history request uses the session token and rejects malformed data', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(new URL(url).pathname, '/api/v1/bookings/account/history');
      assert.equal(options.headers.get('Authorization'), 'Bearer access-token');
      return new Response(JSON.stringify({ bookings: [makeBooking('x', '2020-02-30', '10:00')] }));
    };
    await assert.rejects(getAccountBookings('access-token'), /invalid account booking details/);
    await assert.rejects(getAccountBookings(''), /Sign in/);
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Not authorized' }), { status: 401 });
    await assert.rejects(getAccountBookings('access-token'), /Not authorized/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
