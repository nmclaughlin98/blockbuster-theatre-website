import { Amplify } from 'aws-amplify';
import {
  confirmSignIn,
  fetchAuthSession,
  signIn,
  signOut,
} from 'aws-amplify/auth';

const environment = import.meta.env ?? {};
const config = {
  region: environment.VITE_COGNITO_REGION?.trim(),
  userPoolId: environment.VITE_COGNITO_USER_POOL_ID?.trim(),
  userPoolClientId: environment.VITE_COGNITO_USER_POOL_CLIENT_ID?.trim(),
};

export const COGNITO_AUTH_STATE_CHANGE_EVENT = 'cognito-auth-state-change';

let isConfigured = false;

function getCognitoConfig(allowMissing = false) {
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => ({
      region: 'VITE_COGNITO_REGION',
      userPoolId: 'VITE_COGNITO_USER_POOL_ID',
      userPoolClientId: 'VITE_COGNITO_USER_POOL_CLIENT_ID',
    }[key]));

  if (missing.length === Object.keys(config).length && allowMissing) return null;
  if (missing.length) {
    throw new Error(`Cognito authentication is not configured. Set ${missing.join(', ')}.`);
  }

  if (!config.userPoolId.startsWith(`${config.region}_`)) {
    throw new Error('VITE_COGNITO_REGION must match the region in VITE_COGNITO_USER_POOL_ID.');
  }

  return config;
}

function configureCognitoAuth() {
  if (isConfigured) return;

  const { userPoolId, userPoolClientId } = getCognitoConfig();
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: { email: true },
      },
    },
  });
  isConfigured = true;
}

export async function signInWithCognito({ username, password }) {
  configureCognitoAuth();
  return signIn({
    username,
    password,
    options: { authFlowType: 'USER_SRP_AUTH' },
  });
}

export async function confirmCognitoSignIn(challengeResponse) {
  configureCognitoAuth();
  return confirmSignIn({ challengeResponse });
}

export async function getCognitoSession() {
  configureCognitoAuth();
  return fetchAuthSession();
}

export async function signOutFromCognito() {
  configureCognitoAuth();
  return signOut();
}

export async function getCognitoAccessToken() {
  if (!getCognitoConfig(true)) return null;

  const session = await getCognitoSession();
  return session.tokens?.accessToken?.toString() ?? null;
}

export function getCognitoDisplayName(session) {
  const claims = session.tokens?.idToken?.payload ?? {};
  return [claims.given_name, claims.family_name]
    .filter((name) => typeof name === 'string' && name.trim())
    .map((name) => name.trim())
    .join(' ');
}

export const cognitoAuth = {
  signIn: signInWithCognito,
  confirmSignIn: confirmCognitoSignIn,
  fetchAuthSession: getCognitoSession,
  signOut: signOutFromCognito,
};
