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
const { TicketDownloadButton } = await vite.ssrLoadModule('/src/components/shared/TicketDownloadButton/TicketDownloadButton.jsx');
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

function mockPosterImages(t, autoLoad = false) {
  const originalImage = window.Image;
  const images = [];
  window.Image = class {
    constructor() { images.push(this); }
    set src(value) {
      this.url = value;
      if (autoLoad) queueMicrotask(() => this.onload?.());
    }
  };
  t.after(() => { window.Image = originalImage; });
  return images;
}

test('shows account bookings, switches to history, and logs out', async () => {
  let signedIn = true;
  let redirected = false;
  const authClient = {
    fetchAuthSession: async () => signedIn ? session : {},
    signOut: async () => { signedIn = false; },
  };
  const page = await render(Account, {
    authClient,
    onSignedOut: () => { redirected = true; },
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
  assert.equal(redirected, true);
  assert.match(page.container.textContent, /log in to view your account/i);
  assert.doesNotMatch(page.container.textContent, /Film past/);
  assert.doesNotMatch(page.container.textContent, /jane@example.com/);
  await page.unmount();
});

test('loads appropriately sized posters once per movie and falls back when unavailable', async (t) => {
  mockPosterImages(t, true);
  const calls = [];
  const page = await render(Account, {
    authClient: { fetchAuthSession: async () => session },
    loadBookings: async () => [
      { ...makeBooking('first', '2099-01-01', '10:00'), movieId: '1003596' },
      { ...makeBooking('second', '2099-01-02', '10:00'), movieId: '1003596' },
      { ...makeBooking('missing', '2099-01-03', '10:00'), movieId: '42' },
      makeBooking('legacy', '2099-01-04', '10:00'),
      { ...makeBooking('past', '2020-01-01', '10:00'), movieId: '43' },
    ],
    loadMovieDetail: async (movieId) => {
      calls.push(movieId);
      if (movieId === '42') throw new Error('Movie not found');
      if (movieId === '43') return { poster: 'https://image.tmdb.org/t/p/original/history.jpg' };
      return { poster: 'https://image.tmdb.org/t/p/original/jzPwsojjFStf5lR5Nm07w2hH56G.jpg' };
    },
  });
  assert.deepEqual(calls, ['1003596', '42', '43']);
  const posters = [...page.container.querySelectorAll('img[alt$=" poster"]')];
  assert.equal(posters.length, 2);
  assert.equal(posters[0].getAttribute('src'), 'https://image.tmdb.org/t/p/w185/jzPwsojjFStf5lR5Nm07w2hH56G.jpg');
  assert.equal(posters[0].getAttribute('alt'), 'Film first poster');
  assert.equal(page.container.querySelectorAll('[aria-label="Poster unavailable"]').length, 2);

  await act(async () => posters[0].dispatchEvent(new window.Event('error')));
  assert.equal(page.container.querySelectorAll('[aria-label="Poster unavailable"]').length, 3);
  assert.equal(page.container.querySelectorAll('img[alt$=" poster"]').length, 1);
  await act(async () => [...page.container.querySelectorAll('button')].find((button) => button.textContent === 'History').click());
  assert.equal(page.container.querySelector('img[alt="Film past poster"]').getAttribute('src'), 'https://image.tmdb.org/t/p/w185/history.jpg');
  await page.unmount();
});

test('waits for poster details and image loads before showing bookings', async (t) => {
  const images = mockPosterImages(t);
  let resolvePoster;
  const page = await render(Account, {
    authClient: { fetchAuthSession: async () => session },
    loadBookings: async () => [
      { ...makeBooking('first', '2099-01-01', '10:00'), movieId: '1' },
      { ...makeBooking('second', '2099-01-02', '10:00'), movieId: '2' },
    ],
    loadMovieDetail: (movieId) => movieId === '1'
      ? new Promise((resolve) => { resolvePoster = resolve; })
      : Promise.resolve({ poster: 'https://image.tmdb.org/t/p/original/broken.jpg' }),
  });
  assert.match(page.container.querySelector('[role="status"]').textContent, /Loading bookings/);
  assert.ok(page.container.querySelector('[role="status"] .loader'));
  assert.doesNotMatch(page.container.textContent, /Film first|Film second/);
  await act(async () => {
    resolvePoster({ poster: 'https://image.tmdb.org/t/p/original/first.jpg' });
    await Promise.resolve();
  });
  assert.equal(images.length, 2);
  assert.equal(images[1].url, 'https://image.tmdb.org/t/p/w185/first.jpg');
  await act(async () => images[1].onload());
  assert.doesNotMatch(page.container.textContent, /Film first|Film second/);
  await act(async () => images[0].onerror());
  assert.match(page.container.textContent, /Film first/);
  assert.match(page.container.textContent, /Film second/);
  assert.equal(page.container.querySelector('img[alt="Film first poster"]').getAttribute('src'), images[1].url);
  assert.ok(page.container.querySelector('[aria-label="Poster unavailable"]'));
  assert.equal(page.container.querySelector('[role="status"]'), null);
  await page.unmount();
});

test('discards poster results after the session changes', async () => {
  let signedIn = true;
  let resolvePoster;
  let posterSignal;
  const page = await render(Account, {
    authClient: { fetchAuthSession: async () => signedIn ? session : {} },
    loadBookings: async () => [{ ...makeBooking('private', '2099-01-01', '10:00'), movieId: '1003596' }],
    loadMovieDetail: (_movieId, signal) => {
      posterSignal = signal;
      return new Promise((resolve) => { resolvePoster = resolve; });
    },
  });
  assert.match(page.container.textContent, /Loading bookings/);
  assert.doesNotMatch(page.container.textContent, /Film private/);

  signedIn = false;
  await act(async () => {
    window.dispatchEvent(new window.Event(COGNITO_AUTH_STATE_CHANGE_EVENT));
    resolvePoster({ poster: 'https://image.tmdb.org/t/p/original/poster.jpg' });
    await Promise.resolve();
  });
  assert.equal(posterSignal.aborted, true);
  assert.doesNotMatch(page.container.textContent, /Film private/);
  assert.equal(page.container.querySelector('img[alt$=" poster"]'), null);
  await page.unmount();
});

test('cancels pending poster image loads when the session changes', async (t) => {
  const images = mockPosterImages(t);
  let signedIn = true;
  const page = await render(Account, {
    authClient: { fetchAuthSession: async () => signedIn ? session : {} },
    loadBookings: async () => [{ ...makeBooking('private', '2099-01-01', '10:00'), movieId: '1' }],
    loadMovieDetail: async () => ({ poster: 'https://image.tmdb.org/t/p/original/poster.jpg' }),
  });
  assert.equal(images.length, 1);
  assert.match(page.container.textContent, /Loading bookings/);
  signedIn = false;
  await act(async () => {
    window.dispatchEvent(new window.Event(COGNITO_AUTH_STATE_CHANGE_EVENT));
    await Promise.resolve();
  });
  assert.equal(images[0].onload, null);
  assert.equal(images[0].onerror, null);
  assert.doesNotMatch(page.container.textContent, /Film private/);
  assert.match(page.container.textContent, /log in to view your account/i);
  await page.unmount();
});

test('opens the selected booking ticket and closes with Escape, backdrop or close button', async () => {
  const first = { ...makeBooking('first', '2099-01-01', '10:00'), bookingRef: 'BBT-111111', seats: ['A1', 'A2'], guestName: 'Alex Smith', ticketCount: 2, totalAmount: 24, currency: 'GBP' };
  const second = { ...makeBooking('second', '2099-01-02', '19:30'), bookingRef: 'BBT-222222', screen: '5', seats: ['F10', 'F11'], guestName: 'Sam Jones', ticketCount: 2, totalAmount: 0, currency: 'GBP' };
  const legacy = makeBooking('legacy', '2099-01-03', '10:00');
  const page = await render(Account, {
    authClient: { fetchAuthSession: async () => session },
    loadBookings: async () => [first, second, legacy],
  });
  const ticketButtons = [...page.container.querySelectorAll('button')].filter((button) => button.textContent === 'View ticket');

  ticketButtons[0].focus();
  await act(async () => ticketButtons[0].click());
  let modal = document.body.querySelector('[role="dialog"]');
  assert.equal(modal.getAttribute('aria-label'), 'Your ticket');
  assert.match(modal.textContent, /BLOCKBUSTERTHEATRE/);
  assert.doesNotMatch(modal.textContent, /Booking confirmed/);
  assert.match(modal.textContent, /Film first/);
  assert.match(modal.textContent, /Screen 2/);
  assert.match(modal.textContent, /A1, A2/);
  assert.match(modal.textContent, /BBT-111111/);
  assert.match(modal.textContent, /Guest NameAlex Smith/);
  assert.match(modal.textContent, /Ticket Breakdown2 Tickets/);
  assert.match(modal.textContent, /Total£24\.00/);
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
  assert.match(modal.textContent, /Guest NameSam Jones/);
  assert.match(modal.textContent, /Ticket Breakdown2 Tickets/);
  assert.match(modal.textContent, /Total£0\.00/);
  assert.doesNotMatch(modal.textContent, /Alex Smith|£24\.00/);
  assert.equal(modal.querySelector('svg').getAttribute('aria-label'), 'QR code for booking reference BBT-222222');
  await act(async () => modal.parentElement.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  assert.equal(document.body.querySelector('[role="dialog"]'), null);

  await act(async () => ticketButtons[1].click());
  await act(async () => document.body.querySelector('[aria-label="Close ticket"]').click());
  assert.equal(document.body.querySelector('[role="dialog"]'), null);
  await act(async () => ticketButtons[2].click());
  modal = document.body.querySelector('[role="dialog"]');
  assert.doesNotMatch(modal.textContent, /Guest Name|Ticket Breakdown|Total/);
  await act(async () => document.body.querySelector('[aria-label="Close ticket"]').click());
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
  assert.equal([...page.container.querySelectorAll('button')].find((button) => button.textContent === 'Download ticket').disabled, true);
  assert.match(page.container.textContent, /No booking reference is available/);
  await page.unmount();
});

test('shows download actions only for upcoming bookings', async () => {
  const page = await render(Account, {
    authClient: { fetchAuthSession: async () => session },
    loadBookings: async () => [
      makeBooking('future', '2099-01-01', '10:00'),
      makeBooking('past', '2020-01-01', '10:00'),
    ],
  });
  assert.equal([...page.container.querySelectorAll('button')].filter((button) => button.textContent === 'View ticket').length, 1);
  assert.equal([...page.container.querySelectorAll('button')].filter((button) => button.textContent === 'Download ticket').length, 1);
  await act(async () => [...page.container.querySelectorAll('button')].find((button) => button.textContent === 'History').click());
  assert.ok([...page.container.querySelectorAll('button')].some((button) => button.textContent === 'View details'));
  assert.ok(![...page.container.querySelectorAll('button')].some((button) => button.textContent === 'Download ticket'));
  await page.unmount();
});

test('reusable download button passes its booking and reports failures', async () => {
  const booking = makeBooking('selected', '2099-01-01', '10:00');
  let rejectDownload;
  let attempts = 0;
  const page = await render(TicketDownloadButton, {
    booking,
    download: (selected) => {
      assert.equal(selected, booking);
      attempts += 1;
      if (attempts === 2) return Promise.resolve();
      return new Promise((_resolve, reject) => { rejectDownload = reject; });
    },
  });
  const button = page.container.querySelector('button');
  await act(async () => button.click());
  assert.equal(button.disabled, true);
  assert.match(button.textContent, /Downloading/);
  await act(async () => rejectDownload(new Error('PDF generation failed')));
  assert.match(page.container.querySelector('[role="alert"]').textContent, /Could not download/);
  assert.equal(button.disabled, false);
  await act(async () => button.click());
  assert.equal(attempts, 2);
  assert.equal(page.container.querySelector('[role="alert"]'), null);
  assert.equal(button.textContent, 'Download ticket');
  await page.unmount();
});

test('opens historical booking details without a QR code, including bookings without a reference', async () => {
  const past = { ...makeBooking('past', '2020-01-01', '10:00'), guestName: 'Alex Smith', ticketCount: 2, totalAmount: 24, currency: 'GBP' };
  const legacy = makeBooking('legacy', '2020-01-02', '10:00');
  delete legacy.bookingRef;
  const page = await render(Account, {
    authClient: { fetchAuthSession: async () => session },
    loadBookings: async () => [past, legacy],
  });
  await act(async () => [...page.container.querySelectorAll('button')].find((button) => button.textContent === 'History').click());
  const buttons = [...page.container.querySelectorAll('button')].filter((button) => button.textContent === 'View details');
  assert.equal(buttons.length, 2);
  assert.ok(buttons.every((button) => !button.disabled));
  assert.doesNotMatch(page.container.textContent, /No booking reference is available/);

  await act(async () => buttons[1].click());
  let modal = document.body.querySelector('[role="dialog"]');
  assert.equal(modal.getAttribute('aria-label'), 'Booking details');
  assert.match(modal.textContent, /Film past/);
  assert.match(modal.textContent, /Booking referenceREF-past/);
  assert.match(modal.textContent, /Guest NameAlex Smith/);
  assert.match(modal.textContent, /Ticket Breakdown2 Tickets/);
  assert.match(modal.textContent, /Total£24\.00/);
  assert.equal(modal.querySelector('svg'), null);
  await act(async () => document.body.querySelector('[aria-label="Close booking details"]').click());

  await act(async () => buttons[0].click());
  modal = document.body.querySelector('[role="dialog"]');
  assert.match(modal.textContent, /Film legacy/);
  assert.doesNotMatch(modal.textContent, /Booking reference/);
  assert.equal(modal.querySelector('svg'), null);
  await act(async () => document.body.querySelector('[aria-label="Close booking details"]').click());
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

test('moves screenings to history at thirty minutes after theatre showtime', async () => {
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
        makeBooking('before-cutoff', '2030-07-01', '11:29'),
        makeBooking('at-cutoff', '2030-07-01', '11:30'),
        makeBooking('within-grace', '2030-07-01', '11:31'),
        makeBooking('now', '2030-07-01', '12:00'),
      ],
    });
    assert.match(page.container.textContent, /Film now/);
    assert.match(page.container.textContent, /Film within-grace/);
    assert.doesNotMatch(page.container.textContent, /Film before-cutoff|Film at-cutoff/);
    await act(async () => [...page.container.querySelectorAll('button')].find((button) => button.textContent === 'History').click());
    assert.match(page.container.textContent, /Film before-cutoff/);
    assert.match(page.container.textContent, /Film at-cutoff/);
    assert.doesNotMatch(page.container.textContent, /Film now|Film within-grace/);
    await page.unmount();
  } finally {
    globalThis.Date = RealDate;
  }
});

test('handles the grace period across midnight in theatre time', async () => {
  const RealDate = globalThis.Date;
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : ['2030-07-01T23:15:00Z']));
    }
    static now() { return new RealDate('2030-07-01T23:15:00Z').getTime(); }
  };
  try {
    const page = await render(Account, {
      authClient: { fetchAuthSession: async () => session },
      loadBookings: async () => [
        makeBooking('expired', '2030-07-01', '23:45'),
        makeBooking('late', '2030-07-01', '23:46'),
        makeBooking('today', '2030-07-02', '00:15'),
      ],
    });
    assert.match(page.container.textContent, /Film late/);
    assert.match(page.container.textContent, /Film today/);
    assert.doesNotMatch(page.container.textContent, /Film expired/);
    await act(async () => [...page.container.querySelectorAll('button')].find((button) => button.textContent === 'History').click());
    assert.match(page.container.textContent, /Film expired/);
    assert.doesNotMatch(page.container.textContent, /Film late|Film today/);
    await page.unmount();
  } finally {
    globalThis.Date = RealDate;
  }
});

