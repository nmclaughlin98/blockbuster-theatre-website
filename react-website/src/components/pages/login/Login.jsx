import { useEffect, useState } from 'react';
import { Layout } from '../../shared';
import { Toast } from '../../shared/Toast/Toast';
import { useToast } from '../../shared/Toast/useToast';
import {
  COGNITO_AUTH_STATE_CHANGE_EVENT,
  cognitoAuth,
  getCognitoFirstName,
  getCognitoFullName,
} from '../../../auth/cognitoAuth';
import styles from './Login.module.css';

const REFRESH_SESSION_DURATION_MS = 1 * 24 * 60 * 60 * 1000;

const codeChallenges = {
  CONFIRM_SIGN_IN_WITH_SMS_CODE: 'Enter the verification code sent to your phone.',
  CONFIRM_SIGN_IN_WITH_EMAIL_CODE: 'Enter the verification code sent to your email.',
  CONFIRM_SIGN_IN_WITH_TOTP_CODE: 'Enter the code from your authenticator app.',
};

function getChallenge(nextStep) {
  const { signInStep } = nextStep ?? {};
  if (codeChallenges[signInStep]) {
    return {
      kind: 'code',
      label: 'Verification code',
      message: codeChallenges[signInStep],
      autoComplete: 'one-time-code',
      inputMode: 'numeric',
    };
  }
  if (signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
    return {
      kind: 'new-password',
      label: 'New password',
      message: 'Choose a new password to finish signing in.',
      autoComplete: 'new-password',
      inputMode: undefined,
    };
  }
  return null;
}

function getNextStepMessage(signInStep) {
  if (signInStep === 'RESET_PASSWORD') {
    return 'A password reset is required. Please contact the theatre to reset your account.';
  }
  if (signInStep === 'CONFIRM_SIGN_UP') {
    return 'This account needs confirmation. Please verify your email before logging in.';
  }
  if (signInStep === 'CONTINUE_SIGN_IN_WITH_MFA_SELECTION') {
    return 'Choose an MFA method to continue. This account needs help from the theatre administrator.';
  }
  if (signInStep === 'CONTINUE_SIGN_IN_WITH_MFA_SETUP'
    || signInStep === 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP') {
    return 'MFA setup is required but is not available on this page. Please contact the theatre administrator.';
  }
  return 'This account requires an additional sign-in step that is not available on this page. Please contact the theatre administrator.';
}

function getSignInErrorMessage(error) {
  if (error?.name === 'NotAuthorizedException' || error?.name === 'UserNotFoundException') {
    return 'Invalid login. Check your email and password.';
  }
  if (error?.name === 'UserNotConfirmedException') {
    return 'Login unsuccessful. Please confirm your email address before logging in.';
  }
  if (error?.name === 'CodeMismatchException' || error?.name === 'ExpiredCodeException') {
    return 'Invalid verification code. Please try again.';
  }
  if (error?.name === 'InvalidPasswordException') {
    return 'Password does not meet requirements. Use 12+ characters with uppercase and lowercase letters, a number, and a symbol.';
  }
  if (error?.name === 'PasswordResetRequiredException') {
    return 'Login unsuccessful. A password reset is required; contact the theatre administrator.';
  }
  if (error?.name === 'TooManyRequestsException' || error?.name === 'LimitExceededException') {
    return 'Too many login attempts. Please wait and try again.';
  }
  if (error?.message?.startsWith('Cognito authentication is not configured')
    || error?.message?.startsWith('VITE_COGNITO_REGION')) {
    return `Login setup error. ${error.message}`;
  }
  return 'Login error. Please try again later.';
}

function navigateToHome() {
  window.location.assign('/');
}

function getSessionExpiry(session) {
  const authTime = Number(session.tokens?.idToken?.payload?.auth_time);
  return Number.isFinite(authTime) && authTime > 0
    ? authTime * 1000 + REFRESH_SESSION_DURATION_MS
    : null;
}

