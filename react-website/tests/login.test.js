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
const { Login } = await vite.ssrLoadModule('/src/components/pages/login/Login.jsx');
after(() => vite.close());

async function renderLogin(authClient, onAuthenticated = () => {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(createElement(Login, { authClient, onAuthenticated }));
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

test('signs in with SRP, waits for the session, and navigates after success', async () => {
  let resolveSignIn;
  const signInPromise = new Promise((resolve) => {
    resolveSignIn = resolve;
  });
  let authenticated = false;
  const authClient = {
    signIn: ({ username, password }) => {
      assert.equal(username, 'guest@example.com');
      assert.equal(password, 'secret-password');
      return signInPromise;
    },
    confirmSignIn: () => assert.fail('No challenge should be confirmed'),
    fetchAuthSession: async () => {
      if (!authClient.sessionChecked) {
        authClient.sessionChecked = true;
        return { tokens: undefined };
      }
      return { tokens: { accessToken: { toString: () => 'access-token' } } };
    },
    sessionChecked: false,
  };
  const page = await renderLogin(authClient, () => {
    authenticated = true;
  });
  assert.equal(page.container.querySelector('h1').textContent.trim(), 'Log In');
  page.container.querySelector('[name="email"]').value = 'guest@example.com';
  page.container.querySelector('[name="password"]').value = 'secret-password';

  await page.submit();
  const submitButton = page.container.querySelector('button[type="submit"]');
  assert.equal(submitButton.disabled, true);
  assert.equal(submitButton.textContent.trim(), 'Signing in...');
  assert.equal(authenticated, false);

  await act(async () => {
    resolveSignIn({ isSignedIn: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  assert.equal(submitButton.disabled, true);
  assert.match(page.container.textContent, /Login successful\./);
  assert.equal(page.container.querySelector('h1').textContent.trim(), 'Welcome back');
  assert.equal(authenticated, false);
  await act(async () => new Promise((resolve) => window.setTimeout(resolve, 1250)));
  assert.equal(authenticated, true);
  await page.unmount();
});

test('shows a safe invalid-credentials message for Cognito sign-in errors', async () => {
  const authClient = {
    signIn: async () => {
      const error = new Error('Do not expose provider details');
      error.name = 'NotAuthorizedException';
      throw error;
    },
    confirmSignIn: async () => assert.fail('No challenge should be confirmed'),
    fetchAuthSession: async () => ({ tokens: undefined }),
  };
  const page = await renderLogin(authClient);
  page.container.querySelector('[name="email"]').value = 'guest@example.com';
  page.container.querySelector('[name="password"]').value = 'wrong-password';

  await page.submit();
  assert.match(page.container.textContent, /Invalid login\./);
  assert.doesNotMatch(page.container.textContent, /Do not expose provider details/);
  assert.equal(page.container.querySelector('button[type="submit"]').disabled, false);
  await page.unmount();
});

test('completes an MFA code challenge with Cognito', async () => {
  let confirmedCode;
  let authenticated = false;
  const authClient = {
    signIn: async () => ({
      isSignedIn: false,
      nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_TOTP_CODE' },
    }),
    confirmSignIn: async (challengeResponse) => {
      confirmedCode = challengeResponse;
      return { isSignedIn: true };
    },
    fetchAuthSession: async () => {
      if (!authClient.sessionChecked) {
        authClient.sessionChecked = true;
        return { tokens: undefined };
      }
      return { tokens: { accessToken: { toString: () => 'access-token' } } };
    },
    sessionChecked: false,
  };
  const page = await renderLogin(authClient, () => {
    authenticated = true;
  });
  page.container.querySelector('[name="email"]').value = 'guest@example.com';
  page.container.querySelector('[name="password"]').value = 'secret-password';
  await page.submit();

  assert.match(page.container.textContent, /code from your authenticator app/i);
  assert.equal(page.container.querySelector('[name="password"]'), null);
  assert.equal(page.container.querySelector('button[type="submit"]').textContent.trim(), 'Verify code');
  page.container.querySelector('[name="challengeResponse"]').value = '123456';
  await page.submit();

  assert.equal(confirmedCode, '123456');
  assert.match(page.container.textContent, /Login successful\./);
  await act(async () => new Promise((resolve) => window.setTimeout(resolve, 1250)));
  assert.equal(authenticated, true);
  await page.unmount();
});

test('reports invalid MFA codes without exposing Cognito error details', async () => {
  const authClient = {
    signIn: async () => ({
      isSignedIn: false,
      nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_SMS_CODE' },
    }),
    confirmSignIn: async () => {
      const error = new Error('Provider response detail');
      error.name = 'CodeMismatchException';
      throw error;
    },
    fetchAuthSession: async () => ({ tokens: undefined }),
  };
  const page = await renderLogin(authClient);
  page.container.querySelector('[name="email"]').value = 'guest@example.com';
  page.container.querySelector('[name="password"]').value = 'secret-password';
  await page.submit();
  page.container.querySelector('[name="challengeResponse"]').value = '000000';
  await page.submit();

  assert.match(page.container.textContent, /Invalid verification code/i);
  assert.doesNotMatch(page.container.textContent, /Provider response detail/);
  await page.unmount();
});

test('labels missing Cognito configuration as a setup error', async () => {
  const authClient = {
    signIn: async () => {
      throw new Error(
        'Cognito authentication is not configured. Set VITE_COGNITO_REGION, VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_USER_POOL_CLIENT_ID.',
      );
    },
    confirmSignIn: async () => assert.fail('No challenge should be confirmed'),
    fetchAuthSession: async () => ({ tokens: undefined }),
  };
  const page = await renderLogin(authClient);
  page.container.querySelector('[name="email"]').value = 'guest@example.com';
  page.container.querySelector('[name="password"]').value = 'secret-password';
  await page.submit();

  assert.match(page.container.textContent, /Login setup error\./);
  await page.unmount();
});

test('accepts Cognito required-new-password challenges', async () => {
  let confirmedPassword;
  const authClient = {
    signIn: async () => ({
      isSignedIn: false,
      nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' },
    }),
    confirmSignIn: async (challengeResponse) => {
      confirmedPassword = challengeResponse;
      return { isSignedIn: true };
    },
    fetchAuthSession: async () => {
      if (!authClient.sessionChecked) {
        authClient.sessionChecked = true;
        return { tokens: undefined };
      }
      return { tokens: { accessToken: { toString: () => 'access-token' } } };
    },
    sessionChecked: false,
  };
  const page = await renderLogin(authClient);
  page.container.querySelector('[name="email"]').value = 'guest@example.com';
  page.container.querySelector('[name="password"]').value = 'temporary-password';
  await page.submit();

  assert.match(page.container.textContent, /Choose a new password/i);
  assert.equal(page.container.querySelector('[name="challengeResponse"]').autocomplete, 'new-password');
  page.container.querySelector('[name="challengeResponse"]').value = 'new-secure-password';
  await page.submit();

  assert.equal(confirmedPassword, 'new-secure-password');
  await page.unmount();
});

test('shows a logout button for an existing Cognito session', async () => {
  let hasSession = true;
  let signOutCalled = false;
  const authClient = {
    signIn: async () => assert.fail('Sign-in should not be available while logged in'),
    confirmSignIn: async () => assert.fail('No challenge should be confirmed'),
    fetchAuthSession: async () => ({
      tokens: hasSession ? {
        accessToken: { toString: () => 'access-token' },
        idToken: {
          payload: {
            given_name: 'Jane',
            family_name: 'Doe',
            auth_time: Math.floor(Date.now() / 1000),
          },
        },
      } : undefined,
    }),
    signOut: async () => {
      signOutCalled = true;
      hasSession = false;
    },
  };
  const page = await renderLogin(authClient);

  assert.match(page.container.textContent, /Already logged in\./);
  assert.match(page.container.textContent, /Signed in as Jane Doe\./);
  assert.equal(page.container.querySelector('h1').textContent.trim(), 'Welcome back');
  assert.match(page.container.textContent, /Refresh session expires in (29|30) days/);
  assert.match(page.container.textContent, /Access and ID tokens refresh automatically every 60 minutes/);
  assert.equal(page.container.querySelector('form'), null);
  const logoutButton = page.container.querySelector('button[type="button"]');
  assert.equal(logoutButton.textContent.trim(), 'Log out');
  await act(async () => {
    logoutButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });

  assert.equal(signOutCalled, true);
  assert.match(page.container.textContent, /Logged out successfully\./);
  assert.doesNotMatch(page.container.textContent, /Signed in as Jane Doe/);
  assert.ok(page.container.querySelector('form'));
  await page.unmount();
});