test('updates an open ticket and booking list when the grace period ends', async () => {
  const RealDate = globalThis.Date;
  const realSetTimeout = window.setTimeout;
  const realClearTimeout = window.clearTimeout;
  let scheduled;
  window.setTimeout = (callback, delay) => {
    scheduled = { callback, delay };
    return 1;
  };
  window.clearTimeout = () => { };
  let now = new RealDate('2030-07-01T11:59:00Z').getTime();
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() { return now; }
  };
  try {
    const page = await render(Account, {
      authClient: { fetchAuthSession: async () => session },
      loadBookings: async () => [makeBooking('late', '2030-07-01', '12:30')],
    });
    assert.equal(scheduled.delay, 60_000);
    await act(async () => [...page.container.querySelectorAll('button')].find((button) => button.textContent === 'View ticket').click());
    assert.ok(document.body.querySelector('[role="dialog"] svg'));
    now = new RealDate('2030-07-01T12:00:00Z').getTime();
    await act(async () => scheduled.callback());
    const modal = document.body.querySelector('[role="dialog"]');
    assert.equal(modal.getAttribute('aria-label'), 'Booking details');
    assert.equal(modal.querySelector('svg'), null);
    assert.match(modal.textContent, /Booking referenceREF-late/);
    assert.match(page.container.textContent, /No upcoming bookings yet/);
    await act(async () => document.body.querySelector('[aria-label="Close booking details"]').click());
    await act(async () => [...page.container.querySelectorAll('button')].find((button) => button.textContent === 'History').click());
    assert.match(page.container.textContent, /Film late/);
    assert.ok([...page.container.querySelectorAll('button')].some((button) => button.textContent === 'View details'));
    await page.unmount();
  } finally {
    globalThis.Date = RealDate;
    window.setTimeout = realSetTimeout;
    window.clearTimeout = realClearTimeout;
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
  let redirected = false;
  const page = await render(Account, {
    authClient: {
      fetchAuthSession: async () => session,
      signOut: async () => { throw new Error('sign-out failed'); },
    },
    onSignedOut: () => { redirected = true; },
    loadBookings: async () => [],
  });
  await act(async () => {
    [...page.container.querySelectorAll('button')].find((button) => button.textContent === 'Log out').click();
    await Promise.resolve();
  });
  assert.match(page.container.querySelector('[role="alert"]').textContent, /Could not log out/);
  assert.equal(redirected, false);
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
    const booking = { ...makeBooking('x', '2099-01-01', '10:00'), movieId: '1003596', guestName: 'Alex Smith', ticketCount: 2, totalAmount: 0, currency: 'GBP' };
    globalThis.fetch = async () => new Response(JSON.stringify({ bookings: [booking] }));
    assert.deepEqual(await getAccountBookings('access-token'), [booking]);
    globalThis.fetch = async () => new Response(JSON.stringify({ bookings: [{ ...booking, movieId: 'bad' }] }));
    await assert.rejects(getAccountBookings('access-token'), /invalid account booking details/);
    for (const invalid of [{ guestName: ' ' }, { ticketCount: 3 }, { totalAmount: -1 }, { currency: 'gbp' }]) {
      globalThis.fetch = async () => new Response(JSON.stringify({ bookings: [{ ...booking, ...invalid }] }));
      await assert.rejects(getAccountBookings('access-token'), /invalid account booking details/);
    }
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Not authorized' }), { status: 401 });
    await assert.rejects(getAccountBookings('access-token'), /Not authorized/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