function getSessionDurationMessage(expiresAt, now) {
  if (!expiresAt) {
    return 'Your refresh session lasts up to 1 day from sign-in. Access and ID tokens refresh automatically.';
  }

  const totalMinutes = Math.ceil((expiresAt - now) / 60000);
  if (totalMinutes <= 0) {
    return 'Your refresh session has expired. Please log in again.';
  }

  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const duration = [
    days && `${days} day${days === 1 ? '' : 's'}`,
    hours && `${hours} hour${hours === 1 ? '' : 's'}`,
    !days && !hours && `${minutes} minute${minutes === 1 ? '' : 's'}`,
  ].filter(Boolean).join(', ');

  return `Refresh session expires in ${duration}. Access and ID tokens refresh automatically every 60 minutes.`;
}

function EmailInput({ disabled }) {
  return (
    <input
      className={styles.input}
      id="login-email"
      type="email"
      name="email"
      autoComplete="username"
      placeholder="john@example.com"
      required
      disabled={disabled}
    />
  );
}

function PasswordInput({ disabled }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={styles.passwordInput}>
      <input
        className={styles.input}
        id="login-password"
        type={isVisible ? 'text' : 'password'}
        name="password"
        autoComplete="current-password"
        placeholder="Enter your password"
        required
        disabled={disabled}
      />
      <button
        className={styles.passwordToggle}
        type="button"
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
        disabled={disabled}
        onClick={() => setIsVisible((visible) => !visible)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M2.25 12s3.5-6.25 9.75-6.25 9.75 6.25 9.75 6.25-3.5 6.25-9.75 6.25S2.25 12 2.25 12Z" />
          <circle cx="12" cy="12" r="2.75" />
          {isVisible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
  );
}

export function Login({
  authClient = cognitoAuth,
  onAuthenticated = navigateToHome,
} = {}) {
  const { toast, setToastMessage } = useToast();
  const [statusMessage, setStatusMessage] = useState('Sign in with your existing account.');
  const [challenge, setChallenge] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSessionChecking, setIsSessionChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const isBusy = isLoading || isRedirecting;

  useEffect(() => {
    document.title = 'Blockbuster Theatre - Login';
  }, []);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const session = await authClient.fetchAuthSession();
        if (active && session.tokens?.accessToken) {
          setSessionExpiresAt(getSessionExpiry(session));
          setCurrentTime(Date.now());
          setDisplayName(getCognitoFullName(session));
          setIsAuthenticated(true);
          setStatusMessage('You are already logged in.');
        }
      } catch (error) {
        if (active) setToastMessage(getSignInErrorMessage(error), 'warning');
      } finally {
        if (active) setIsSessionChecking(false);
      }
    }

    checkSession();
    return () => {
      active = false;
    };
  }, [authClient, setToastMessage]);

  useEffect(() => {
    if (!isRedirecting) return undefined;

    const timeout = window.setTimeout(onAuthenticated, 1200);
    return () => window.clearTimeout(timeout);
  }, [isRedirecting, onAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) return undefined;

    const interval = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, sessionExpiresAt]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isBusy) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsLoading(true);
    setToastMessage('');

    try {
      let result;
      if (challenge) {
        result = await authClient.confirmSignIn(
          String(formData.get('challengeResponse') ?? '').trim(),
        );
      } else {
        result = await authClient.signIn({
          username: String(formData.get('email') ?? '').trim(),
          password: String(formData.get('password') ?? ''),
        });
      }

      if (result.isSignedIn) {
        const session = await authClient.fetchAuthSession();
        if (!session.tokens?.accessToken) {
          throw new Error('Cognito returned a session without an access token.');
        }
        const name = getCognitoFirstName(session);
        const now = Date.now();
        setDisplayName(name);
        setSessionExpiresAt(getSessionExpiry(session));
        setCurrentTime(now);
        setIsAuthenticated(true);
        window.dispatchEvent(new window.Event(COGNITO_AUTH_STATE_CHANGE_EVENT));
        setToastMessage('Login successful.', 'success');
        setStatusMessage(name
          ? `Welcome back, ${name}. Redirecting to the home page...`
          : 'Login successful. Redirecting to the home page...');
        setIsRedirecting(true);
        return;
      }

      const nextChallenge = getChallenge(result.nextStep);
      if (nextChallenge) {
        setChallenge(nextChallenge);
        setStatusMessage(nextChallenge.message);
        const passwordInput = form.elements.namedItem('password');
        if (passwordInput) passwordInput.value = '';
        return;
      }

      const message = getNextStepMessage(result.nextStep?.signInStep);
      setStatusMessage(message);
      setToastMessage(message, 'warning');
    } catch (error) {
      setToastMessage(getSignInErrorMessage(error), 'warning');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    if (isLoading || isRedirecting) return;

    setIsLoading(true);
    setToastMessage('');
    try {
      await authClient.signOut();
      window.dispatchEvent(new window.Event(COGNITO_AUTH_STATE_CHANGE_EVENT));
      setDisplayName('');
      setSessionExpiresAt(null);
      setIsAuthenticated(false);
      setStatusMessage('You are signed out.');
      setToastMessage('Logged out successfully.', 'success');
    } catch {
      setToastMessage('Logout error. Please try again.', 'warning');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Layout className={styles.root} current="login">
      <section className={styles.page} aria-labelledby="login-heading">
        <div className={styles.card}>
          <h1 className={styles.title} id="login-heading">
            {isAuthenticated ? 'Welcome back' : 'Log In'}
          </h1>
          <p className={styles.description}>
            {isAuthenticated
              ? displayName ? `Signed in as ${displayName}.` : 'You are already logged in.'
              : 'Sign in to your Blockbuster Theatre account.'}
          </p>
          {isSessionChecking ? (
            <p className={styles.notice} role="status">Checking sign-in status...</p>
          ) : isAuthenticated ? (
            <div className={styles.form} aria-busy={isLoading}>
              <button
                className={styles.submit}
                type="button"
                onClick={handleSignOut}
                disabled={isLoading || isRedirecting}
              >
                {isLoading ? 'Logging out...' : 'Log out'}
              </button>
            </div>
          ) : (
            <form className={styles.form} autoComplete="on" onSubmit={handleSubmit} aria-busy={isBusy}>
              <div className={styles.field}>
                <label htmlFor="login-email">Email address</label>
                <EmailInput disabled={isBusy} />
              </div>
              {challenge ? (
                <label className={styles.field}>
                  <span>{challenge.label}</span>
                  <input
                    className={styles.input}
                    type={challenge.kind === 'new-password' ? 'password' : 'text'}
                    name="challengeResponse"
                    autoComplete={challenge.autoComplete}
                    inputMode={challenge.inputMode}
                    required
                    disabled={isBusy}
                  />
                </label>
              ) : (
                <div className={styles.field}>
                  <label htmlFor="login-password">Password</label>
                  <PasswordInput disabled={isBusy} />
                </div>
              )}
              <button className={styles.submit} type="submit" disabled={isBusy}>
                {isLoading ? 'Signing in...' : isRedirecting ? 'Success!'
                  : challenge?.kind === 'code' ? 'Verify code'
                    : challenge?.kind === 'new-password' ? 'Set password' : 'Login'}
              </button>
              {!challenge && (
                <a className={styles.signupLink} href="./signup.html">
                  Sign up
                </a>
              )}
            </form>
          )}
          {!isSessionChecking && <p className={styles.notice} role="status">{statusMessage}</p>}
          {isAuthenticated && (
            <p className={styles.notice} aria-live="off">
              {getSessionDurationMessage(sessionExpiresAt, currentTime)}
            </p>
          )}
        </div>
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToastMessage('')}
        />
      </section>
    </Layout>
  );
}
