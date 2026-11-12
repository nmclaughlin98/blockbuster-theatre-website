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
globalThis.FormData = dom.window.FormData;
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
const { Signup } = await vite.ssrLoadModule('/src/components/pages/login/Signup.jsx');
after(() => vite.close());

async function renderSignup(authClient) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(createElement(Signup, { authClient }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return {
    container,
    async submit() {
      await act(async () => {
        container.querySelector('form').dispatchEvent(
          new window.Event('submit', { bubbles: true, cancelable: true }),
        );
        await Promise.resolve();
      });
    },
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

test('signs up with Cognito name attributes and confirms the email address', async () => {
  let signupParameters;
  let confirmationParameters;
  const authClient = {
    signUp: async (parameters) => {
      signupParameters = parameters;
      return {
        isSignUpComplete: false,
        nextStep: { signUpStep: 'CONFIRM_SIGN_UP' },
      };
    },
    confirmSignUp: async (parameters) => {
      confirmationParameters = parameters;
      return { isSignUpComplete: true };
    },
  };
  const page = await renderSignup(authClient);

  try {
    page.container.querySelector('[name="firstName"]').value = 'Ada';
    page.container.querySelector('[name="lastName"]').value = 'Lovelace';
    page.container.querySelector('[name="email"]').value = 'ada@example.com';
    page.container.querySelector('[name="password"]').value = 'secret-password';
    await page.submit();

    assert.deepEqual(signupParameters, {
      username: 'ada@example.com',
      password: 'secret-password',
      options: {
        userAttributes: {
          email: 'ada@example.com',
          given_name: 'Ada',
          family_name: 'Lovelace',
        },
      },
    });
    assert.equal(page.container.querySelector('[name="confirmationCode"]').autocomplete, 'one-time-code');

    page.container.querySelector('[name="confirmationCode"]').value = '123456';
    await page.submit();
    assert.deepEqual(confirmationParameters, {
      username: 'ada@example.com',
      confirmationCode: '123456',
    });
    const loginLink = Array.from(page.container.querySelectorAll('a[href="./login.html"]')).find(
      (link) => link.textContent.trim() === 'Go to Log In',
    );
    assert.ok(loginLink);
    assert.ok(page.container.querySelector('[data-type="success"]'));
  } finally {
    await page.unmount();
  }

});
