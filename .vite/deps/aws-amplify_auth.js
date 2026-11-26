import { $ as assertAuthTokens, A as resetActiveSignInState, C as serializePkcWithAttestationToJson, D as PasskeyErrorCode, Dt as isAmplifyContext, E as PasskeyError, F as cacheCognitoTokens, Ft as AuthAction, G as createInitiateAuthClient, H as createCognitoUserPoolEndpointResolver, J as createUserPoolDeserializer, K as DEFAULT_SERVICE_CLIENT_API_CONFIG, Lt as assertOAuthConfig, M as signInStore, Mt as Hub, N as dispatchSignedInHubEvent, Nt as HubInternal, O as assertPasskeyError, Ot as getGlobalContext, P as resolveTokenOrchestrator, Q as getCurrentUser, R as DefaultOAuthStore, Rt as assertTokenProviderConfig, S as deserializeJsonToPkcCreationOptions, St as AuthValidationErrorCode, T as handlePasskeyError, Tt as resolveCtxArgs, U as createAssociateSoftwareTokenClient, Vt as ConsoleLogger, W as createVerifySoftwareTokenClient, X as createUserPoolSerializer, Y as assertServiceError, Z as getAuthUserAgentValue, _ as setActiveSignInUsername, _t as getRegionFromUserPoolId, a as getActiveSignInUsername, at as SETUP_TOTP_EXCEPTION, b as getNewDeviceMetadata, bt as AuthErrorCodes, c as getSignInResult, d as handleChallengeName, et as assertAuthTokensWithRefreshToken, f as handleCustomAuthFlowWithoutSRP, ft as composeServiceApi, g as handlePasswordSRP, h as handleUserSRPAuthFlow, i as assertUserNotAuthenticated, it as OAUTH_SIGNOUT_EXCEPTION, j as setActiveSignInState, jt as AMPLIFY_SYMBOL, k as passkeyErrorMap, kt as hasGlobalContext, l as getSignInResultFromError, m as handleUserPasswordAuthFlow, mt as parseJsonError, n as openAuthSession, o as getMFAType, ot as SignUpException, p as handleCustomSRPAuthFlow, pt as parseJsonBody, q as cognitoUserPoolTransferHandler, r as getRedirectUrl, rt as AUTO_SIGN_IN_EXCEPTION, s as getMFATypes, t as signInWithRedirect, tt as assertDeviceMetadata, u as getTOTPSetupDetails, v as retryOnResourceNotFoundException, vt as assertValidationError, w as getIsPasskeySupported, wt as defaultStorage, x as assertCredentialIsPkcWithAuthenticatorAttestationResponse, xt as validationErrorMap, y as getUserContextData, yt as AuthError, zt as decodeJWT } from "./signInWithRedirect-_5wIpnUp.js";
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/apiHelpers.mjs
/**
* Transforms a user attributes object into an array of AttributeType objects.
* @param attributes user attributes to be mapped to AttributeType objects.
* @returns an array of AttributeType objects.
*/
function toAttributeType(attributes) {
	return Object.entries(attributes).map(([key, value]) => ({
		Name: key,
		Value: value
	}));
}
/**
* Transforms an array of AttributeType objects into a user attributes object.
*
* @param attributes - an array of AttributeType objects.
* @returns AuthUserAttributes object.
*/
function toAuthUserAttribute(attributes) {
	const userAttributes = {};
	attributes?.forEach((attribute) => {
		if (attribute.Name) userAttributes[attribute.Name] = attribute.Value;
	});
	return userAttributes;
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/singleton/apis/isUnconfiguredNoCtxCall.mjs
/**
* Returns `true` when a call would fall back to the global `AmplifyContext`
* but none has been set yet (i.e. `Amplify.configure()` has not run).
*
* The pre-context library did not throw for this case — it operated on the
* unconfigured singleton, whose `AuthClass` optional-chains its (missing)
* providers. `fetchAuthSession`/`clearCredentials` use this predicate to
* preserve that behavior for the no-context form.
*
* The `resolveCtxArgs` guard cases are deliberately excluded so their typed
* errors keep throwing:
* - a branded context anywhere in `args` (explicit-context or mis-ordered);
* - an explicitly-`undefined` leading context followed by more arguments.
*
* @internal
*/
function isUnconfiguredNoCtxCall(args) {
	return !hasGlobalContext() && !args.some(isAmplifyContext) && !(args.length > 1 && args[0] === void 0);
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/singleton/apis/fetchAuthSession.mjs
function fetchAuthSession(...args) {
	if (isUnconfiguredNoCtxCall(args)) return Promise.resolve({
		tokens: void 0,
		credentials: void 0,
		identityId: void 0,
		userSub: void 0
	});
	const [ctx, options] = resolveCtxArgs(args);
	return ctx.fetchAuthSession(options);
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/utils/store/autoSignInStore.mjs
function defaultState() {
	return { active: false };
}
var autoSignInReducer = (state, action) => {
	switch (action.type) {
		case "SET_USERNAME": return {
			...state,
			username: action.value
		};
		case "SET_SESSION": return {
			...state,
			session: action.value
		};
		case "START": return {
			...state,
			active: true
		};
		case "RESET": return defaultState();
		default: return state;
	}
};
var createAutoSignInStore = (reducer) => {
	let currentState = reducer(defaultState(), { type: "RESET" });
	return {
		getState: () => currentState,
		dispatch: (action) => {
			currentState = reducer(currentState, action);
		}
	};
};
var autoSignInStore = createAutoSignInStore(autoSignInReducer);
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/utils/passkey/types/shared.mjs
function assertValidCredentialCreationOptions(credentialCreationOptions) {
	assertPasskeyError([
		!!credentialCreationOptions,
		!!credentialCreationOptions?.challenge,
		!!credentialCreationOptions?.user,
		!!credentialCreationOptions?.rp,
		!!credentialCreationOptions?.pubKeyCredParams
	].every(Boolean), PasskeyErrorCode.InvalidPasskeyRegistrationOptions);
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/signInWithCustomAuth.mjs
/**
* Signs a user in using a custom authentication flow without password
*
* @param ctx - The AmplifyContext
* @param input -  The SignInWithCustomAuthInput object
* @returns AuthSignInResult
* @throws service: {@link InitiateAuthException } - Cognito service errors thrown during the sign-in process.
* @throws validation: {@link AuthValidationErrorCode  } - Validation errors thrown when either username or password
*  are not defined.
* @throws SignInWithCustomAuthOutput - Thrown when the token provider config is invalid.
*/
async function signInWithCustomAuth(ctx, input) {
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { username, password, options } = input;
	const signInDetails = {
		loginId: username,
		authFlowType: "CUSTOM_WITHOUT_SRP"
	};
	const metadata = options?.clientMetadata;
	assertValidationError(!!username, AuthValidationErrorCode.EmptySignInUsername);
	assertValidationError(!password, AuthValidationErrorCode.CustomAuthSignInPassword);
	const tokenOrchestrator = resolveTokenOrchestrator(ctx);
	try {
		const { ChallengeName: retriedChallengeName, ChallengeParameters: retiredChallengeParameters, AuthenticationResult, Session } = await retryOnResourceNotFoundException(handleCustomAuthFlowWithoutSRP, [
			username,
			metadata,
			authConfig,
			tokenOrchestrator
		], username, tokenOrchestrator);
		const activeUsername = getActiveSignInUsername(username);
		setActiveSignInState({
			signInSession: Session,
			username: activeUsername,
			challengeName: retriedChallengeName,
			signInDetails
		});
		if (AuthenticationResult) {
			await cacheCognitoTokens({
				username: activeUsername,
				...AuthenticationResult,
				NewDeviceMetadata: await getNewDeviceMetadata({
					userPoolId: authConfig.userPoolId,
					userPoolEndpoint: authConfig.userPoolEndpoint,
					newDeviceMetadata: AuthenticationResult.NewDeviceMetadata,
					accessToken: AuthenticationResult.AccessToken
				}),
				signInDetails
			}, tokenOrchestrator);
			resetActiveSignInState();
			await dispatchSignedInHubEvent(ctx);
			return {
				isSignedIn: true,
				nextStep: { signInStep: "DONE" }
			};
		}
		return getSignInResult(ctx, {
			challengeName: retriedChallengeName,
			challengeParameters: retiredChallengeParameters
		});
	} catch (error) {
		resetActiveSignInState();
		assertServiceError(error);
		const result = getSignInResultFromError(error.name);
		if (result) return result;
		throw error;
	}
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/signInWithCustomSRPAuth.mjs
/**
* Signs a user in using a custom authentication flow with SRP
*
* @param ctx - The AmplifyContext
* @param input -  The SignInWithCustomSRPAuthInput object
* @returns SignInWithCustomSRPAuthOutput
* @throws service: {@link InitiateAuthException }, {@link RespondToAuthChallengeException } - Cognito
* service errors thrown during the sign-in process.
* @throws validation: {@link AuthValidationErrorCode  } - Validation errors thrown when either username or password
*  are not defined.
* @throws AuthTokenConfigException - Thrown when the token provider config is invalid.
*/
async function signInWithCustomSRPAuth(ctx, input) {
	const { username, password, options } = input;
	const signInDetails = {
		loginId: username,
		authFlowType: "CUSTOM_WITH_SRP"
	};
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const metadata = options?.clientMetadata;
	assertValidationError(!!username, AuthValidationErrorCode.EmptySignInUsername);
	assertValidationError(!!password, AuthValidationErrorCode.EmptySignInPassword);
	const tokenOrchestrator = resolveTokenOrchestrator(ctx);
	try {
		const { ChallengeName: handledChallengeName, ChallengeParameters: handledChallengeParameters, AuthenticationResult, Session } = await handleCustomSRPAuthFlow(username, password, metadata, authConfig, tokenOrchestrator);
		const activeUsername = getActiveSignInUsername(username);
		setActiveSignInState({
			signInSession: Session,
			username: activeUsername,
			challengeName: handledChallengeName,
			signInDetails
		});
		if (AuthenticationResult) {
			await cacheCognitoTokens({
				username: activeUsername,
				...AuthenticationResult,
				NewDeviceMetadata: await getNewDeviceMetadata({
					userPoolId: authConfig.userPoolId,
					userPoolEndpoint: authConfig.userPoolEndpoint,
					newDeviceMetadata: AuthenticationResult.NewDeviceMetadata,
					accessToken: AuthenticationResult.AccessToken
				}),
				signInDetails
			}, tokenOrchestrator);
			resetActiveSignInState();
			await dispatchSignedInHubEvent(ctx);
			return {
				isSignedIn: true,
				nextStep: { signInStep: "DONE" }
			};
		}
		return getSignInResult(ctx, {
			challengeName: handledChallengeName,
			challengeParameters: handledChallengeParameters
		});
	} catch (error) {
		resetActiveSignInState();
		assertServiceError(error);
		const result = getSignInResultFromError(error.name);
		if (result) return result;
		throw error;
	}
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/autoSignIn.mjs
var initialAutoSignIn = async () => {
	throw new AuthError({
		name: AUTO_SIGN_IN_EXCEPTION,
		message: "The autoSignIn flow has not started, or has been cancelled/completed.",
		recoverySuggestion: "Please try to use the signIn API or log out before starting a new autoSignIn flow."
	});
};
/**
* Signs a user in automatically after finishing the sign-up process.
*
* This API will automatically sign a user in if the autoSignIn flow has been completed in the following cases:
* - User confirmed their account with a verification code sent to their phone or email (default option).
* - User confirmed their account with a verification link sent to their phone or email. In order to
* enable this option you need to go to the Amazon Cognito [console](https://aws.amazon.com/pm/cognito),
* look for your userpool, then go to the `Messaging` tab and enable `link` mode inside the `Verification message` option.
* Finally you need to define the `signUpVerificationMethod` in your `Auth` config.
*
* @example
* ```typescript
*  Amplify.configure({
*    Auth: {
*     Cognito: {
*    ...cognitoConfig,
*    signUpVerificationMethod: "link" // the default value is "code"
*   }
*	}});
* ```
*
* @throws AutoSignInException - Thrown when the autoSignIn flow has not started, or has been cancelled/completed.
* @returns The signInOutput.
*
* @example
* ```typescript
*  // handleSignUp.ts
* async function handleSignUp(
*   username:string,
*   password:string
* ){
*   try {
*     const { nextStep } = await signUp({
*       username,
*       password,
*       options: {
*         userAttributes:{ email:'email@email.com'},
*         autoSignIn: true // This enables the auto sign-in flow.
*       },
*     });
*
*     handleSignUpStep(nextStep);
*
*   } catch (error) {
*     console.log(error);
*   }
* }
*
* // handleConfirmSignUp.ts
* async function handleConfirmSignUp(username:string, confirmationCode:string) {
*   try {
*     const { nextStep } = await confirmSignUp({
*       username,
*       confirmationCode,
*     });
*
*     handleSignUpStep(nextStep);
*   } catch (error) {
*     console.log(error);
*   }
* }
*
* // signUpUtils.ts
* async function handleSignUpStep( step: SignUpOutput["nextStep"]) {
* switch (step.signUpStep) {
*   case "CONFIRM_SIGN_UP":
*
*    // Redirect end-user to confirm-sign up screen.
*
*   case "COMPLETE_AUTO_SIGN_IN":
*	   const codeDeliveryDetails = step.codeDeliveryDetails;
*     if (codeDeliveryDetails) {
*      // Redirect user to confirm-sign-up with link screen.
*     }
*     const signInOutput = await autoSignIn();
*   // handle sign-in steps
* }
*
* ```
*/
var autoSignIn = initialAutoSignIn;
/**
* Sets the context of autoSignIn at run time.
* @internal
*/
function setAutoSignIn(callback) {
	autoSignIn = callback;
}
/**
* Resets the context
*
* @internal
*/
function resetAutoSignIn(resetCallback = true) {
	if (resetCallback) autoSignIn = initialAutoSignIn;
	autoSignInStore.dispatch({ type: "RESET" });
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/signInWithSRP.mjs
/**
* Signs a user in
*
* @param ctx - The AmplifyContext
* @param input - The SignInWithSRPInput object
* @returns SignInWithSRPOutput
* @throws service: {@link InitiateAuthException }, {@link RespondToAuthChallengeException } - Cognito service errors
* thrown during the sign-in process.
* @throws validation: {@link AuthValidationErrorCode  } - Validation errors thrown when either username or password
*  are not defined.
* @throws AuthTokenConfigException - Thrown when the token provider config is invalid.
*/
async function signInWithSRP(ctx, input) {
	const { username, password } = input;
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	const signInDetails = {
		loginId: username,
		authFlowType: "USER_SRP_AUTH"
	};
	assertTokenProviderConfig(authConfig);
	const clientMetaData = input.options?.clientMetadata;
	assertValidationError(!!username, AuthValidationErrorCode.EmptySignInUsername);
	assertValidationError(!!password, AuthValidationErrorCode.EmptySignInPassword);
	const tokenOrchestrator = resolveTokenOrchestrator(ctx);
	try {
		const { ChallengeName: handledChallengeName, ChallengeParameters: handledChallengeParameters, AuthenticationResult, Session } = await handleUserSRPAuthFlow(username, password, clientMetaData, authConfig, tokenOrchestrator);
		const activeUsername = getActiveSignInUsername(username);
		setActiveSignInState({
			signInSession: Session,
			username: activeUsername,
			challengeName: handledChallengeName,
			signInDetails
		});
		if (AuthenticationResult) {
			await cacheCognitoTokens({
				username: activeUsername,
				...AuthenticationResult,
				NewDeviceMetadata: await getNewDeviceMetadata({
					userPoolId: authConfig.userPoolId,
					userPoolEndpoint: authConfig.userPoolEndpoint,
					newDeviceMetadata: AuthenticationResult.NewDeviceMetadata,
					accessToken: AuthenticationResult.AccessToken
				}),
				signInDetails
			}, tokenOrchestrator);
			resetActiveSignInState();
			await dispatchSignedInHubEvent(ctx);
			resetAutoSignIn();
			return {
				isSignedIn: true,
				nextStep: { signInStep: "DONE" }
			};
		}
		return getSignInResult(ctx, {
			challengeName: handledChallengeName,
			challengeParameters: handledChallengeParameters
		});
	} catch (error) {
		resetActiveSignInState();
		resetAutoSignIn();
		assertServiceError(error);
		const result = getSignInResultFromError(error.name);
		if (result) return result;
		throw error;
	}
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/signInWithUserPassword.mjs
/**
* Signs a user in using USER_PASSWORD_AUTH AuthFlowType
*
* @param ctx - The AmplifyContext
* @param input - The SignInWithUserPasswordInput object
* @returns SignInWithUserPasswordOutput
* @throws service: {@link InitiateAuthException } - Cognito service error thrown during the sign-in process.
* @throws validation: {@link AuthValidationErrorCode  } - Validation errors thrown when either username or password
*  are not defined.
* @throws AuthTokenConfigException - Thrown when the token provider config is invalid.
*/
async function signInWithUserPassword(ctx, input) {
	const { username, password, options } = input;
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	const signInDetails = {
		loginId: username,
		authFlowType: "USER_PASSWORD_AUTH"
	};
	assertTokenProviderConfig(authConfig);
	const metadata = options?.clientMetadata;
	assertValidationError(!!username, AuthValidationErrorCode.EmptySignInUsername);
	assertValidationError(!!password, AuthValidationErrorCode.EmptySignInPassword);
	const tokenOrchestrator = resolveTokenOrchestrator(ctx);
	try {
		const { ChallengeName: retiredChallengeName, ChallengeParameters: retriedChallengeParameters, AuthenticationResult, Session } = await retryOnResourceNotFoundException(handleUserPasswordAuthFlow, [
			username,
			password,
			metadata,
			authConfig,
			tokenOrchestrator
		], username, tokenOrchestrator);
		const activeUsername = getActiveSignInUsername(username);
		setActiveSignInState({
			signInSession: Session,
			username: activeUsername,
			challengeName: retiredChallengeName,
			signInDetails
		});
		if (AuthenticationResult) {
			await cacheCognitoTokens({
				...AuthenticationResult,
				username: activeUsername,
				NewDeviceMetadata: await getNewDeviceMetadata({
					userPoolId: authConfig.userPoolId,
					userPoolEndpoint: authConfig.userPoolEndpoint,
					newDeviceMetadata: AuthenticationResult.NewDeviceMetadata,
					accessToken: AuthenticationResult.AccessToken
				}),
				signInDetails
			}, tokenOrchestrator);
			resetActiveSignInState();
			await dispatchSignedInHubEvent(ctx);
			resetAutoSignIn();
			return {
				isSignedIn: true,
				nextStep: { signInStep: "DONE" }
			};
		}
		return getSignInResult(ctx, {
			challengeName: retiredChallengeName,
			challengeParameters: retriedChallengeParameters
		});
	} catch (error) {
		resetActiveSignInState();
		resetAutoSignIn();
		assertServiceError(error);
		const result = getSignInResultFromError(error.name);
		if (result) return result;
		throw error;
	}
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/flows/userAuth/handleUserAuthFlow.mjs
/**
* Handles user authentication flow with configurable challenge preferences.
* Supports AuthFactorType challenges through the USER_AUTH flow.
*
* @param {HandleUserAuthFlowInput} params - Authentication flow parameters
* @param {string} params.username - The username for authentication
* @param {Record<string, string>} [params.clientMetadata] - Optional metadata to pass to authentication service
* @param {CognitoUserPoolConfig} params.config - Cognito User Pool configuration
* @param {AuthTokenOrchestrator} params.tokenOrchestrator - Manages authentication tokens and device tracking
* @param {AuthFactorType} [params.preferredChallenge] - Optional preferred authentication method
* @param {string} [params.password] - Required when preferredChallenge is 'PASSWORD' or 'PASSWORD_SRP'
*
* @returns {Promise<InitiateAuthCommandOutput>} The authentication response from Cognito
*/
async function handleUserAuthFlow({ username, clientMetadata, config, tokenOrchestrator, preferredChallenge, password, session }) {
	const { userPoolId, userPoolClientId, userPoolEndpoint } = config;
	const UserContextData = getUserContextData({
		username,
		userPoolId,
		userPoolClientId
	});
	const authParameters = { USERNAME: username };
	if (preferredChallenge) {
		if (config.passwordless) {
			if (preferredChallenge === "EMAIL_OTP" && !config.passwordless.emailOtpEnabled || preferredChallenge === "SMS_OTP" && !config.passwordless.smsOtpEnabled || preferredChallenge === "WEB_AUTHN" && !config.passwordless.webAuthn) assertValidationError(false, AuthValidationErrorCode.InvalidPreferredChallenge);
		}
		if (preferredChallenge === "PASSWORD_SRP") {
			assertValidationError(!!password, AuthValidationErrorCode.EmptySignInPassword);
			return handlePasswordSRP({
				username,
				password,
				clientMetadata,
				config,
				tokenOrchestrator,
				authFlow: "USER_AUTH",
				preferredChallenge
			});
		}
		if (preferredChallenge === "PASSWORD") {
			assertValidationError(!!password, AuthValidationErrorCode.EmptySignInPassword);
			authParameters.PASSWORD = password;
		}
		authParameters.PREFERRED_CHALLENGE = preferredChallenge;
	}
	const jsonReq = {
		AuthFlow: "USER_AUTH",
		AuthParameters: authParameters,
		ClientMetadata: clientMetadata,
		ClientId: userPoolClientId,
		UserContextData
	};
	if (session) jsonReq.Session = session;
	const response = await createInitiateAuthClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.SignIn)
	}, jsonReq);
	setActiveSignInUsername(username);
	return response;
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/signInWithUserAuth.mjs
/**
* Signs a user in through a registered email or phone number without a password by by receiving and entering an OTP.
*
* @param ctx - The AmplifyContext
* @param input - The SignInWithUserAuthInput object
* @returns SignInWithUserAuthOutput
* @throws service: {@link InitiateAuthException }, {@link RespondToAuthChallengeException } - Cognito service errors
* thrown during the sign-in process.
* @throws validation: {@link AuthValidationErrorCode  } - Validation errors thrown when either username or password -- needs to change
*  are not defined.
* @throws AuthTokenConfigException - Thrown when the token provider config is invalid.
*/
async function signInWithUserAuth(ctx, input) {
	const { username, password, options } = input;
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	const signInDetails = {
		loginId: username,
		authFlowType: "USER_AUTH"
	};
	assertTokenProviderConfig(authConfig);
	const clientMetaData = options?.clientMetadata;
	const preferredChallenge = options?.preferredChallenge ?? authConfig?.passwordless?.preferredChallenge;
	assertValidationError(!!username, AuthValidationErrorCode.EmptySignInUsername);
	const tokenOrchestrator = resolveTokenOrchestrator(ctx);
	try {
		const handleUserAuthFlowInput = {
			username,
			config: authConfig,
			tokenOrchestrator,
			clientMetadata: clientMetaData,
			preferredChallenge,
			password
		};
		const autoSignInStoreState = autoSignInStore.getState();
		if (autoSignInStoreState.active && autoSignInStoreState.username === username) handleUserAuthFlowInput.session = autoSignInStoreState.session;
		const response = await handleUserAuthFlow(handleUserAuthFlowInput);
		const activeUsername = getActiveSignInUsername(username);
		setActiveSignInState({
			signInSession: response.Session,
			username: activeUsername,
			challengeName: response.ChallengeName,
			signInDetails
		});
		if (response.AuthenticationResult) {
			await cacheCognitoTokens({
				username: activeUsername,
				...response.AuthenticationResult,
				NewDeviceMetadata: await getNewDeviceMetadata({
					userPoolId: authConfig.userPoolId,
					userPoolEndpoint: authConfig.userPoolEndpoint,
					newDeviceMetadata: response.AuthenticationResult.NewDeviceMetadata,
					accessToken: response.AuthenticationResult.AccessToken
				}),
				signInDetails
			}, tokenOrchestrator);
			resetActiveSignInState();
			await dispatchSignedInHubEvent(ctx);
			resetAutoSignIn();
			return {
				isSignedIn: true,
				nextStep: { signInStep: "DONE" }
			};
		}
		return getSignInResult(ctx, {
			challengeName: response.ChallengeName,
			challengeParameters: response.ChallengeParameters,
			availableChallenges: "AvailableChallenges" in response ? response.AvailableChallenges : void 0
		});
	} catch (error) {
		resetActiveSignInState();
		resetAutoSignIn();
		assertServiceError(error);
		const result = getSignInResultFromError(error.name);
		if (result) return result;
		throw error;
	}
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/signIn.mjs
async function signIn(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	resetAutoSignIn(false);
	const authFlowType = input.options?.authFlowType;
	await assertUserNotAuthenticated(ctx);
	switch (authFlowType) {
		case "USER_SRP_AUTH": return signInWithSRP(ctx, input);
		case "USER_PASSWORD_AUTH": return signInWithUserPassword(ctx, input);
		case "CUSTOM_WITHOUT_SRP": return signInWithCustomAuth(ctx, input);
		case "CUSTOM_WITH_SRP": return signInWithCustomSRPAuth(ctx, input);
		case "USER_AUTH": return signInWithUserAuth(ctx, input);
		default: return signInWithSRP(ctx, input);
	}
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/signUpHelpers.mjs
var MAX_AUTOSIGNIN_POLLING_MS = 18e4;
function handleCodeAutoSignIn(signInInput) {
	const stopHubListener = HubInternal.listen("auth-internal", async ({ payload }) => {
		switch (payload.event) {
			case "confirmSignUp": if (payload.data?.isSignUpComplete) {
				HubInternal.dispatch("auth-internal", { event: "autoSignIn" });
				setAutoSignIn(autoSignInWithCode(signInInput));
				stopHubListener();
			}
		}
	});
	const timeOutId = setTimeout(() => {
		stopHubListener();
		clearTimeout(timeOutId);
		resetAutoSignIn();
	}, MAX_AUTOSIGNIN_POLLING_MS);
}
function debounce(fun, delay) {
	let timer;
	return (args) => {
		if (!timer) fun(...args);
		clearTimeout(timer);
		timer = setTimeout(() => {
			timer = void 0;
		}, delay);
	};
}
function handleAutoSignInWithLink(signInInput, resolve, reject) {
	const start = Date.now();
	const autoSignInPollingIntervalId = setInterval(async () => {
		if (Date.now() - start > MAX_AUTOSIGNIN_POLLING_MS) {
			clearInterval(autoSignInPollingIntervalId);
			reject(new AuthError({
				name: AUTO_SIGN_IN_EXCEPTION,
				message: "The account was not confirmed on time.",
				recoverySuggestion: "Try to verify your account by clicking the link sent your email or phone and then login manually."
			}));
			resetAutoSignIn();
		} else try {
			const signInOutput = await signIn(signInInput);
			if (signInOutput.nextStep.signInStep !== "CONFIRM_SIGN_UP") {
				resolve(signInOutput);
				clearInterval(autoSignInPollingIntervalId);
				resetAutoSignIn();
			}
		} catch (error) {
			clearInterval(autoSignInPollingIntervalId);
			reject(error);
			resetAutoSignIn();
		}
	}, 5e3);
}
var debouncedAutoSignInWithLink = debounce(handleAutoSignInWithLink, 300);
var debouncedAutoSignWithCodeOrUserConfirmed = debounce(handleAutoSignInWithCodeOrUserConfirmed, 300);
function autoSignInWhenUserIsConfirmedWithLink(signInInput) {
	return async () => {
		return new Promise((resolve, reject) => {
			debouncedAutoSignInWithLink([
				signInInput,
				resolve,
				reject
			]);
		});
	};
}
async function handleAutoSignInWithCodeOrUserConfirmed(signInInput, resolve, reject) {
	try {
		resolve(signInInput?.options?.authFlowType === "USER_AUTH" ? await signInWithUserAuth(getGlobalContext(), signInInput) : await signIn(getGlobalContext(), signInInput));
		resetAutoSignIn();
	} catch (error) {
		reject(error);
		resetAutoSignIn();
	}
}
function autoSignInWithCode(signInInput) {
	return async () => {
		return new Promise((resolve, reject) => {
			debouncedAutoSignWithCodeOrUserConfirmed([
				signInInput,
				resolve,
				reject
			]);
		});
	};
}
var autoSignInUserConfirmed = autoSignInWithCode;
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createSignUpClient.mjs
var createSignUpClientDeserializer = () => async (response) => {
	if (response.statusCode >= 300) {
		const error = await parseJsonError(response);
		assertServiceError(error);
		if (error.name === SignUpException.InvalidParameterException && /'password'/.test(error.message) && /Member must not be null/.test(error.message)) {
			const name = AuthValidationErrorCode.EmptySignUpPassword;
			const { message, recoverySuggestion } = validationErrorMap[name];
			throw new AuthError({
				name,
				message,
				recoverySuggestion
			});
		}
		throw new AuthError({
			name: error.name,
			message: error.message
		});
	}
	return parseJsonBody(response);
};
var createSignUpClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("SignUp"), createSignUpClientDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/signUp.mjs
async function signUp(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const { username, password, options } = input;
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	const signUpVerificationMethod = authConfig?.signUpVerificationMethod ?? "code";
	const { clientMetadata, validationData, autoSignIn } = input.options ?? {};
	assertTokenProviderConfig(authConfig);
	assertValidationError(!!username, AuthValidationErrorCode.EmptySignUpUsername);
	const signInServiceOptions = typeof autoSignIn !== "boolean" ? autoSignIn : void 0;
	const signInInput = {
		username,
		options: signInServiceOptions
	};
	if (signInServiceOptions?.authFlowType !== "CUSTOM_WITHOUT_SRP") signInInput.password = password;
	const { userPoolId, userPoolClientId, userPoolEndpoint } = authConfig;
	const signUpClient = createSignUpClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) });
	const signUpClientInput = {
		Username: username,
		Password: void 0,
		UserAttributes: options?.userAttributes && toAttributeType(options?.userAttributes),
		ClientMetadata: clientMetadata,
		ValidationData: validationData && toAttributeType(validationData),
		ClientId: userPoolClientId,
		UserContextData: getUserContextData({
			username,
			userPoolId,
			userPoolClientId
		})
	};
	if (password) signUpClientInput.Password = password;
	const { UserSub: userId, CodeDeliveryDetails: cdd, UserConfirmed: userConfirmed, Session: session } = await signUpClient({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.SignUp)
	}, signUpClientInput);
	if (signInServiceOptions || autoSignIn === true) {
		autoSignInStore.dispatch({ type: "START" });
		autoSignInStore.dispatch({
			type: "SET_USERNAME",
			value: username
		});
		autoSignInStore.dispatch({
			type: "SET_SESSION",
			value: session
		});
	}
	const codeDeliveryDetails = {
		destination: cdd?.Destination,
		deliveryMedium: cdd?.DeliveryMedium,
		attributeName: cdd?.AttributeName
	};
	const isSignUpComplete = !!userConfirmed;
	const isAutoSignInStarted = autoSignInStore.getState().active;
	if (isSignUpComplete) {
		if (isAutoSignInStarted) {
			setAutoSignIn(autoSignInUserConfirmed(signInInput));
			return {
				isSignUpComplete: true,
				nextStep: { signUpStep: "COMPLETE_AUTO_SIGN_IN" },
				userId
			};
		}
		return {
			isSignUpComplete: true,
			nextStep: { signUpStep: "DONE" },
			userId
		};
	}
	if (isAutoSignInStarted) {
		if (signUpVerificationMethod === "link") {
			setAutoSignIn(autoSignInWhenUserIsConfirmedWithLink(signInInput));
			return {
				isSignUpComplete: false,
				nextStep: {
					signUpStep: "COMPLETE_AUTO_SIGN_IN",
					codeDeliveryDetails
				},
				userId
			};
		}
		handleCodeAutoSignIn(signInInput);
	}
	return {
		isSignUpComplete: false,
		nextStep: {
			signUpStep: "CONFIRM_SIGN_UP",
			codeDeliveryDetails
		},
		userId
	};
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createForgotPasswordClient.mjs
var createForgotPasswordClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("ForgotPassword"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/resetPassword.mjs
async function resetPassword(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const { username } = input;
	assertValidationError(!!username, AuthValidationErrorCode.EmptyResetPasswordUsername);
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolClientId, userPoolId, userPoolEndpoint } = authConfig;
	const clientMetadata = input.options?.clientMetadata;
	const UserContextData = getUserContextData({
		username,
		userPoolId,
		userPoolClientId
	});
	const codeDeliveryDetails = (await createForgotPasswordClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ResetPassword)
	}, {
		Username: username,
		ClientMetadata: clientMetadata,
		ClientId: userPoolClientId,
		UserContextData
	})).CodeDeliveryDetails;
	return {
		isPasswordReset: false,
		nextStep: {
			resetPasswordStep: "CONFIRM_RESET_PASSWORD_WITH_CODE",
			codeDeliveryDetails: {
				deliveryMedium: codeDeliveryDetails?.DeliveryMedium,
				destination: codeDeliveryDetails?.Destination,
				attributeName: codeDeliveryDetails?.AttributeName
			}
		}
	};
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createConfirmForgotPasswordClient.mjs
var createConfirmForgotPasswordClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("ConfirmForgotPassword"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/confirmResetPassword.mjs
async function confirmResetPassword(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolClientId, userPoolId, userPoolEndpoint } = authConfig;
	const { username, newPassword } = input;
	assertValidationError(!!username, AuthValidationErrorCode.EmptyConfirmResetPasswordUsername);
	assertValidationError(!!newPassword, AuthValidationErrorCode.EmptyConfirmResetPasswordNewPassword);
	const code = input.confirmationCode;
	assertValidationError(!!code, AuthValidationErrorCode.EmptyConfirmResetPasswordConfirmationCode);
	const metadata = input.options?.clientMetadata;
	const UserContextData = getUserContextData({
		username,
		userPoolId,
		userPoolClientId
	});
	await createConfirmForgotPasswordClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(authConfig.userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmResetPassword)
	}, {
		Username: username,
		ConfirmationCode: code,
		Password: newPassword,
		ClientMetadata: metadata,
		ClientId: authConfig.userPoolClientId,
		UserContextData
	});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createResendConfirmationCodeClient.mjs
var createResendConfirmationCodeClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("ResendConfirmationCode"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/resendSignUpCode.mjs
async function resendSignUpCode(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const { username } = input;
	assertValidationError(!!username, AuthValidationErrorCode.EmptySignUpUsername);
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolClientId, userPoolId, userPoolEndpoint } = authConfig;
	const clientMetadata = input.options?.clientMetadata;
	const UserContextData = getUserContextData({
		username,
		userPoolId,
		userPoolClientId
	});
	const { CodeDeliveryDetails } = await createResendConfirmationCodeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(authConfig.userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ResendSignUpCode)
	}, {
		Username: username,
		ClientMetadata: clientMetadata,
		ClientId: authConfig.userPoolClientId,
		UserContextData
	});
	const { DeliveryMedium, AttributeName, Destination } = { ...CodeDeliveryDetails };
	return {
		destination: Destination,
		deliveryMedium: DeliveryMedium,
		attributeName: AttributeName ? AttributeName : void 0
	};
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createConfirmSignUpClient.mjs
var createConfirmSignUpClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("ConfirmSignUp"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/confirmSignUp.mjs
async function confirmSignUp(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const { username, confirmationCode, options } = input;
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolId, userPoolClientId, userPoolEndpoint } = authConfig;
	const clientMetadata = options?.clientMetadata;
	assertValidationError(!!username, AuthValidationErrorCode.EmptyConfirmSignUpUsername);
	assertValidationError(!!confirmationCode, AuthValidationErrorCode.EmptyConfirmSignUpCode);
	const UserContextData = getUserContextData({
		username,
		userPoolId,
		userPoolClientId
	});
	const { Session: session } = await createConfirmSignUpClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(authConfig.userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmSignUp)
	}, {
		Username: username,
		ConfirmationCode: confirmationCode,
		ClientMetadata: clientMetadata,
		ForceAliasCreation: options?.forceAliasCreation,
		ClientId: authConfig.userPoolClientId,
		UserContextData
	});
	return new Promise((resolve, reject) => {
		try {
			const signUpOut = {
				isSignUpComplete: true,
				nextStep: { signUpStep: "DONE" }
			};
			const autoSignInStoreState = autoSignInStore.getState();
			if (!autoSignInStoreState.active || autoSignInStoreState.username !== username) {
				resolve(signUpOut);
				resetAutoSignIn();
				return;
			}
			autoSignInStore.dispatch({
				type: "SET_SESSION",
				value: session
			});
			const stopListener = HubInternal.listen("auth-internal", ({ payload }) => {
				switch (payload.event) {
					case "autoSignIn":
						resolve({
							isSignUpComplete: true,
							nextStep: { signUpStep: "COMPLETE_AUTO_SIGN_IN" }
						});
						stopListener();
				}
			});
			HubInternal.dispatch("auth-internal", {
				event: "confirmSignUp",
				data: signUpOut
			});
		} catch (error) {
			reject(error);
		}
	});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/confirmSignIn.mjs
async function confirmSignIn(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const { challengeResponse, options } = input;
	const { username, challengeName, signInSession, signInDetails } = signInStore.getState();
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const clientMetaData = options?.clientMetadata;
	assertValidationError(!!challengeResponse, AuthValidationErrorCode.EmptyChallengeResponse);
	const tokenOrchestrator = resolveTokenOrchestrator(ctx);
	if (!username || !challengeName || !signInSession) throw new AuthError({
		name: AuthErrorCodes.SignInException,
		message: `
			An error occurred during the sign in process.

			This most likely occurred due to:
			1. signIn was not called before confirmSignIn.
			2. signIn threw an exception.
			3. page was refreshed during the sign in flow and session has expired.
			`,
		recoverySuggestion: "Make sure a successful call to signIn is made before calling confirmSignInand that the session has not expired."
	});
	try {
		const { Session, ChallengeName: handledChallengeName, AuthenticationResult, ChallengeParameters: handledChallengeParameters } = await handleChallengeName(username, challengeName, signInSession, challengeResponse, authConfig, tokenOrchestrator, clientMetaData, options);
		setActiveSignInState({
			signInSession: Session,
			username,
			challengeName: handledChallengeName,
			signInDetails
		});
		if (AuthenticationResult) {
			await cacheCognitoTokens({
				username,
				...AuthenticationResult,
				NewDeviceMetadata: await getNewDeviceMetadata({
					userPoolId: authConfig.userPoolId,
					userPoolEndpoint: authConfig.userPoolEndpoint,
					newDeviceMetadata: AuthenticationResult.NewDeviceMetadata,
					accessToken: AuthenticationResult.AccessToken
				}),
				signInDetails
			}, tokenOrchestrator);
			resetActiveSignInState();
			await dispatchSignedInHubEvent(ctx);
			return {
				isSignedIn: true,
				nextStep: { signInStep: "DONE" }
			};
		}
		return getSignInResult(ctx, {
			challengeName: handledChallengeName,
			challengeParameters: handledChallengeParameters
		});
	} catch (error) {
		assertServiceError(error);
		const result = getSignInResultFromError(error.name);
		if (result) return result;
		throw error;
	}
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createSetUserMFAPreferenceClient.mjs
var createSetUserMFAPreferenceClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("SetUserMFAPreference"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/updateMFAPreference.mjs
async function updateMFAPreference(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const { sms, totp, email } = input;
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await ctx.fetchAuthSession({ forceRefresh: false });
	assertAuthTokens(tokens);
	await createSetUserMFAPreferenceClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.UpdateMFAPreference)
	}, {
		AccessToken: tokens.accessToken.toString(),
		SMSMfaSettings: getMFASettings(sms),
		SoftwareTokenMfaSettings: getMFASettings(totp),
		EmailMfaSettings: getMFASettings(email)
	});
}
function getMFASettings(mfaPreference) {
	if (mfaPreference === "DISABLED") return { Enabled: false };
	else if (mfaPreference === "PREFERRED") return {
		Enabled: true,
		PreferredMfa: true
	};
	else if (mfaPreference === "ENABLED") return { Enabled: true };
	else if (mfaPreference === "NOT_PREFERRED") return {
		Enabled: true,
		PreferredMfa: false
	};
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createGetUserClient.mjs
var createGetUserClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("GetUser"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/fetchMFAPreference.mjs
async function fetchMFAPreference(...args) {
	const [ctx] = resolveCtxArgs(args);
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await ctx.fetchAuthSession({ forceRefresh: false });
	assertAuthTokens(tokens);
	const { PreferredMfaSetting, UserMFASettingList } = await createGetUserClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.FetchMFAPreference)
	}, { AccessToken: tokens.accessToken.toString() });
	return {
		preferred: getMFAType(PreferredMfaSetting),
		enabled: getMFATypes(UserMFASettingList)
	};
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/verifyTOTPSetup.mjs
async function verifyTOTPSetup(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { code, options } = input;
	assertValidationError(!!code, AuthValidationErrorCode.EmptyVerifyTOTPSetupCode);
	const { tokens } = await ctx.fetchAuthSession({ forceRefresh: false });
	assertAuthTokens(tokens);
	await createVerifySoftwareTokenClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.VerifyTOTPSetup)
	}, {
		AccessToken: tokens.accessToken.toString(),
		UserCode: code,
		FriendlyDeviceName: options?.friendlyDeviceName
	});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createChangePasswordClient.mjs
var createChangePasswordClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("ChangePassword"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/updatePassword.mjs
async function updatePassword(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { oldPassword, newPassword } = input;
	assertValidationError(!!oldPassword, AuthValidationErrorCode.EmptyUpdatePassword);
	assertValidationError(!!newPassword, AuthValidationErrorCode.EmptyUpdatePassword);
	const { tokens } = await ctx.fetchAuthSession({ forceRefresh: false });
	assertAuthTokens(tokens);
	await createChangePasswordClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.UpdatePassword)
	}, {
		AccessToken: tokens.accessToken.toString(),
		PreviousPassword: oldPassword,
		ProposedPassword: newPassword
	});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/setUpTOTP.mjs
async function setUpTOTP(...args) {
	const [ctx] = resolveCtxArgs(args);
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await ctx.fetchAuthSession({ forceRefresh: false });
	assertAuthTokens(tokens);
	const username = tokens.idToken?.payload["cognito:username"] ?? "";
	const { SecretCode } = await createAssociateSoftwareTokenClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.SetUpTOTP)
	}, { AccessToken: tokens.accessToken.toString() });
	if (!SecretCode) throw new AuthError({
		name: SETUP_TOTP_EXCEPTION,
		message: "Failed to set up TOTP."
	});
	return getTOTPSetupDetails(SecretCode, JSON.stringify(username));
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createUpdateUserAttributesClient.mjs
var createUpdateUserAttributesClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("UpdateUserAttributes"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/updateUserAttributes.mjs
async function updateUserAttributes(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const { userAttributes, options } = input;
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	const clientMetadata = options?.clientMetadata;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await ctx.fetchAuthSession({ forceRefresh: false });
	assertAuthTokens(tokens);
	const { CodeDeliveryDetailsList } = await createUpdateUserAttributesClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.UpdateUserAttributes)
	}, {
		AccessToken: tokens.accessToken.toString(),
		ClientMetadata: clientMetadata,
		UserAttributes: toAttributeType(userAttributes)
	});
	return {
		...getConfirmedAttributes(userAttributes),
		...getUnConfirmedAttributes(CodeDeliveryDetailsList)
	};
}
function getConfirmedAttributes(attributes) {
	const confirmedAttributes = {};
	Object.keys(attributes)?.forEach((key) => {
		confirmedAttributes[key] = {
			isUpdated: true,
			nextStep: { updateAttributeStep: "DONE" }
		};
	});
	return confirmedAttributes;
}
function getUnConfirmedAttributes(codeDeliveryDetailsList) {
	const unConfirmedAttributes = {};
	codeDeliveryDetailsList?.forEach((codeDeliveryDetails) => {
		const { AttributeName, DeliveryMedium, Destination } = codeDeliveryDetails;
		if (AttributeName) unConfirmedAttributes[AttributeName] = {
			isUpdated: false,
			nextStep: {
				updateAttributeStep: "CONFIRM_ATTRIBUTE_WITH_CODE",
				codeDeliveryDetails: {
					attributeName: AttributeName,
					deliveryMedium: DeliveryMedium,
					destination: Destination
				}
			}
		};
	});
	return unConfirmedAttributes;
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/updateUserAttribute.mjs
/**
* Updates user's attribute while authenticated.
*
* @param input - The UpdateUserAttributeInput object
* @returns UpdateUserAttributeOutput
* @throws - {@link UpdateUserAttributesException}
* @throws AuthTokenConfigException - Thrown when the token provider config is invalid.
*/
var updateUserAttribute = async (input) => {
	const { userAttribute: { attributeKey, value }, options } = input;
	const output = await updateUserAttributes({
		userAttributes: { [attributeKey]: value },
		options
	});
	return Object.values(output)[0];
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createVerifyUserAttributeClient.mjs
var createVerifyUserAttributeClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("VerifyUserAttribute"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/confirmUserAttribute.mjs
async function confirmUserAttribute(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { confirmationCode, userAttributeKey } = input;
	assertValidationError(!!confirmationCode, AuthValidationErrorCode.EmptyConfirmUserAttributeCode);
	const { tokens } = await ctx.fetchAuthSession({ forceRefresh: false });
	assertAuthTokens(tokens);
	await createVerifyUserAttributeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmUserAttribute)
	}, {
		AccessToken: tokens.accessToken.toString(),
		AttributeName: userAttributeKey,
		Code: confirmationCode
	});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/internal/fetchUserAttributes.mjs
var fetchUserAttributes$1 = async (amplify) => {
	const authConfig = amplify.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await amplify.fetchAuthSession({ forceRefresh: false });
	assertAuthTokens(tokens);
	const { UserAttributes } = await createGetUserClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.FetchUserAttributes)
	}, { AccessToken: tokens.accessToken.toString() });
	return toAuthUserAttribute(UserAttributes);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/fetchUserAttributes.mjs
