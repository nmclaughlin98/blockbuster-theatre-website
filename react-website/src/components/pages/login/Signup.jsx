import { useEffect, useState } from 'react';
import { cognitoAuth } from '../../../auth/cognitoAuth';
import { Layout } from '../../shared';
import { Toast } from '../../shared/Toast/Toast';
import { useToast } from '../../shared/Toast/useToast';
import styles from './Signup.module.css';

function getSignupErrorMessage(error) {
  if (error?.name === 'UsernameExistsException') {
    return 'An account with this email already exists. Try logging in.';
  }
  if (error?.name === 'InvalidPasswordException') {
    return 'Password does not meet the user pool requirements. Use 12+ characters with uppercase and lowercase letters, a number, and a symbol.';
  }
  if (error?.name === 'InvalidParameterException') {
    return 'Please check the name, email, and password and try again.';
  }
  if (error?.name === 'CodeMismatchException' || error?.name === 'ExpiredCodeException') {
    return 'That confirmation code is invalid or expired. Please check it and try again.';
  }
  if (error?.name === 'TooManyRequestsException' || error?.name === 'LimitExceededException') {
    return 'Too many attempts. Please wait and try again.';
  }
  if (error?.name === 'NotAuthorizedException') {
    return 'Sign-up is not available for this account. Please contact the theatre.';
  }
  if (error?.message?.startsWith('Cognito authentication is not configured')
    || error?.message?.startsWith('VITE_COGNITO_REGION')) {
    return `Sign-up setup error. ${error.message}`;
  }
  return 'Sign-up error. Please check your details and try again later.';
}

export function Signup({ authClient = cognitoAuth } = {}) {
  const { toast, setToastMessage } = useToast();
  const [email, setEmail] = useState('');
  const [isConfirmationRequired, setIsConfirmationRequired] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Create a Blockbuster Theatre account.');

  useEffect(() => {
    document.title = 'Blockbuster Theatre - Sign Up';
  }, []);

  function completeSignup() {
    setIsConfirmationRequired(false);
    setIsComplete(true);
    setStatusMessage('Your account is ready. You can now log in.');
    setToastMessage('Your account has been created. You can now log in.', 'success');
  }

  async function handleSignup(event) {
    event.preventDefault();
    if (isLoading) return;

    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get('firstName') ?? '').trim();
    const lastName = String(formData.get('lastName') ?? '').trim();
    const username = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!firstName || !lastName || !username || !password) {
      setToastMessage('Please complete all fields before creating your account.', 'warning');
      return;
    }

    setIsLoading(true);
    setToastMessage('');
    try {
      const result = await authClient.signUp({
        username,
        password,
        options: {
          userAttributes: {
            email: username,
            given_name: firstName,
            family_name: lastName,
          },
        },
      });

      if (result.isSignUpComplete) {
        completeSignup();
      } else if (result.nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        setEmail(username);
        setIsConfirmationRequired(true);
        setStatusMessage('Enter the confirmation code sent to your email address.');
        setToastMessage('A confirmation code has been sent to your email.', 'success');
      } else {
        const message = 'Your sign-up needs another step that is not available here. Please contact the theatre.';
        setStatusMessage(message);
        setToastMessage(message, 'warning');
      }
    } catch (error) {
      setToastMessage(getSignupErrorMessage(error), 'warning');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmation(event) {
    event.preventDefault();
    if (isLoading) return;

    const confirmationCode = String(new FormData(event.currentTarget).get('confirmationCode') ?? '').trim();
    if (!confirmationCode) {
      setToastMessage('Enter the confirmation code from your email.', 'warning');
      return;
    }

    setIsLoading(true);
    setToastMessage('');
    try {
      const result = await authClient.confirmSignUp({ username: email, confirmationCode });
      if (result.isSignUpComplete) {
        completeSignup();
      } else {
        const message = 'Email confirmation is not complete. Please check the code and try again.';
        setStatusMessage(message);
        setToastMessage(message, 'warning');
      }
    } catch (error) {
      setToastMessage(getSignupErrorMessage(error), 'warning');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Layout className={styles.root} current="login">
      <section className={styles.page} aria-labelledby="signup-heading">
        <div className={styles.card}>
          <h1 className={styles.title} id="signup-heading">Create your account</h1>
          <p className={styles.description}>
            {isConfirmationRequired
              ? `We sent a confirmation code to ${email}.`
              : isComplete
                ? 'Your account has been created.'
                : 'Sign up for your Blockbuster Theatre account.'}
          </p>

          {isComplete ? (
            <a className={styles.submit} href="./login">Go to Log In</a>
          ) : isConfirmationRequired ? (
            <form className={styles.form} onSubmit={handleConfirmation} aria-busy={isLoading}>
              <label className={styles.field} htmlFor="signup-confirmation-code">
                Confirmation code
                <input
                  className={styles.input}
                  id="signup-confirmation-code"
                  type="text"
                  name="confirmationCode"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  required
                  disabled={isLoading}
                />
              </label>
              <button className={styles.submit} type="submit" disabled={isLoading}>
                {isLoading ? 'Confirming...' : 'Confirm email'}
              </button>
            </form>
          ) : (
            <form className={styles.form} autoComplete="on" onSubmit={handleSignup} aria-busy={isLoading}>
              <div className={styles.nameFields}>
                <label className={styles.field} htmlFor="signup-first-name">
                  First name
                  <input
                    className={styles.input}
                    id="signup-first-name"
                    type="text"
                    name="firstName"
                    autoComplete="given-name"
                    required
                    disabled={isLoading}
                  />
                </label>
                <label className={styles.field} htmlFor="signup-last-name">
                  Last name
                  <input
                    className={styles.input}
                    id="signup-last-name"
                    type="text"
                    name="lastName"
                    autoComplete="family-name"
                    required
                    disabled={isLoading}
                  />
                </label>
              </div>
              <label className={styles.field} htmlFor="signup-email">
                Email address
                <input
                  className={styles.input}
                  id="signup-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                />
              </label>
              <label className={styles.field} htmlFor="signup-password">
                Password
                <input
                  className={styles.input}
                  id="signup-password"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                />
              </label>
              <button className={styles.submit} type="submit" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}

          <p className={styles.status} role="status">{statusMessage}</p>
          {!isComplete && (
            <a className={styles.loginLink} href="./login">Already have an account? Log in</a>
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
