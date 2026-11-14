import { useEffect, useState } from 'react';
import { Layout } from '../../shared';
import { Toast } from '../../shared/Toast/Toast';
import { useToast } from '../../shared/Toast/useToast';
import {
  COGNITO_AUTH_STATE_CHANGE_EVENT,
  cognitoAuth,
} from '../../../auth/cognitoAuth';
import styles from './Login.module.css';

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

function navigateToAccount() {
  window.location.assign('/account');
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
  onAuthenticated = navigateToAccount,
} = {}) {
  const { toast, setToastMessage } = useToast();
  const [statusMessage, setStatusMessage] = useState('Sign in with your existing account.');
  const [challenge, setChallenge] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSessionChecking, setIsSessionChecking] = useState(true);
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
          setIsRedirecting(true);
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
    if (isRedirecting) onAuthenticated();
  }, [isRedirecting, onAuthenticated]);

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
        window.dispatchEvent(new window.Event(COGNITO_AUTH_STATE_CHANGE_EVENT));
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

  return (
    <Layout className={styles.root} current="login">
      <section className={styles.page} aria-labelledby="login-heading">
        <div className={styles.card}>
          <h1 className={styles.title} id="login-heading">Log In</h1>
          <p className={styles.description}>Sign in to your Blockbuster Theatre account.</p>
          {isRedirecting ? (
            <p className={styles.notice} role="status">Redirecting to your account...</p>
          ) : isSessionChecking ? (
            <p className={styles.notice} role="status">Checking sign-in status...</p>
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
                {isLoading ? 'Signing in...' : challenge?.kind === 'code' ? 'Verify code'
                    : challenge?.kind === 'new-password' ? 'Set password' : 'Login'}
              </button>
              {!challenge && (
                <a className={styles.signupLink} href="./signup.html">
                  Sign up
                </a>
              )}
            </form>
          )}
          {!isSessionChecking && !isRedirecting && <p className={styles.notice} role="status">{statusMessage}</p>}
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