async function fetchUserAttributes(...args) {
	const [ctx] = resolveCtxArgs(args);
	return fetchUserAttributes$1(ctx);
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/completeOAuthSignOut.mjs
var completeOAuthSignOut = async (store, tokenOrchestrator, clearCredentials) => {
	await store.clearOAuthData();
	tokenOrchestrator.clearTokens();
	await clearCredentials();
	Hub.dispatch("auth", { event: "signedOut" }, "Auth", AMPLIFY_SYMBOL);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/oAuthSignOutRedirect.mjs
var oAuthSignOutRedirect = async (authConfig, preferPrivateSession = false, redirectUrl) => {
	assertOAuthConfig(authConfig);
	const { loginWith, userPoolClientId } = authConfig;
	const { domain, redirectSignOut } = loginWith.oauth;
	const signoutUri = getRedirectUrl(redirectSignOut, redirectUrl);
	const oAuthLogoutEndpoint = `https://${domain}/logout?${Object.entries({
		client_id: userPoolClientId,
		logout_uri: encodeURIComponent(signoutUri)
	}).map(([k, v]) => `${k}=${v}`).join("&")}`;
	return openAuthSession(oAuthLogoutEndpoint);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/handleOAuthSignOut.mjs
var handleOAuthSignOut = async (cognitoConfig, store, tokenOrchestrator, redirectUrl, clearCredentials) => {
	const { isOAuthSignIn } = await store.loadOAuthSignIn();
	const oauthMetadata = await tokenOrchestrator.getOAuthMetadata();
	await completeOAuthSignOut(store, tokenOrchestrator, clearCredentials);
	if (isOAuthSignIn || oauthMetadata?.oauthSignIn) return oAuthSignOutRedirect(cognitoConfig, false, redirectUrl);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createRevokeTokenClient.mjs
var createRevokeTokenClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("RevokeToken"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createGlobalSignOutClient.mjs
var createGlobalSignOutClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("GlobalSignOut"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/signOut.mjs
var logger = new ConsoleLogger("Auth");
async function signOut(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const cognitoConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(cognitoConfig);
	const tokenOrchestrator = resolveTokenOrchestrator(ctx);
	if (input?.global) await globalSignOut(cognitoConfig, tokenOrchestrator);
	else await clientSignOut(cognitoConfig, tokenOrchestrator);
	let hasOAuthConfig;
	try {
		assertOAuthConfig(cognitoConfig);
		hasOAuthConfig = true;
	} catch (err) {
		hasOAuthConfig = false;
	}
	if (hasOAuthConfig) {
		const oAuthStore = new DefaultOAuthStore(defaultStorage);
		oAuthStore.setAuthConfig(cognitoConfig);
		const { type } = await handleOAuthSignOut(cognitoConfig, oAuthStore, tokenOrchestrator, input?.oauth?.redirectUrl, () => ctx.clearCredentials()) ?? {};
		if (type === "error") throw new AuthError({
			name: OAUTH_SIGNOUT_EXCEPTION,
			message: `An error occurred when attempting to log out from OAuth provider.`
		});
	} else {
		tokenOrchestrator.clearTokens();
		await ctx.clearCredentials();
		Hub.dispatch("auth", { event: "signedOut" }, "Auth", AMPLIFY_SYMBOL);
	}
}
async function clientSignOut(cognitoConfig, tokenOrchestrator) {
	try {
		const { userPoolEndpoint, userPoolId, userPoolClientId } = cognitoConfig;
		const authTokens = await tokenOrchestrator.getTokenStore().loadTokens();
		assertAuthTokensWithRefreshToken(authTokens);
		if (isSessionRevocable(authTokens.accessToken)) await createRevokeTokenClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
			region: getRegionFromUserPoolId(userPoolId),
			userAgentValue: getAuthUserAgentValue(AuthAction.SignOut)
		}, {
			ClientId: userPoolClientId,
			Token: authTokens.refreshToken
		});
	} catch (err) {
		logger.debug("Client signOut error caught but will proceed with token removal");
	}
}
async function globalSignOut(cognitoConfig, tokenOrchestrator) {
	try {
		const { userPoolEndpoint, userPoolId } = cognitoConfig;
		const authTokens = await tokenOrchestrator.getTokenStore().loadTokens();
		assertAuthTokens(authTokens);
		await createGlobalSignOutClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
			region: getRegionFromUserPoolId(userPoolId),
			userAgentValue: getAuthUserAgentValue(AuthAction.SignOut)
		}, { AccessToken: authTokens.accessToken.toString() });
	} catch (err) {
		logger.debug("Global signOut error caught but will proceed with token removal");
	}
}
var isSessionRevocable = (token) => !!token?.payload?.origin_jti;
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createGetUserAttributeVerificationCodeClient.mjs
var createGetUserAttributeVerificationCodeClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("GetUserAttributeVerificationCode"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/sendUserAttributeVerificationCode.mjs
async function sendUserAttributeVerificationCode(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const { userAttributeKey, options } = input;
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	const clientMetadata = options?.clientMetadata;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await ctx.fetchAuthSession({ forceRefresh: false });
	assertAuthTokens(tokens);
	const { CodeDeliveryDetails } = await createGetUserAttributeVerificationCodeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.SendUserAttributeVerificationCode)
	}, {
		AccessToken: tokens.accessToken.toString(),
		ClientMetadata: clientMetadata,
		AttributeName: userAttributeKey
	});
	const { DeliveryMedium, AttributeName, Destination } = { ...CodeDeliveryDetails };
	return {
		destination: Destination,
		deliveryMedium: DeliveryMedium,
		attributeName: AttributeName
	};
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createDeleteUserAttributesClient.mjs
var createDeleteUserAttributesClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("DeleteUserAttributes"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/deleteUserAttributes.mjs
async function deleteUserAttributes(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userAttributeKeys } = input;
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await ctx.fetchAuthSession({ forceRefresh: false });
	assertAuthTokens(tokens);
	await createDeleteUserAttributesClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.DeleteUserAttributes)
	}, {
		AccessToken: tokens.accessToken.toString(),
		UserAttributeNames: userAttributeKeys
	});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/shared/serde/createEmptyResponseDeserializer.mjs
