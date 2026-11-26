import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
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
const { Header } = await vite.ssrLoadModule('/src/components/shared/Header/Header.jsx');
const { COGNITO_AUTH_STATE_CHANGE_EVENT } = await vite.ssrLoadModule('/src/auth/cognitoAuth.js');
after(() => vite.close());

async function renderLogin(authClient, onAuthenticated = () => { }) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(createElement(MemoryRouter, null, createElement(Login, { authClient, onAuthenticated })));
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

async function renderHeader(authClient) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let pathname;
  function LocationObserver() {
    pathname = useLocation().pathname;
    return null;
  }
  await act(async () => {
    root.render(createElement(
      MemoryRouter,
      { initialEntries: ['/about'] },
      createElement(LocationObserver),
      createElement(Header, { authClient }),
    ));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return {
    container,
    get pathname() { return pathname; },
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

test('toggles password visibility without clearing its value', async () => {
  const page = await renderLogin({
    fetchAuthSession: async () => ({ tokens: undefined }),
  });
  const passwordInput = page.container.querySelector('[name="password"]');
  const toggle = page.container.querySelector('[aria-label="Show password"]');
  passwordInput.value = 'secret-password';

  assert.equal(passwordInput.type, 'password');
  assert.equal(toggle.getAttribute('aria-pressed'), 'false');

  await act(async () => {
    toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });

  assert.equal(passwordInput.type, 'text');
  assert.equal(passwordInput.value, 'secret-password');
  assert.equal(page.container.querySelector('[aria-label="Hide password"]').getAttribute('aria-pressed'), 'true');

  await act(async () => {
    page.container.querySelector('[aria-label="Hide password"]').dispatchEvent(
      new window.MouseEvent('click', { bubbles: true }),
    );
  });

  assert.equal(passwordInput.type, 'password');
  assert.equal(passwordInput.value, 'secret-password');
  await page.unmount();
});

test('links to the signup page', async () => {
  const page = await renderLogin({
    fetchAuthSession: async () => ({ tokens: undefined }),
  });
  const signupLink = page.container.querySelector('a[href="/signup"]');
  assert.equal(signupLink.textContent.trim(), 'Sign up');
  await page.unmount();
});

test('signs in with SRP and navigates immediately after the session is confirmed', async (t) => {
  const notifications = [];
  const onAuthChange = (event) => {
    if (event.detail?.toastMessage) notifications.push(event.detail.toastMessage);
  };
  window.addEventListener(COGNITO_AUTH_STATE_CHANGE_EVENT, onAuthChange);
  t.after(() => window.removeEventListener(COGNITO_AUTH_STATE_CHANGE_EVENT, onAuthChange));
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
  assert.equal(authenticated, true);
  assert.deepEqual(notifications, ['Login successful.']);
  assert.doesNotMatch(page.container.textContent, /Welcome back|Signed in as|Log out/);
  assert.equal(page.container.querySelector('form'), null);
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
  assert.ok(page.container.querySelector('[data-type="warning"]'));
  assert.doesNotMatch(page.container.textContent, /Do not expose provider details/);
  assert.equal(page.container.querySelector('button[type="submit"]').disabled, false);
  await page.unmount();
});

test('does not redirect if sign-in does not produce an access token', async () => {
  let redirected = false;
  const page = await renderLogin({
    signIn: async () => ({ isSignedIn: true }),
    fetchAuthSession: async () => ({}),
  }, () => { redirected = true; });
  page.container.querySelector('[name="email"]').value = 'guest@example.com';
  page.container.querySelector('[name="password"]').value = 'secret-password';

  await page.submit();
  assert.equal(redirected, false);
  assert.match(page.container.textContent, /Login error/);
  assert.ok(page.container.querySelector('form'));
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

test('immediately redirects an existing Cognito session without showing account details', async (t) => {
  const notifications = [];
  const onAuthChange = (event) => {
    if (event.detail?.toastMessage) notifications.push(event.detail.toastMessage);
  };
  window.addEventListener(COGNITO_AUTH_STATE_CHANGE_EVENT, onAuthChange);
  t.after(() => window.removeEventListener(COGNITO_AUTH_STATE_CHANGE_EVENT, onAuthChange));
  let redirects = 0;
  const authClient = {
    signIn: async () => assert.fail('Sign-in should not be available while logged in'),
    confirmSignIn: async () => assert.fail('No challenge should be confirmed'),
    fetchAuthSession: async () => ({
      tokens: {
        accessToken: { toString: () => 'access-token' },
        idToken: {
          payload: {
            given_name: 'Jane',
            family_name: 'Doe',
          },
        },
      },
    }),
  };
  const page = await renderLogin(authClient, () => { redirects += 1; });

  assert.equal(redirects, 1);
  assert.deepEqual(notifications, []);
  assert.doesNotMatch(page.container.textContent, /Welcome back|Signed in as|Log out|Refresh session/);
  assert.equal(page.container.querySelector('form'), null);
  await page.unmount();
});

test('shows sign-in controls in the desktop navbar and mobile drawer when signed out', async () => {
  const page = await renderHeader({
    fetchAuthSession: async () => ({ tokens: undefined }),
  });
  const desktopSignIn = page.container.querySelector('.nav-desktop-auth .nav-account-cta-btn');
  const mobileSignIn = page.container.querySelector('.nav-mobile-auth .nav-account-cta-btn');

  assert.equal(desktopSignIn.textContent.trim(), 'SIGN IN');
  assert.equal(desktopSignIn.getAttribute('href'), '/login');
  assert.ok(desktopSignIn.querySelector('.nav-account-icon'));
  assert.equal(mobileSignIn.getAttribute('href'), '/login');
  assert.equal(mobileSignIn.textContent.trim(), 'SIGN IN');
  await page.unmount();
});

test('hides navbar auth controls until Cognito resolves', async () => {
  let resolveSession;
  const page = await renderHeader({
    fetchAuthSession: () => new Promise((resolve) => { resolveSession = resolve; }),
  });

  assert.equal(page.container.querySelector('.nav-desktop-auth'), null);
  assert.equal(page.container.querySelector('.nav-mobile-auth'), null);
  assert.equal(page.container.querySelector('.nav-account-cta-btn'), null);
  assert.equal(page.container.querySelector('[aria-label^="Open account menu"]'), null);

  await act(async () => {
    resolveSession({ tokens: undefined });
    await Promise.resolve();
  });
  assert.equal(page.container.querySelectorAll('.nav-account-cta-btn').length, 2);
  assert.ok(page.container.querySelector('.nav-desktop-auth'));
  assert.ok(page.container.querySelector('.nav-mobile-auth'));
  await page.unmount();
});

test('shows the Cognito profile dropdown and supports dismiss and sign-out', async (t) => {
  const notifications = [];
  const onAuthChange = (event) => {
    if (event.detail?.toastMessage) notifications.push(event.detail.toastMessage);
  };
  window.addEventListener(COGNITO_AUTH_STATE_CHANGE_EVENT, onAuthChange);
  t.after(() => window.removeEventListener(COGNITO_AUTH_STATE_CHANGE_EVENT, onAuthChange));
  let session = {
    tokens: {
      accessToken: { toString: () => 'access-token' },
      idToken: { payload: { name: 'Jane Doe', email: 'Jane@Example.com' } },
    },
  };
  let signOutCalls = 0;
  const page = await renderHeader({
    fetchAuthSession: async () => session,
    signOut: async () => { signOutCalls += 1; },
  });

  const avatarTrigger = page.container.querySelector('[aria-label^="Open account menu"]');
  assert.equal(avatarTrigger.querySelector('[role="img"]').textContent, 'JD');
  assert.equal(avatarTrigger.getAttribute('aria-label'), 'Open account menu for Jane Doe');

  await act(async () => {
    avatarTrigger.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
  const dropdown = page.container.querySelector('[role="menu"]');
  assert.match(dropdown.textContent, /Jane Doe/);
  const dropdownHeader = dropdown.firstElementChild;
  assert.ok(dropdownHeader);
  assert.equal(dropdownHeader.querySelector('strong').textContent, 'Jane Doe');
  assert.equal(dropdownHeader.querySelector('span').textContent, 'jane@example.com');
  assert.equal(dropdownHeader.tagName, 'DIV');
  assert.match(dropdown.textContent, /jane@example.com/);
  assert.ok(page.container.querySelector('[role="menuitem"][href="/account"]'));
  assert.ok(page.container.querySelector('[role="menuitem"][href="/account?tab=bookings"]'));
  assert.ok(page.container.querySelector('[role="menuitem"][href="/account?tab=settings"]'));
  assert.equal(dropdown.querySelectorAll('a').length, 3);
  const signOutIcon = dropdown.querySelector('button[role="menuitem"] span[aria-hidden="true"]');
  assert.equal(signOutIcon.tagName, 'SPAN');
  assert.equal(signOutIcon.textContent, 'logout');
  assert.equal(signOutIcon.getAttribute('aria-hidden'), 'true');

  await act(async () => {
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  assert.equal(avatarTrigger.getAttribute('aria-expanded'), 'false');
  await act(async () => new Promise((resolve) => window.setTimeout(resolve, 200)));
  assert.equal(page.container.querySelector('[role="menu"]'), null);

  await act(async () => {
    avatarTrigger.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {
    page.container.querySelector('[role="menu"] button[role="menuitem"]').dispatchEvent(
      new window.MouseEvent('click', { bubbles: true }),
    );
    await Promise.resolve();
  });
  assert.equal(signOutCalls, 1);
  assert.equal(page.pathname, '/login');
  assert.deepEqual(notifications, ['Logged out successfully.']);
  await act(async () => new Promise((resolve) => window.setTimeout(resolve, 200)));
  assert.equal(page.container.querySelector('[role="menu"]'), null);

  session = { tokens: undefined };
  await act(async () => {
    window.dispatchEvent(new window.Event(COGNITO_AUTH_STATE_CHANGE_EVENT));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  assert.equal(page.container.querySelector('.nav-desktop-auth .nav-account-cta-btn').textContent.trim(), 'SIGN IN');
  await page.unmount();
});

test('stays on the current page if signing out from the header fails', async () => {
  const page = await renderHeader({
    fetchAuthSession: async () => ({
      tokens: { accessToken: { toString: () => 'access-token' } },
    }),
    signOut: async () => { throw new Error('Sign-out failed'); },
  });
  try {
    await act(async () => {
      page.container.querySelector('[aria-label^="Open account menu"]').click();
    });
    await act(async () => {
      page.container.querySelector('[role="menu"] button[role="menuitem"]').click();
      await Promise.resolve();
    });
    assert.equal(page.pathname, '/about');
    assert.match(page.container.querySelector('[role="alert"]').textContent, /Could not sign out/);
  } finally {
    await page.unmount();
  }
});
