import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: dom.window.navigator,
});

const vite = await createServer({
  configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});
const { GuestDetails } = await vite.ssrLoadModule(
  '/src/components/pages/booking/GuestDetails.jsx',
);
after(() => vite.close());

async function renderGuestDetails(authClient, initialData = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let submittedCustomer;

  await act(async () => {
    root.render(createElement(GuestDetails, {
      authClient,
      initialData,
      onBack: () => {},
      onNext: (customer) => { submittedCustomer = customer; },
      onToast: () => {},
    }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return {
    container,
    get submittedCustomer() {
      return submittedCustomer;
    },
    async continue() {
      await act(async () => {
        [...container.querySelectorAll('button')]
          .find((button) => button.textContent.includes('Review Booking'))
          .click();
      });
    },
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

test('prefills and makes account booking details read-only for signed-in customers', async () => {
  const page = await renderGuestDetails({
    fetchAuthSession: async () => ({
      tokens: {
        accessToken: { toString: () => 'access-token' },
        idToken: {
          payload: {
            given_name: 'Jane',
            family_name: 'Doe',
            email: 'jane@example.com',
          },
        },
      },
    }),
  }, {
    firstName: 'Old',
    surname: 'Guest',
    email: 'guest@example.com',
  });

  try {
    const firstName = page.container.querySelector('#guest-first-name');
    const surname = page.container.querySelector('#guest-surname');
    const email = page.container.querySelector('#guest-email');

    assert.equal(firstName.value, 'Jane');
    assert.equal(surname.value, 'Doe');
    assert.equal(email.value, 'jane@example.com');
    assert.equal(firstName.readOnly, true);
    assert.equal(surname.readOnly, true);
    assert.equal(email.readOnly, true);
    assert.match(page.container.textContent, /taken from your signed-in account/);

    await page.continue();
    assert.deepEqual(page.submittedCustomer, {
      firstName: 'Jane',
      surname: 'Doe',
      email: 'jane@example.com',
    });
  } finally {
    await page.unmount();
  }
});

test('leaves booking detail fields editable for guests', async () => {
  const page = await renderGuestDetails({
    fetchAuthSession: async () => ({ tokens: undefined }),
  }, {
    firstName: 'Guest',
    surname: 'Customer',
    email: 'guest@example.com',
  });

  try {
    for (const selector of ['#guest-first-name', '#guest-surname', '#guest-email']) {
      assert.equal(page.container.querySelector(selector).readOnly, false);
    }

    await page.continue();
    assert.deepEqual(page.submittedCustomer, {
      firstName: 'Guest',
      surname: 'Customer',
      email: 'guest@example.com',
    });
  } finally {
    await page.unmount();
  }
});