var createEmptyResponseDeserializer = () => async (response) => {
	if (response.statusCode >= 300) {
		const error = await parseJsonError(response);
		assertServiceError(error);
		throw new AuthError({
			name: error.name,
			message: error.message
		});
	} else return;
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createDeleteUserClient.mjs
var createDeleteUserClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("DeleteUser"), createEmptyResponseDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/deleteUser.mjs
async function deleteUser(...args) {
	const [ctx] = resolveCtxArgs(args);
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await ctx.fetchAuthSession();
	assertAuthTokens(tokens);
	await createDeleteUserClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.DeleteUser)
	}, { AccessToken: tokens.accessToken.toString() });
	await resolveTokenOrchestrator(ctx).clearDeviceMetadata();
	await signOut(ctx);
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createUpdateDeviceStatusClient.mjs
var createUpdateDeviceStatusClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("UpdateDeviceStatus"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/rememberDevice.mjs
async function rememberDevice(...args) {
	const [ctx] = resolveCtxArgs(args);
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await ctx.fetchAuthSession();
	assertAuthTokens(tokens);
	const deviceMetadata = await resolveTokenOrchestrator(ctx).getDeviceMetadata();
	assertDeviceMetadata(deviceMetadata);
	await createUpdateDeviceStatusClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.RememberDevice)
	}, {
		AccessToken: tokens.accessToken.toString(),
		DeviceKey: deviceMetadata.deviceKey,
		DeviceRememberedStatus: "remembered"
	});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createForgetDeviceClient.mjs
var createForgetDeviceClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("ForgetDevice"), createEmptyResponseDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/forgetDevice.mjs
async function forgetDevice(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const { device: { id: externalDeviceKey } = { id: void 0 } } = input ?? {};
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await ctx.fetchAuthSession();
	assertAuthTokens(tokens);
	const tokenOrchestrator = resolveTokenOrchestrator(ctx);
	const deviceMetadata = await tokenOrchestrator.getDeviceMetadata();
	const currentDeviceKey = deviceMetadata?.deviceKey;
	if (!externalDeviceKey) assertDeviceMetadata(deviceMetadata);
	await createForgetDeviceClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ForgetDevice)
	}, {
		AccessToken: tokens.accessToken.toString(),
		DeviceKey: externalDeviceKey ?? currentDeviceKey
	});
	if (!externalDeviceKey || externalDeviceKey === currentDeviceKey) await tokenOrchestrator.clearDeviceMetadata();
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createListDevicesClient.mjs
var createListDevicesClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("ListDevices"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/fetchDevices.mjs
var MAX_DEVICES = 60;
async function fetchDevices(...args) {
	const [ctx] = resolveCtxArgs(args);
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await ctx.fetchAuthSession();
	assertAuthTokens(tokens);
	return parseDevicesResponse((await createListDevicesClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.FetchDevices)
	}, {
		AccessToken: tokens.accessToken.toString(),
		Limit: MAX_DEVICES
	})).Devices ?? []);
}
var parseDevicesResponse = async (devices) => {
	return devices.map(({ DeviceKey: id = "", DeviceAttributes = [], DeviceCreateDate, DeviceLastModifiedDate, DeviceLastAuthenticatedDate }) => {
		let deviceName;
		const attributes = DeviceAttributes.reduce((attrs, { Name, Value }) => {
			if (Name && Value) {
				if (Name === "device_name") deviceName = Value;
				attrs[Name] = Value;
			}
			return attrs;
		}, {});
		return {
			id,
			name: deviceName,
			attributes,
			createDate: DeviceCreateDate ? /* @__PURE__ */ new Date(DeviceCreateDate * 1e3) : void 0,
			lastModifiedDate: DeviceLastModifiedDate ? /* @__PURE__ */ new Date(DeviceLastModifiedDate * 1e3) : void 0,
			lastAuthenticatedDate: DeviceLastAuthenticatedDate ? /* @__PURE__ */ new Date(DeviceLastAuthenticatedDate * 1e3) : void 0
		};
	});
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/utils/passkey/errors/handlePasskeyRegistrationError.mjs
/**
* Handle Passkey Registration Errors
* https://w3c.github.io/webauthn/#sctn-create-request-exceptions
*
* @param err unknown
* @returns PasskeyError
*/
var handlePasskeyRegistrationError = (err) => {
	if (err instanceof PasskeyError) return err;
	if (err instanceof Error) {
		if (err.name === "InvalidStateError") {
			const { message, recoverySuggestion } = passkeyErrorMap[PasskeyErrorCode.PasskeyAlreadyExists];
			return new PasskeyError({
				name: PasskeyErrorCode.PasskeyAlreadyExists,
				message,
				recoverySuggestion,
				underlyingError: err
			});
		}
		if (err.name === "NotAllowedError") {
			const { message, recoverySuggestion } = passkeyErrorMap[PasskeyErrorCode.PasskeyRegistrationCanceled];
			return new PasskeyError({
				name: PasskeyErrorCode.PasskeyRegistrationCanceled,
				message,
				recoverySuggestion,
				underlyingError: err
			});
		}
	}
	return handlePasskeyError(err);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/utils/passkey/registerPasskey.mjs
/**
* Registers a new passkey for user
* @param input - PasskeyCreateOptionsJson
* @returns serialized PasskeyCreateResult
*/
var registerPasskey = async (input) => {
	try {
		const isPasskeySupported = getIsPasskeySupported();
		assertPasskeyError(isPasskeySupported, PasskeyErrorCode.PasskeyNotSupported);
		const passkeyCreationOptions = deserializeJsonToPkcCreationOptions(input);
		const credential = await navigator.credentials.create({ publicKey: passkeyCreationOptions });
		assertCredentialIsPkcWithAuthenticatorAttestationResponse(credential);
		return serializePkcWithAttestationToJson(credential);
	} catch (err) {
		throw handlePasskeyRegistrationError(err);
	}
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createStartWebAuthnRegistrationClient.mjs
var createStartWebAuthnRegistrationClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("StartWebAuthnRegistration"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createCompleteWebAuthnRegistrationClient.mjs
var createCompleteWebAuthnRegistrationClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("CompleteWebAuthnRegistration"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/apis/associateWebAuthnCredential.mjs
/**
* Registers a new passkey for an authenticated user
*
* @returns Promise<void>
* @throws - {@link PasskeyError}:
* - Thrown when intermediate state is invalid
* @throws - {@link AuthError}:
* - Thrown when user is unauthenticated
* @throws - {@link StartWebAuthnRegistrationException}
* - Thrown due to a service error retrieving WebAuthn registration options
* @throws - {@link CompleteWebAuthnRegistrationException}
* - Thrown due to a service error when verifying WebAuthn registration result
*/
async function associateWebAuthnCredential() {
	const ctx = getGlobalContext();
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await ctx.fetchAuthSession();
	assertAuthTokens(tokens);
	const { CredentialCreationOptions: credentialCreationOptions } = await createStartWebAuthnRegistrationClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.StartWebAuthnRegistration)
	}, { AccessToken: tokens.accessToken.toString() });
	assertValidCredentialCreationOptions(credentialCreationOptions);
	const cred = await registerPasskey(credentialCreationOptions);
	await createCompleteWebAuthnRegistrationClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.CompleteWebAuthnRegistration)
	}, {
		AccessToken: tokens.accessToken.toString(),
		Credential: cred
	});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createListWebAuthnCredentialsClient.mjs
var createListWebAuthnCredentialsClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("ListWebAuthnCredentials"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/apis/listWebAuthnCredentials.mjs
async function listWebAuthnCredentials$1(amplify, input) {
	const authConfig = amplify.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await amplify.fetchAuthSession();
	assertAuthTokens(tokens);
	const { Credentials: commandCredentials = [], NextToken: nextToken } = await createListWebAuthnCredentialsClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ListWebAuthnCredentials)
	}, {
		AccessToken: tokens.accessToken.toString(),
		MaxResults: input?.pageSize,
		NextToken: input?.nextToken
	});
	return {
		credentials: commandCredentials.map((item) => ({
			credentialId: item.CredentialId,
			friendlyCredentialName: item.FriendlyCredentialName,
			relyingPartyId: item.RelyingPartyId,
			authenticatorAttachment: item.AuthenticatorAttachment,
			authenticatorTransports: item.AuthenticatorTransports,
			createdAt: item.CreatedAt ? /* @__PURE__ */ new Date(item.CreatedAt * 1e3) : void 0
		})),
		nextToken
	};
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/apis/listWebAuthnCredentials.mjs
/**
* Lists registered credentials for an authenticated user
*
* @param {ListWebAuthnCredentialsInput} input The list input parameters including page size and next token.
* @returns Promise<ListWebAuthnCredentialsOutput>
* @throws - {@link AuthError}:
* - Thrown when user is unauthenticated
* @throws - {@link ListWebAuthnCredentialsException}
* - Thrown due to a service error when listing WebAuthn credentials
*/
async function listWebAuthnCredentials(input) {
	return listWebAuthnCredentials$1(getGlobalContext(), input);
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createDeleteWebAuthnCredentialClient.mjs
var createDeleteWebAuthnCredentialClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("DeleteWebAuthnCredential"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/apis/deleteWebAuthnCredential.mjs
async function deleteWebAuthnCredential$1(amplify, input) {
	const authConfig = amplify.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await amplify.fetchAuthSession();
	assertAuthTokens(tokens);
	await createDeleteWebAuthnCredentialClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.DeleteWebAuthnCredential)
	}, {
		AccessToken: tokens.accessToken.toString(),
		CredentialId: input.credentialId
	});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/apis/deleteWebAuthnCredential.mjs
/**
* Delete a registered credential for an authenticated user by credentialId
* @param {DeleteWebAuthnCredentialInput} input The delete input parameters including the credentialId
* @returns Promise<void>
* @throws - {@link AuthError}:
* - Thrown when user is unauthenticated
* @throws - {@link DeleteWebAuthnCredentialException}
* - Thrown due to a service error when deleting a WebAuthn credential
*/
async function deleteWebAuthnCredential(input) {
	return deleteWebAuthnCredential$1(getGlobalContext(), input);
}
//#endregion
export { AuthError, associateWebAuthnCredential, autoSignIn, confirmResetPassword, confirmSignIn, confirmSignUp, confirmUserAttribute, decodeJWT, deleteUser, deleteUserAttributes, deleteWebAuthnCredential, fetchAuthSession, fetchDevices, fetchMFAPreference, fetchUserAttributes, forgetDevice, getCurrentUser, listWebAuthnCredentials, rememberDevice, resendSignUpCode, resetPassword, sendUserAttributeVerificationCode, setUpTOTP, signIn, signInWithRedirect, signOut, signUp, updateMFAPreference, updatePassword, updateUserAttribute, updateUserAttributes, verifyTOTPSetup };
