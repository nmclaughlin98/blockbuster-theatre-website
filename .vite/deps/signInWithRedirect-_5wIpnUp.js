//#region node_modules/@aws-amplify/core/dist/esm/errors/AmplifyError.mjs
var AmplifyError = class AmplifyError extends Error {
	/**
	*  Constructs an AmplifyError.
	*
	* @param message text that describes the main problem.
	* @param underlyingError the underlying cause of the error.
	* @param recoverySuggestion suggestion to recover from the error.
	*
	*/
	constructor({ message, name, recoverySuggestion, underlyingError, metadata }) {
		super(message);
		this.name = name;
		this.underlyingError = underlyingError;
		this.recoverySuggestion = recoverySuggestion;
		if (metadata) {
			const { extendedRequestId, httpStatusCode, requestId } = metadata;
			this.metadata = {
				extendedRequestId,
				httpStatusCode,
				requestId
			};
		}
		this.constructor = AmplifyError;
		Object.setPrototypeOf(this, AmplifyError.prototype);
	}
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/types/errors.mjs
var AmplifyErrorCode;
(function(AmplifyErrorCode) {
	AmplifyErrorCode["NoEndpointId"] = "NoEndpointId";
	AmplifyErrorCode["PlatformNotSupported"] = "PlatformNotSupported";
	AmplifyErrorCode["Unknown"] = "Unknown";
	AmplifyErrorCode["NetworkError"] = "NetworkError";
})(AmplifyErrorCode || (AmplifyErrorCode = {}));
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/errors/createAssertionFunction.mjs
var createAssertionFunction = (errorMap, AssertionError = AmplifyError) => (assertion, name, additionalContext) => {
	const { message, recoverySuggestion } = errorMap[name];
	if (!assertion) throw new AssertionError({
		name,
		message: additionalContext ? `${message} ${additionalContext}` : message,
		recoverySuggestion
	});
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/globalHelpers/index.mjs
var getCrypto = () => {
	if (typeof window === "object" && typeof window.crypto === "object") return window.crypto;
	if (typeof crypto === "object") return crypto;
	throw new AmplifyError({
		name: "MissingPolyfill",
		message: "Cannot resolve the `crypto` function from the environment."
	});
};
var getBtoa = () => {
	if (typeof window !== "undefined" && typeof window.btoa === "function") return window.btoa;
	if (typeof btoa === "function") return btoa;
	throw new AmplifyError({
		name: "Base64EncoderError",
		message: "Cannot resolve the `btoa` function from the environment."
	});
};
var getAtob = () => {
	if (typeof window !== "undefined" && typeof window.atob === "function") return window.atob;
	if (typeof atob === "function") return atob;
	throw new AmplifyError({
		name: "Base64EncoderError",
		message: "Cannot resolve the `atob` function from the environment."
	});
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/generateRandomString.mjs
var generateRandomString = (length) => {
	const STATE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const result = [];
	const randomNums = new Uint8Array(length);
	getCrypto().getRandomValues(randomNums);
	for (const num of randomNums) result.push(STATE_CHARSET[num % 62]);
	return result.join("");
};
var USER_AGENT_HEADER = "x-amz-user-agent";
var NO_HUBCALLBACK_PROVIDED_EXCEPTION = "NoHubcallbackProvidedException";
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Logger/types.mjs
var LogType;
(function(LogType) {
	LogType["DEBUG"] = "DEBUG";
	LogType["ERROR"] = "ERROR";
	LogType["INFO"] = "INFO";
	LogType["WARN"] = "WARN";
	LogType["VERBOSE"] = "VERBOSE";
	LogType["NONE"] = "NONE";
})(LogType || (LogType = {}));
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Logger/ConsoleLogger.mjs
var LOG_LEVELS = {
	VERBOSE: 1,
	DEBUG: 2,
	INFO: 3,
	WARN: 4,
	ERROR: 5,
	NONE: 6
};
/**
* Write logs
* @class Logger
*/
var ConsoleLogger = class ConsoleLogger {
	/**
	* @constructor
	* @param {string} name - Name of the logger
	*/
	constructor(name, level = LogType.WARN) {
		this.name = name;
		this.level = level;
		this._pluggables = [];
	}
	_padding(n) {
		return n < 10 ? "0" + n : "" + n;
	}
	_ts() {
		const dt = /* @__PURE__ */ new Date();
		return [this._padding(dt.getMinutes()), this._padding(dt.getSeconds())].join(":") + "." + dt.getMilliseconds();
	}
	configure(config) {
		if (!config) return this._config;
		this._config = config;
		return this._config;
	}
	/**
	* Write log
	* @method
	* @memeberof Logger
	* @param {LogType|string} type - log type, default INFO
	* @param {string|object} msg - Logging message or object
	*/
	_log(type, ...msg) {
		let loggerLevelName = this.level;
		if (ConsoleLogger.LOG_LEVEL) loggerLevelName = ConsoleLogger.LOG_LEVEL;
		if (typeof window !== "undefined" && window.LOG_LEVEL) loggerLevelName = window.LOG_LEVEL;
		const loggerLevel = LOG_LEVELS[loggerLevelName];
		if (!(LOG_LEVELS[type] >= loggerLevel)) return;
		let log = console.log.bind(console);
		if (type === LogType.ERROR && console.error) log = console.error.bind(console);
		if (type === LogType.WARN && console.warn) log = console.warn.bind(console);
		if (ConsoleLogger.BIND_ALL_LOG_LEVELS) {
			if (type === LogType.INFO && console.info) log = console.info.bind(console);
			if (type === LogType.DEBUG && console.debug) log = console.debug.bind(console);
		}
		const prefix = `[${type}] ${this._ts()} ${this.name}`;
		let message = "";
		if (msg.length === 1 && typeof msg[0] === "string") {
			message = `${prefix} - ${msg[0]}`;
			log(message);
		} else if (msg.length === 1) {
			message = `${prefix} ${msg[0]}`;
			log(prefix, msg[0]);
		} else if (typeof msg[0] === "string") {
			let obj = msg.slice(1);
			if (obj.length === 1) obj = obj[0];
			message = `${prefix} - ${msg[0]} ${obj}`;
			log(`${prefix} - ${msg[0]}`, obj);
		} else {
			message = `${prefix} ${msg}`;
			log(prefix, msg);
		}
		for (const plugin of this._pluggables) {
			const logEvent = {
				message,
				timestamp: Date.now()
			};
			plugin.pushLogs([logEvent]);
		}
	}
	/**
	* Write General log. Default to INFO
	* @method
	* @memeberof Logger
	* @param {string|object} msg - Logging message or object
	*/
	log(...msg) {
		this._log(LogType.INFO, ...msg);
	}
	/**
	* Write INFO log
	* @method
	* @memeberof Logger
	* @param {string|object} msg - Logging message or object
	*/
	info(...msg) {
		this._log(LogType.INFO, ...msg);
	}
	/**
	* Write WARN log
	* @method
	* @memeberof Logger
	* @param {string|object} msg - Logging message or object
	*/
	warn(...msg) {
		this._log(LogType.WARN, ...msg);
	}
	/**
	* Write ERROR log
	* @method
	* @memeberof Logger
	* @param {string|object} msg - Logging message or object
	*/
	error(...msg) {
		this._log(LogType.ERROR, ...msg);
	}
	/**
	* Write DEBUG log
	* @method
	* @memeberof Logger
	* @param {string|object} msg - Logging message or object
	*/
	debug(...msg) {
		this._log(LogType.DEBUG, ...msg);
	}
	/**
	* Write VERBOSE log
	* @method
	* @memeberof Logger
	* @param {string|object} msg - Logging message or object
	*/
	verbose(...msg) {
		this._log(LogType.VERBOSE, ...msg);
	}
	addPluggable(pluggable) {
		if (pluggable && pluggable.getCategoryName() === "Logging") {
			this._pluggables.push(pluggable);
			pluggable.configure(this._config);
		}
	}
	listPluggables() {
		return this._pluggables;
	}
};
ConsoleLogger.LOG_LEVEL = null;
ConsoleLogger.BIND_ALL_LOG_LEVELS = false;
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/isBrowser.mjs
var isBrowser = () => typeof window !== "undefined" && typeof window.document !== "undefined";
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/retry/constants.mjs
var MAX_DELAY_MS = 3e5;
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/retry/jitteredBackoff.mjs
/**
* @private
* Internal use of Amplify only
*/
function jitteredBackoff$1(maxDelayMs = MAX_DELAY_MS) {
	const BASE_TIME_MS = 100;
	const JITTER_FACTOR = 100;
	return (attempt) => {
		const delay = 2 ** attempt * BASE_TIME_MS + JITTER_FACTOR * Math.random();
		return delay > maxDelayMs ? false : delay;
	};
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/urlSafeDecode.mjs
function urlSafeDecode(hex) {
	return (hex.match(/.{2}/g) || []).map((char) => String.fromCharCode(parseInt(char, 16))).join("");
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/urlSafeEncode.mjs
function urlSafeEncode(str) {
	return str.split("").map((char) => char.charCodeAt(0).toString(16).padStart(2, "0")).join("");
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/deDupeAsyncFunction.mjs
/**
* returns in-flight promise if there is one
*
* @param asyncFunction - asyncFunction to be deduped.
* @returns - the return type of the callback
*/
var deDupeAsyncFunction = (asyncFunction) => {
	let inflightPromise;
	return async (...args) => {
		if (inflightPromise) return inflightPromise;
		inflightPromise = new Promise((resolve, reject) => {
			asyncFunction(...args).then((result) => {
				resolve(result);
			}).catch((error) => {
				reject(error);
			}).finally(() => {
				inflightPromise = void 0;
			});
		});
		return inflightPromise;
	};
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/isTokenExpired.mjs
function isTokenExpired({ expiresAt, clockDrift, tolerance = 5e3 }) {
	return Date.now() + clockDrift + tolerance > expiresAt;
}
//#endregion
//#region node_modules/uuid/dist/esm-browser/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) byteToHex.push((i + 256).toString(16).slice(1));
function unsafeStringify(arr, offset = 0) {
	return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
//#endregion
//#region node_modules/uuid/dist/esm-browser/rng.js
var getRandomValues;
var rnds8 = /* @__PURE__ */ new Uint8Array(16);
function rng() {
	if (!getRandomValues) {
		if (typeof crypto === "undefined" || !crypto.getRandomValues) throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
		getRandomValues = crypto.getRandomValues.bind(crypto);
	}
	return getRandomValues(rnds8);
}
var native_default = { randomUUID: typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto) };
//#endregion
//#region node_modules/uuid/dist/esm-browser/v4.js
function v4(options, buf, offset) {
	if (native_default.randomUUID && !buf && !options) return native_default.randomUUID();
	options = options || {};
	const rnds = options.random ?? options.rng?.() ?? rng();
	if (rnds.length < 16) throw new Error("Random bytes length must be >= 16");
	rnds[6] = rnds[6] & 15 | 64;
	rnds[8] = rnds[8] & 63 | 128;
	if (buf) {
		offset = offset || 0;
		if (offset < 0 || offset + 16 > buf.length) throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
		for (let i = 0; i < 16; ++i) buf[offset + i] = rnds[i];
		return buf;
	}
	return unsafeStringify(rnds);
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/amplifyUuid/index.mjs
var amplifyUuid = v4;
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/amplifyUrl/index.mjs
var AmplifyUrl = URL;
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/deviceName/getDeviceName.mjs
/**
* Retrieves the device name using the User-Agent Client Hints API if available,
* falling back to the traditional userAgent string if not.
*
* @returns {Promise<string>} A promise that resolves with a string representing the device name.
*
* Example Output:
* navigator.userAgentData:
*   'macOS 14.2.1 arm macOS Not A(Brand/99.0.0.0;Google Chrome/121.0.6167.160;Chromium/121.0.6167.160'
* navigator.userAgent:
*   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0'
*/
var getDeviceName = async () => {
	const { userAgentData } = navigator;
	if (!userAgentData) return navigator.userAgent;
	const { platform = "", platformVersion = "", model = "", architecture = "", fullVersionList = [] } = await userAgentData.getHighEntropyValues([
		"platform",
		"platformVersion",
		"architecture",
		"model",
		"fullVersionList"
	]);
	return [
		platform,
		platformVersion,
		architecture,
		model,
		platform,
		fullVersionList.map((v) => `${v.brand}/${v.version}`).join(";")
	].filter((value) => value).join(" ") || navigator.userAgent;
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/convert/base64/base64Decoder.mjs
var base64Decoder = { convert(input, options) {
	let inputStr = input;
	if (options?.urlSafe) inputStr = inputStr.replace(/-/g, "+").replace(/_/g, "/");
	return getAtob()(inputStr);
} };
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/singleton/Auth/utils/errorHelpers.mjs
var AuthConfigurationErrorCode;
(function(AuthConfigurationErrorCode) {
	AuthConfigurationErrorCode["AuthTokenConfigException"] = "AuthTokenConfigException";
	AuthConfigurationErrorCode["AuthUserPoolAndIdentityPoolException"] = "AuthUserPoolAndIdentityPoolException";
	AuthConfigurationErrorCode["AuthUserPoolException"] = "AuthUserPoolException";
	AuthConfigurationErrorCode["InvalidIdentityPoolIdException"] = "InvalidIdentityPoolIdException";
	AuthConfigurationErrorCode["OAuthNotConfigureException"] = "OAuthNotConfigureException";
})(AuthConfigurationErrorCode || (AuthConfigurationErrorCode = {}));
var assert$3 = createAssertionFunction({
	[AuthConfigurationErrorCode.AuthTokenConfigException]: {
		message: "Auth Token Provider not configured.",
		recoverySuggestion: "Make sure to call Amplify.configure in your app."
	},
	[AuthConfigurationErrorCode.AuthUserPoolAndIdentityPoolException]: {
		message: "Auth UserPool or IdentityPool not configured.",
		recoverySuggestion: "Make sure to call Amplify.configure in your app with UserPoolId and IdentityPoolId."
	},
	[AuthConfigurationErrorCode.AuthUserPoolException]: {
		message: "Auth UserPool not configured.",
		recoverySuggestion: "Make sure to call Amplify.configure in your app with userPoolId and userPoolClientId."
	},
	[AuthConfigurationErrorCode.InvalidIdentityPoolIdException]: {
		message: "Invalid identity pool id provided.",
		recoverySuggestion: "Make sure a valid identityPoolId is given in the config."
	},
	[AuthConfigurationErrorCode.OAuthNotConfigureException]: {
		message: "oauth param not configured.",
		recoverySuggestion: "Make sure to call Amplify.configure with oauth parameter in your app."
	}
});
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/singleton/Auth/utils/index.mjs
function assertTokenProviderConfig(cognitoConfig) {
	let assertionValid = true;
	if (!cognitoConfig) assertionValid = false;
	else assertionValid = !!cognitoConfig.userPoolId && !!cognitoConfig.userPoolClientId;
	assert$3(assertionValid, AuthConfigurationErrorCode.AuthUserPoolException);
}
function assertOAuthConfig(cognitoConfig) {
	assert$3(!!cognitoConfig?.loginWith?.oauth?.domain && !!cognitoConfig?.loginWith?.oauth?.redirectSignOut && !!cognitoConfig?.loginWith?.oauth?.redirectSignIn && !!cognitoConfig?.loginWith?.oauth?.responseType, AuthConfigurationErrorCode.OAuthNotConfigureException);
}
function assertIdentityPoolIdConfig(cognitoConfig) {
	assert$3(!!cognitoConfig?.identityPoolId, AuthConfigurationErrorCode.InvalidIdentityPoolIdException);
}
/**
* Decodes payload of JWT token
*
* @param {String} token A string representing a token to be decoded
* @throws {@link Error} - Throws error when token is invalid or payload malformed.
*/
function decodeJWT(token) {
	const tokenParts = token.split(".");
	if (tokenParts.length !== 3) throw new Error("Invalid token");
	try {
		const base64 = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
		const jsonStr = decodeURIComponent(base64Decoder.convert(base64).split("").map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`).join(""));
		return {
			toString: () => token,
			payload: JSON.parse(jsonStr)
		};
	} catch (err) {
		throw new Error("Invalid token payload");
	}
}
//#endregion
//#region node_modules/tslib/tslib.es6.mjs
function __awaiter(thisArg, _arguments, P, generator) {
	function adopt(value) {
		return value instanceof P ? value : new P(function(resolve) {
			resolve(value);
		});
	}
	return new (P || (P = Promise))(function(resolve, reject) {
		function fulfilled(value) {
			try {
				step(generator.next(value));
			} catch (e) {
				reject(e);
			}
		}
		function rejected(value) {
			try {
				step(generator["throw"](value));
			} catch (e) {
				reject(e);
			}
		}
		function step(result) {
			result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
		}
		step((generator = generator.apply(thisArg, _arguments || [])).next());
	});
}
function __generator(thisArg, body) {
	var _ = {
		label: 0,
		sent: function() {
			if (t[0] & 1) throw t[1];
			return t[1];
		},
		trys: [],
		ops: []
	}, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
	return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() {
		return this;
	}), g;
	function verb(n) {
		return function(v) {
			return step([n, v]);
		};
	}
	function step(op) {
		if (f) throw new TypeError("Generator is already executing.");
		while (g && (g = 0, op[0] && (_ = 0)), _) try {
			if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
			if (y = 0, t) op = [op[0] & 2, t.value];
			switch (op[0]) {
				case 0:
				case 1:
					t = op;
					break;
				case 4:
					_.label++;
					return {
						value: op[1],
						done: false
					};
				case 5:
					_.label++;
					y = op[1];
					op = [0];
					continue;
				case 7:
					op = _.ops.pop();
					_.trys.pop();
					continue;
				default:
					if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
						_ = 0;
						continue;
					}
					if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
						_.label = op[1];
						break;
					}
					if (op[0] === 6 && _.label < t[1]) {
						_.label = t[1];
						t = op;
						break;
					}
					if (t && _.label < t[2]) {
						_.label = t[2];
						_.ops.push(op);
						break;
					}
					if (t[2]) _.ops.pop();
					_.trys.pop();
					continue;
			}
			op = body.call(thisArg, _);
		} catch (e) {
			op = [6, e];
			y = 0;
		} finally {
			f = t = 0;
		}
		if (op[0] & 5) throw op[1];
		return {
			value: op[0] ? op[1] : void 0,
			done: true
		};
	}
}
function __classPrivateFieldGet(receiver, state, kind, f) {
	if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
	if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
	return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
	if (kind === "m") throw new TypeError("Private method is not writable");
	if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
	if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
	return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
//#endregion
//#region node_modules/@aws-crypto/sha256-js/build/module/constants.js
/**
* @internal
*/
var KEY = new Uint32Array([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
/**
* @internal
*/
var INIT = [
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
];
/**
* @internal
*/
var MAX_HASHABLE_LENGTH = Math.pow(2, 53) - 1;
//#endregion
//#region node_modules/@aws-crypto/sha256-js/build/module/RawSha256.js
/**
* @internal
*/
var RawSha256 = function() {
	function RawSha256() {
		this.state = Int32Array.from(INIT);
		this.temp = /* @__PURE__ */ new Int32Array(64);
		this.buffer = /* @__PURE__ */ new Uint8Array(64);
		this.bufferLength = 0;
		this.bytesHashed = 0;
		/**
		* @internal
		*/
		this.finished = false;
	}
	RawSha256.prototype.update = function(data) {
		if (this.finished) throw new Error("Attempted to update an already finished hash.");
		var position = 0;
		var byteLength = data.byteLength;
		this.bytesHashed += byteLength;
		if (this.bytesHashed * 8 > MAX_HASHABLE_LENGTH) throw new Error("Cannot hash more than 2^53 - 1 bits");
		while (byteLength > 0) {
			this.buffer[this.bufferLength++] = data[position++];
			byteLength--;
			if (this.bufferLength === 64) {
				this.hashBuffer();
				this.bufferLength = 0;
			}
		}
	};
	RawSha256.prototype.digest = function() {
		if (!this.finished) {
			var bitsHashed = this.bytesHashed * 8;
			var bufferView = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
			var undecoratedLength = this.bufferLength;
			bufferView.setUint8(this.bufferLength++, 128);
			if (undecoratedLength % 64 >= 56) {
				for (var i = this.bufferLength; i < 64; i++) bufferView.setUint8(i, 0);
				this.hashBuffer();
				this.bufferLength = 0;
			}
			for (var i = this.bufferLength; i < 56; i++) bufferView.setUint8(i, 0);
			bufferView.setUint32(56, Math.floor(bitsHashed / 4294967296), true);
			bufferView.setUint32(60, bitsHashed);
			this.hashBuffer();
			this.finished = true;
		}
		var out = /* @__PURE__ */ new Uint8Array(32);
		for (var i = 0; i < 8; i++) {
			out[i * 4] = this.state[i] >>> 24 & 255;
			out[i * 4 + 1] = this.state[i] >>> 16 & 255;
			out[i * 4 + 2] = this.state[i] >>> 8 & 255;
			out[i * 4 + 3] = this.state[i] >>> 0 & 255;
		}
		return out;
	};
	RawSha256.prototype.hashBuffer = function() {
		var _a = this, buffer = _a.buffer, state = _a.state;
		var state0 = state[0], state1 = state[1], state2 = state[2], state3 = state[3], state4 = state[4], state5 = state[5], state6 = state[6], state7 = state[7];
		for (var i = 0; i < 64; i++) {
			if (i < 16) this.temp[i] = (buffer[i * 4] & 255) << 24 | (buffer[i * 4 + 1] & 255) << 16 | (buffer[i * 4 + 2] & 255) << 8 | buffer[i * 4 + 3] & 255;
			else {
				var u = this.temp[i - 2];
				var t1_1 = (u >>> 17 | u << 15) ^ (u >>> 19 | u << 13) ^ u >>> 10;
				u = this.temp[i - 15];
				var t2_1 = (u >>> 7 | u << 25) ^ (u >>> 18 | u << 14) ^ u >>> 3;
				this.temp[i] = (t1_1 + this.temp[i - 7] | 0) + (t2_1 + this.temp[i - 16] | 0);
			}
			var t1 = (((state4 >>> 6 | state4 << 26) ^ (state4 >>> 11 | state4 << 21) ^ (state4 >>> 25 | state4 << 7)) + (state4 & state5 ^ ~state4 & state6) | 0) + (state7 + (KEY[i] + this.temp[i] | 0) | 0) | 0;
			var t2 = ((state0 >>> 2 | state0 << 30) ^ (state0 >>> 13 | state0 << 19) ^ (state0 >>> 22 | state0 << 10)) + (state0 & state1 ^ state0 & state2 ^ state1 & state2) | 0;
			state7 = state6;
			state6 = state5;
			state5 = state4;
			state4 = state3 + t1 | 0;
			state3 = state2;
			state2 = state1;
			state1 = state0;
			state0 = t1 + t2 | 0;
		}
		state[0] += state0;
		state[1] += state1;
		state[2] += state2;
		state[3] += state3;
		state[4] += state4;
		state[5] += state5;
		state[6] += state6;
		state[7] += state7;
	};
	return RawSha256;
}();
//#endregion
//#region node_modules/@smithy/util-utf8/dist-es/fromUtf8.browser.js
var fromUtf8$1 = (input) => new TextEncoder().encode(input);
//#endregion
//#region node_modules/@aws-crypto/util/build/module/convertToBuffer.js
var fromUtf8 = typeof Buffer !== "undefined" && Buffer.from ? function(input) {
	return Buffer.from(input, "utf8");
} : fromUtf8$1;
function convertToBuffer(data) {
	if (data instanceof Uint8Array) return data;
	if (typeof data === "string") return fromUtf8(data);
	if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
	return new Uint8Array(data);
}
//#endregion
//#region node_modules/@aws-crypto/util/build/module/isEmptyData.js
function isEmptyData(data) {
	if (typeof data === "string") return data.length === 0;
	return data.byteLength === 0;
}
//#endregion
//#region node_modules/@aws-crypto/sha256-js/build/module/jsSha256.js
var Sha256 = function() {
	function Sha256(secret) {
		this.secret = secret;
		this.hash = new RawSha256();
		this.reset();
	}
	Sha256.prototype.update = function(toHash) {
		if (isEmptyData(toHash) || this.error) return;
		try {
			this.hash.update(convertToBuffer(toHash));
		} catch (e) {
			this.error = e;
		}
	};
	Sha256.prototype.digestSync = function() {
		if (this.error) throw this.error;
		if (this.outer) {
			if (!this.outer.finished) this.outer.update(this.hash.digest());
			return this.outer.digest();
		}
		return this.hash.digest();
	};
	Sha256.prototype.digest = function() {
		return __awaiter(this, void 0, void 0, function() {
			return __generator(this, function(_a) {
				return [2, this.digestSync()];
			});
		});
	};
	Sha256.prototype.reset = function() {
		this.hash = new RawSha256();
		if (this.secret) {
			this.outer = new RawSha256();
			var inner = bufferFromSecret(this.secret);
			var outer = /* @__PURE__ */ new Uint8Array(64);
			outer.set(inner);
			for (var i = 0; i < 64; i++) {
				inner[i] ^= 54;
				outer[i] ^= 92;
			}
			this.hash.update(inner);
			this.outer.update(outer);
			for (var i = 0; i < inner.byteLength; i++) inner[i] = 0;
		}
	};
	return Sha256;
}();
function bufferFromSecret(secret) {
	var input = convertToBuffer(secret);
	if (input.byteLength > 64) {
		var bufferHash = new RawSha256();
		bufferHash.update(input);
		input = bufferHash.digest();
	}
	var buffer = /* @__PURE__ */ new Uint8Array(64);
	buffer.set(input);
	return buffer;
}
//#endregion
//#region node_modules/@smithy/util-hex-encoding/dist-es/index.js
var SHORT_TO_HEX$1 = {};
var HEX_TO_SHORT$1 = {};
for (let i = 0; i < 256; i++) {
	let encodedByte = i.toString(16).toLowerCase();
	if (encodedByte.length === 1) encodedByte = `0${encodedByte}`;
	SHORT_TO_HEX$1[i] = encodedByte;
	HEX_TO_SHORT$1[encodedByte] = i;
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/types.mjs
var Framework;
(function(Framework) {
	Framework["WebUnknown"] = "0";
	Framework["React"] = "1";
	Framework["NextJs"] = "2";
	Framework["Angular"] = "3";
	Framework["VueJs"] = "4";
	Framework["Nuxt"] = "5";
	Framework["Svelte"] = "6";
	Framework["ServerSideUnknown"] = "100";
	Framework["ReactSSR"] = "101";
	Framework["NextJsSSR"] = "102";
	Framework["AngularSSR"] = "103";
	Framework["VueJsSSR"] = "104";
	Framework["NuxtSSR"] = "105";
	Framework["SvelteSSR"] = "106";
	Framework["ReactNative"] = "201";
	Framework["Expo"] = "202";
})(Framework || (Framework = {}));
var Category;
(function(Category) {
	Category["AI"] = "ai";
	Category["API"] = "api";
	Category["Auth"] = "auth";
	Category["Analytics"] = "analytics";
	Category["DataStore"] = "datastore";
	Category["Geo"] = "geo";
	Category["InAppMessaging"] = "inappmessaging";
	Category["Interactions"] = "interactions";
	Category["Predictions"] = "predictions";
	Category["PubSub"] = "pubsub";
	Category["PushNotification"] = "pushnotification";
	Category["Storage"] = "storage";
})(Category || (Category = {}));
var AiAction;
(function(AiAction) {
	AiAction["CreateConversation"] = "1";
	AiAction["GetConversation"] = "2";
	AiAction["ListConversations"] = "3";
	AiAction["DeleteConversation"] = "4";
	AiAction["SendMessage"] = "5";
	AiAction["ListMessages"] = "6";
	AiAction["OnMessage"] = "7";
	AiAction["Generation"] = "8";
	AiAction["UpdateConversation"] = "9";
})(AiAction || (AiAction = {}));
var AnalyticsAction;
(function(AnalyticsAction) {
	AnalyticsAction["Record"] = "1";
	AnalyticsAction["IdentifyUser"] = "2";
})(AnalyticsAction || (AnalyticsAction = {}));
var ApiAction;
(function(ApiAction) {
	ApiAction["GraphQl"] = "1";
	ApiAction["Get"] = "2";
	ApiAction["Post"] = "3";
	ApiAction["Put"] = "4";
	ApiAction["Patch"] = "5";
	ApiAction["Del"] = "6";
	ApiAction["Head"] = "7";
})(ApiAction || (ApiAction = {}));
var AuthAction;
(function(AuthAction) {
	AuthAction["SignUp"] = "1";
	AuthAction["ConfirmSignUp"] = "2";
	AuthAction["ResendSignUpCode"] = "3";
	AuthAction["SignIn"] = "4";
	AuthAction["FetchMFAPreference"] = "6";
	AuthAction["UpdateMFAPreference"] = "7";
	AuthAction["SetUpTOTP"] = "10";
	AuthAction["VerifyTOTPSetup"] = "11";
	AuthAction["ConfirmSignIn"] = "12";
	AuthAction["DeleteUserAttributes"] = "15";
	AuthAction["DeleteUser"] = "16";
	AuthAction["UpdateUserAttributes"] = "17";
	AuthAction["FetchUserAttributes"] = "18";
	AuthAction["ConfirmUserAttribute"] = "22";
	AuthAction["SignOut"] = "26";
	AuthAction["UpdatePassword"] = "27";
	AuthAction["ResetPassword"] = "28";
	AuthAction["ConfirmResetPassword"] = "29";
	AuthAction["FederatedSignIn"] = "30";
	AuthAction["RememberDevice"] = "32";
	AuthAction["ForgetDevice"] = "33";
	AuthAction["FetchDevices"] = "34";
	AuthAction["SendUserAttributeVerificationCode"] = "35";
	AuthAction["SignInWithRedirect"] = "36";
	AuthAction["StartWebAuthnRegistration"] = "37";
	AuthAction["CompleteWebAuthnRegistration"] = "38";
	AuthAction["ListWebAuthnCredentials"] = "39";
	AuthAction["DeleteWebAuthnCredential"] = "40";
})(AuthAction || (AuthAction = {}));
var DataStoreAction;
(function(DataStoreAction) {
	DataStoreAction["Subscribe"] = "1";
	DataStoreAction["GraphQl"] = "2";
})(DataStoreAction || (DataStoreAction = {}));
var GeoAction;
(function(GeoAction) {
	GeoAction["SearchByText"] = "0";
	GeoAction["SearchByCoordinates"] = "1";
	GeoAction["SearchForSuggestions"] = "2";
	GeoAction["SearchByPlaceId"] = "3";
	GeoAction["SaveGeofences"] = "4";
	GeoAction["GetGeofence"] = "5";
	GeoAction["ListGeofences"] = "6";
	GeoAction["DeleteGeofences"] = "7";
})(GeoAction || (GeoAction = {}));
var InAppMessagingAction;
(function(InAppMessagingAction) {
	InAppMessagingAction["SyncMessages"] = "1";
	InAppMessagingAction["IdentifyUser"] = "2";
	InAppMessagingAction["NotifyMessageInteraction"] = "3";
})(InAppMessagingAction || (InAppMessagingAction = {}));
var InteractionsAction;
(function(InteractionsAction) {
	InteractionsAction["None"] = "0";
})(InteractionsAction || (InteractionsAction = {}));
var PredictionsAction;
(function(PredictionsAction) {
	PredictionsAction["Convert"] = "1";
	PredictionsAction["Identify"] = "2";
	PredictionsAction["Interpret"] = "3";
})(PredictionsAction || (PredictionsAction = {}));
var PubSubAction;
(function(PubSubAction) {
	PubSubAction["Subscribe"] = "1";
})(PubSubAction || (PubSubAction = {}));
var PushNotificationAction;
(function(PushNotificationAction) {
	PushNotificationAction["InitializePushNotifications"] = "1";
	PushNotificationAction["IdentifyUser"] = "2";
	PushNotificationAction["RegisterDevice"] = "3";
	PushNotificationAction["RemoveDevice"] = "4";
})(PushNotificationAction || (PushNotificationAction = {}));
var StorageAction;
(function(StorageAction) {
	StorageAction["UploadData"] = "1";
	StorageAction["DownloadData"] = "2";
	StorageAction["List"] = "3";
	StorageAction["Copy"] = "4";
	StorageAction["Remove"] = "5";
	StorageAction["GetProperties"] = "6";
	StorageAction["GetUrl"] = "7";
	StorageAction["GetDataAccess"] = "8";
	StorageAction["ListCallerAccessGrants"] = "9";
})(StorageAction || (StorageAction = {}));
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/version.mjs
var version = "6.22.2";
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/detection/helpers.mjs
var globalExists = () => {
	return typeof global !== "undefined";
};
var windowExists = () => {
	return typeof window !== "undefined";
};
var documentExists = () => {
	return typeof document !== "undefined";
};
var processExists = () => {
	return typeof process !== "undefined";
};
var keyPrefixMatch = (object, prefix) => {
	return !!Object.keys(object).find((key) => key.startsWith(prefix));
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/detection/React.mjs
function reactWebDetect() {
	const elementKeyPrefixedWithReact = (key) => {
		return key.startsWith("_react") || key.startsWith("__react");
	};
	const elementIsReactEnabled = (element) => {
		return Object.keys(element).find(elementKeyPrefixedWithReact);
	};
	const allElementsWithId = () => Array.from(document.querySelectorAll("[id]"));
	return documentExists() && allElementsWithId().some(elementIsReactEnabled);
}
function reactSSRDetect() {
	return processExists() && typeof process.env !== "undefined" && !!Object.keys(process.env).find((key) => key.includes("react"));
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/detection/Vue.mjs
function vueWebDetect() {
	return windowExists() && keyPrefixMatch(window, "__VUE");
}
function vueSSRDetect() {
	return globalExists() && keyPrefixMatch(global, "__VUE");
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/detection/Svelte.mjs
function svelteWebDetect() {
	return windowExists() && keyPrefixMatch(window, "__SVELTE");
}
function svelteSSRDetect() {
	return processExists() && typeof process.env !== "undefined" && !!Object.keys(process.env).find((key) => key.includes("svelte"));
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/detection/Next.mjs
function nextWebDetect() {
	return windowExists() && window.next && typeof window.next === "object";
}
function nextSSRDetect() {
	return globalExists() && (keyPrefixMatch(global, "__next") || keyPrefixMatch(global, "__NEXT"));
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/detection/Nuxt.mjs
function nuxtWebDetect() {
	return windowExists() && (window.__NUXT__ !== void 0 || window.$nuxt !== void 0);
}
function nuxtSSRDetect() {
	return globalExists() && typeof global.__NUXT_PATHS__ !== "undefined";
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/detection/Angular.mjs
function angularWebDetect() {
	const angularVersionSetInDocument = Boolean(documentExists() && document.querySelector("[ng-version]"));
	const angularContentSetInWindow = Boolean(windowExists() && typeof window.ng !== "undefined");
	return angularVersionSetInDocument || angularContentSetInWindow;
}
function angularSSRDetect() {
	return processExists() && typeof process.env === "object" && process.env.npm_lifecycle_script?.startsWith("ng ") || false;
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/detection/ReactNative.mjs
function reactNativeDetect() {
	return typeof navigator !== "undefined" && typeof navigator.product !== "undefined" && navigator.product === "ReactNative";
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/detection/Expo.mjs
function expoDetect() {
	return globalExists() && typeof global.expo !== "undefined";
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/detection/Web.mjs
function webDetect() {
	return windowExists();
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/detection/index.mjs
var detectionMap = [
	{
		platform: Framework.Expo,
		detectionMethod: expoDetect
	},
	{
		platform: Framework.ReactNative,
		detectionMethod: reactNativeDetect
	},
	{
		platform: Framework.NextJs,
		detectionMethod: nextWebDetect
	},
	{
		platform: Framework.Nuxt,
		detectionMethod: nuxtWebDetect
	},
	{
		platform: Framework.Angular,
		detectionMethod: angularWebDetect
	},
	{
		platform: Framework.React,
		detectionMethod: reactWebDetect
	},
	{
		platform: Framework.VueJs,
		detectionMethod: vueWebDetect
	},
	{
		platform: Framework.Svelte,
		detectionMethod: svelteWebDetect
	},
	{
		platform: Framework.WebUnknown,
		detectionMethod: webDetect
	},
	{
		platform: Framework.NextJsSSR,
		detectionMethod: nextSSRDetect
	},
	{
		platform: Framework.NuxtSSR,
		detectionMethod: nuxtSSRDetect
	},
	{
		platform: Framework.ReactSSR,
		detectionMethod: reactSSRDetect
	},
	{
		platform: Framework.VueJsSSR,
		detectionMethod: vueSSRDetect
	},
	{
		platform: Framework.AngularSSR,
		detectionMethod: angularSSRDetect
	},
	{
		platform: Framework.SvelteSSR,
		detectionMethod: svelteSSRDetect
	}
];
function detect() {
	return detectionMap.find((detectionEntry) => detectionEntry.detectionMethod())?.platform || Framework.ServerSideUnknown;
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/detectFramework.mjs
var frameworkCache;
var frameworkChangeObservers = [];
var resetTriggered = false;
var SSR_RESET_TIMEOUT = 10;
var WEB_RESET_TIMEOUT = 10;
var PRIME_FRAMEWORK_DELAY = 1e3;
var detectFramework = () => {
	if (!frameworkCache) {
		frameworkCache = detect();
		if (resetTriggered) while (frameworkChangeObservers.length) frameworkChangeObservers.pop()?.();
		else frameworkChangeObservers.forEach((fcn) => {
			fcn();
		});
		resetTimeout(Framework.ServerSideUnknown, SSR_RESET_TIMEOUT);
		resetTimeout(Framework.WebUnknown, WEB_RESET_TIMEOUT);
	}
	return frameworkCache;
};
/**
* @internal Setup observer callback that will be called everytime the framework changes
*/
var observeFrameworkChanges = (fcn) => {
	if (resetTriggered) return;
	frameworkChangeObservers.push(fcn);
};
function clearCache() {
	frameworkCache = void 0;
}
function resetTimeout(framework, delay) {
	if (frameworkCache === framework && !resetTriggered) setTimeout(() => {
		clearCache();
		resetTriggered = true;
		setTimeout(detectFramework, PRIME_FRAMEWORK_DELAY);
	}, delay);
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/customUserAgent.mjs
var customUserAgentState = {};
var getCustomUserAgent = (category, api) => customUserAgentState[category]?.[api]?.additionalDetails;
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Platform/index.mjs
var BASE_USER_AGENT = `aws-amplify`;
/** Sanitize Amplify version string be removing special character + and character post the special character  */
var sanitizeAmplifyVersion = (amplifyVersion) => amplifyVersion.replace(/\+.*/, "");
var PlatformBuilder = class {
	constructor() {
		this.userAgent = `${BASE_USER_AGENT}/${sanitizeAmplifyVersion(version)}`;
	}
	get framework() {
		return detectFramework();
	}
	get isReactNative() {
		return this.framework === Framework.ReactNative || this.framework === Framework.Expo;
	}
	observeFrameworkChanges(fcn) {
		observeFrameworkChanges(fcn);
	}
};
new PlatformBuilder();
var getAmplifyUserAgentObject = ({ category, action } = {}) => {
	const userAgent = [[BASE_USER_AGENT, sanitizeAmplifyVersion(version)]];
	if (category) userAgent.push([category, action]);
	userAgent.push(["framework", detectFramework()]);
	if (category && action) {
		const customState = getCustomUserAgent(category, action);
		if (customState) customState.forEach((state) => {
			userAgent.push(state);
		});
	}
	return userAgent;
};
var getAmplifyUserAgent = (customUserAgentDetails) => {
	return getAmplifyUserAgentObject(customUserAgentDetails).map(([agentKey, agentValue]) => agentKey && agentValue ? `${agentKey}/${agentValue}` : agentKey).join(" ");
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/errors/PlatformNotSupportedError.mjs
var PlatformNotSupportedError = class extends AmplifyError {
	constructor() {
		super({
			name: AmplifyErrorCode.PlatformNotSupported,
			message: "Function not supported on current platform"
		});
	}
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/errors/NoAmplifyContextError.mjs
/**
* Stable error name/code thrown when a context is required but none is
* available (i.e. `Amplify.configure()` has not been called and no context was
* passed explicitly). Exposed as a constant so category packages can reliably
* catch this failure by name without importing the class.
*/
var NO_AMPLIFY_CONTEXT_ERROR_NAME = "NoAmplifyContextError";
/**
* Thrown when a category API resolves the global {@link AmplifyContext} but none
* has been set (the "unconfigured" path).
*
* Uses core's {@link AmplifyError} machinery so consumers can catch it via
* `instanceof AmplifyError` / `instanceof NoAmplifyContextError`, or by the
* stable `name` ({@link NO_AMPLIFY_CONTEXT_ERROR_NAME}).
*/
var NoAmplifyContextError = class NoAmplifyContextError extends AmplifyError {
	constructor(message = "No AmplifyContext available. Call Amplify.configure() to set a global context, or pass a context as the first argument.") {
		super({
			name: NO_AMPLIFY_CONTEXT_ERROR_NAME,
			message,
			recoverySuggestion: "Call Amplify.configure() before using this API, or pass an AmplifyContext created via createAmplifyContext() as the first argument."
		});
		this.constructor = NoAmplifyContextError;
		Object.setPrototypeOf(this, NoAmplifyContextError.prototype);
	}
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/errors/InvalidAmplifyContextError.mjs
/**
* Stable error name/code thrown when a value is passed where an
* {@link AmplifyContext} is expected, but it is not a branded context (e.g. a
* plain options object or an `AmplifyClass` instance was mistakenly passed in
* the context position). Exposed as a constant so category packages can catch
* this failure by name without importing the class.
*/
var INVALID_AMPLIFY_CONTEXT_ERROR_NAME = "InvalidAmplifyContextError";
/**
* Thrown when a defined-but-unbranded value is supplied where an
* {@link AmplifyContext} is required (e.g. category class constructors that
* accept an optional leading context argument).
*
* Uses core's {@link AmplifyError} machinery so consumers can catch it via
* `instanceof AmplifyError` / `instanceof InvalidAmplifyContextError`, or by the
* stable `name` ({@link INVALID_AMPLIFY_CONTEXT_ERROR_NAME}).
*/
var InvalidAmplifyContextError = class InvalidAmplifyContextError extends AmplifyError {
	constructor(message = "Invalid AmplifyContext. The value passed in the context position is not a branded AmplifyContext.") {
		super({
			name: INVALID_AMPLIFY_CONTEXT_ERROR_NAME,
			message,
			recoverySuggestion: "Pass an AmplifyContext created via createAmplifyContext() (or Amplify.configure()), or omit the argument to use the global context."
		});
		this.constructor = InvalidAmplifyContextError;
		Object.setPrototypeOf(this, InvalidAmplifyContextError.prototype);
	}
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Hub/index.mjs
var AMPLIFY_SYMBOL = typeof Symbol !== "undefined" ? Symbol("amplify_default") : "@@amplify_default";
var logger$7 = new ConsoleLogger("Hub");
var HubClass = class {
	constructor(name) {
		this.listeners = /* @__PURE__ */ new Map();
		this.protectedChannels = [
			"core",
			"auth",
			"api",
			"analytics",
			"interactions",
			"pubsub",
			"storage",
			"ui",
			"xr"
		];
		this.name = name;
	}
	/**
	* Used internally to remove a Hub listener.
	*
	* @remarks
	* This private method is for internal use only. Instead of calling Hub.remove, call the result of Hub.listen.
	*/
	_remove(channel, listener) {
		const holder = this.listeners.get(channel);
		if (!holder) {
			logger$7.warn(`No listeners for ${channel}`);
			return;
		}
		this.listeners.set(channel, [...holder.filter(({ callback }) => callback !== listener)]);
	}
	dispatch(channel, payload, source, ampSymbol, crossTab) {
		if (typeof channel === "string" && this.protectedChannels.indexOf(channel) > -1) {
			if (!(ampSymbol === AMPLIFY_SYMBOL)) logger$7.warn(`WARNING: ${channel} is protected and dispatching on it can have unintended consequences`);
		}
		const capsule = {
			channel,
			crossTab,
			payload: { ...payload },
			source,
			patternInfo: []
		};
		try {
			this._toListeners(capsule);
		} catch (e) {
			logger$7.error(e);
		}
	}
	listen(channel, callback, options = { listenerName: "noname" }) {
		let cb;
		const o = typeof options === "string" ? {
			listenerName: options,
			enableCrossTabEvents: false
		} : {
			listenerName: "noname",
			enableCrossTabEvents: false,
			...options
		};
		if (typeof callback !== "function") throw new AmplifyError({
			name: NO_HUBCALLBACK_PROVIDED_EXCEPTION,
			message: "No callback supplied to Hub"
		});
		else cb = callback;
		let holder = this.listeners.get(channel);
		if (!holder) {
			holder = [];
			this.listeners.set(channel, holder);
		}
		holder.push({
			name: o.listenerName,
			crossTab: o.enableCrossTabEvents,
			callback: cb
		});
		return () => {
			this._remove(channel, cb);
		};
	}
	_toListeners(capsule) {
		const { channel, payload, crossTab } = capsule;
		const holder = this.listeners.get(channel);
		if (holder) holder.filter((listener) => {
			if (crossTab) return !!listener.crossTab && channel === "auth";
			return true;
		}).forEach((listener) => {
			logger$7.debug(`Dispatching to ${channel} with `, payload);
			try {
				listener.callback(capsule);
			} catch (e) {
				logger$7.error(e);
			}
		});
	}
};
var Hub = new HubClass("__default__");
/**
* @internal
*
* Internal hub used for core Amplify functionality. Not intended for use outside of Amplify.
*
*/
var HubInternal = new HubClass("internal-hub");
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/convert/base64/bytesToString.mjs
function bytesToString(input) {
	return Array.from(input, (byte) => String.fromCodePoint(byte)).join("");
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/convert/base64/base64Encoder.mjs
var base64Encoder = { 
/**
* Convert input to base64-encoded string
* @param input - string to convert to base64
* @param options - encoding options that can optionally produce a base64url string
* @returns base64-encoded string
*/
convert(input, options = {
	urlSafe: false,
	skipPadding: false
}) {
	const inputStr = typeof input === "string" ? input : bytesToString(input);
	let encodedStr = getBtoa()(inputStr);
	if (options.urlSafe) encodedStr = encodedStr.replace(/\+/g, "-").replace(/\//g, "_");
	if (options.skipPadding) encodedStr = encodedStr.replace(/=/g, "");
	return encodedStr;
} };
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/cryptoSecureRandomInt.mjs
function cryptoSecureRandomInt() {
	return getCrypto().getRandomValues(/* @__PURE__ */ new Uint32Array(1))[0];
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/utils/WordArray.mjs
/**
* Hex encoding strategy.
* Converts a word array to a hex string.
* @param {WordArray} wordArray The word array.
* @return {string} The hex string.
* @static
*/
function hexStringify(wordArray) {
	const { words } = wordArray;
	const { sigBytes } = wordArray;
	const hexChars = [];
	for (let i = 0; i < sigBytes; i++) {
		const bite = words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
		hexChars.push((bite >>> 4).toString(16));
		hexChars.push((bite & 15).toString(16));
	}
	return hexChars.join("");
}
var WordArray = class WordArray {
	constructor(words, sigBytes) {
		this.words = [];
		let Words = words;
		Words = this.words = Words || [];
		if (sigBytes !== void 0) this.sigBytes = sigBytes;
		else this.sigBytes = Words.length * 4;
	}
	random(nBytes) {
		const words = [];
		for (let i = 0; i < nBytes; i += 4) words.push(cryptoSecureRandomInt());
		return new WordArray(words, nBytes);
	}
	toString() {
		return hexStringify(this);
	}
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/context/globalContext.mjs
var _globalContext = null;
/**
* Returns the global {@link AmplifyContext} set by `Amplify.configure()`.
*
* @throws {@link NoAmplifyContextError} If `Amplify.configure()` has not been
* called yet and no context is available.
*/
function getGlobalContext() {
	if (!_globalContext) throw new NoAmplifyContextError();
	return _globalContext;
}
/**
* Stores the given context as the global {@link AmplifyContext}.
*
* @internal
*/
function setGlobalContext(ctx) {
	_globalContext = ctx;
}
/**
* Returns `true` if a global {@link AmplifyContext} has been set.
*/
function hasGlobalContext() {
	return _globalContext !== null;
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/context/contextBrand.mjs
/**
* Symbol brand used to identify {@link AmplifyContext} objects at runtime.
* Uses `Symbol.for()` so the brand is shared across module instances
* (e.g. when `@aws-amplify/core` is accidentally duplicated in the bundle).
*/
var AMPLIFY_CONTEXT_BRAND = Symbol.for("amplify.context");
/**
* Returns `true` if the given value is a branded {@link AmplifyContext}.
*/
function isAmplifyContext(value) {
	return value !== null && value !== void 0 && typeof value === "object" && AMPLIFY_CONTEXT_BRAND in value;
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/context/resolveCtxArgs.mjs
/**
* Resolves the optional leading `AmplifyContext` argument from a function's
* arguments array. Used by category functions that accept an optional context
* as their first positional parameter.
*
* @returns A tuple of `[AmplifyContext, ...T]` where `T` is the remaining args.
*
* @example
* ```ts
* export function signIn(...args: any[]) {
*   const [ctx, input] = resolveCtxArgs<[SignInInput]>(args);
*   // ctx is guaranteed to be a valid AmplifyContext
* }
* ```
*
* @internal
*/
function resolveCtxArgs(args) {
	if (isAmplifyContext(args[0])) return [args[0], ...args.slice(1)];
	if (args.some(isAmplifyContext)) throw new InvalidAmplifyContextError("AmplifyContext must be passed as the first argument. Found an AmplifyContext in a later position — check the argument order.");
	if (args.length > 1 && args[0] === void 0) throw new NoAmplifyContextError("Undefined AmplifyContext passed. Call configure() first or omit the parameter.");
	return [getGlobalContext(), ...args];
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/storage/KeyValueStorage.mjs
var logger$6 = new ConsoleLogger("KeyValueStorage");
/**
* @internal
*/
var KeyValueStorage = class {
	constructor(storage) {
		this.storage = storage;
	}
	/**
	* This is used to set a specific item in storage
	* @param {string} key - the key for the item
	* @param {object} value - the value
	* @returns {string} value that was set
	*/
	async setItem(key, value) {
		if (!this.storage) throw new PlatformNotSupportedError();
		this.storage.setItem(key, value);
	}
	/**
	* This is used to get a specific key from storage
	* @param {string} key - the key for the item
	* This is used to clear the storage
	* @returns {string} the data item
	*/
	async getItem(key) {
		if (!this.storage) throw new PlatformNotSupportedError();
		return this.storage.getItem(key);
	}
	/**
	* This is used to remove an item from storage
	* @param {string} key - the key being set
	* @returns {string} value - value that was deleted
	*/
	async removeItem(key) {
		if (!this.storage) throw new PlatformNotSupportedError();
		this.storage.removeItem(key);
	}
	/**
	* This is used to clear the storage
	* @returns {string} nothing
	*/
	async clear() {
		if (!this.storage) throw new PlatformNotSupportedError();
		this.storage.clear();
	}
	/**
	* This is used to allow listening for changes
	* @param {function} listener - the function called on storage change
	* @returns {function} an unsubscribe function that removes the listener. The
	* underlying `window` 'storage' event listener is attached lazily on the
	* first subscription and detached once the last listener unsubscribes. In
	* non-browser (SSR/native) environments nothing is attached and the returned
	* unsubscribe function is a safe no-op.
	*/
	addListener(listener) {
		const listeners = this.listeners ?? (this.listeners = /* @__PURE__ */ new Set());
		listeners.add(listener);
		if (isBrowser() && listeners.size === 1) {
			const storageListener = (e) => {
				if (e.storageArea !== this.storage) return;
				this.listeners?.forEach((l) => {
					Promise.resolve(l({
						key: e.key,
						oldValue: e.oldValue,
						newValue: e.newValue
					})).catch((error) => {
						logger$6.error("Error in storage event listener", error);
					});
				});
			};
			this.storageListener = storageListener;
			window.addEventListener("storage", storageListener, false);
		}
		return () => {
			listeners.delete(listener);
			const { storageListener } = this;
			if (isBrowser() && listeners.size === 0 && storageListener) {
				window.removeEventListener("storage", storageListener, false);
				this.storageListener = void 0;
			}
		};
	}
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/storage/InMemoryStorage.mjs
/**
* @internal
*/
var InMemoryStorage = class {
	constructor() {
		this.storage = /* @__PURE__ */ new Map();
	}
	get length() {
		return this.storage.size;
	}
	key(index) {
		if (index > this.length - 1) return null;
		return Array.from(this.storage.keys())[index];
	}
	setItem(key, value) {
		this.storage.set(key, value);
	}
	getItem(key) {
		return this.storage.get(key) ?? null;
	}
	removeItem(key) {
		this.storage.delete(key);
	}
	clear() {
		this.storage.clear();
	}
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/storage/utils.mjs
/**
* @internal
* @returns Either a reference to window.localStorage or an in-memory storage as fallback
*/
var logger$5 = new ConsoleLogger("CoreStorageUtils");
var getLocalStorageWithFallback = () => {
	try {
		if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
	} catch (e) {
		logger$5.info("localStorage not found. InMemoryStorage is used as a fallback.");
	}
	return new InMemoryStorage();
};
/**
* @internal
* @returns Either a reference to window.sessionStorage or an in-memory storage as fallback
*/
var getSessionStorageWithFallback = () => {
	try {
		if (typeof window !== "undefined" && window.sessionStorage) {
			window.sessionStorage.getItem("test");
			return window.sessionStorage;
		}
		throw new Error("sessionStorage is not defined");
	} catch (e) {
		logger$5.info("sessionStorage not found. InMemoryStorage is used as a fallback.");
		return new InMemoryStorage();
	}
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/storage/DefaultStorage.mjs
/**
* @internal
*/
var DefaultStorage = class extends KeyValueStorage {
	constructor() {
		super(getLocalStorageWithFallback());
	}
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/storage/SessionStorage.mjs
/**
* @internal
*/
var SessionStorage = class extends KeyValueStorage {
	constructor() {
		super(getSessionStorageWithFallback());
	}
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/storage/SyncKeyValueStorage.mjs
var _SyncKeyValueStorage_storage;
/**
* @internal
*/
var SyncKeyValueStorage = class {
	constructor(storage) {
		_SyncKeyValueStorage_storage.set(this, void 0);
		__classPrivateFieldSet(this, _SyncKeyValueStorage_storage, storage, "f");
	}
	/**
	* This is used to set a specific item in storage
	* @param {string} key - the key for the item
	* @param {object} value - the value
	*/
	setItem(key, value) {
		if (!__classPrivateFieldGet(this, _SyncKeyValueStorage_storage, "f")) throw new PlatformNotSupportedError();
		__classPrivateFieldGet(this, _SyncKeyValueStorage_storage, "f").setItem(key, value);
	}
	/**
	* This is used to get a specific key from storage
	* @param {string} key - the key for the item
	* @returns {string | null} the data item
	*/
	getItem(key) {
		if (!__classPrivateFieldGet(this, _SyncKeyValueStorage_storage, "f")) throw new PlatformNotSupportedError();
		return __classPrivateFieldGet(this, _SyncKeyValueStorage_storage, "f").getItem(key);
	}
	/**
	* This is used to remove an item from storage
	* @param {string} key - the key being set
	*/
	removeItem(key) {
		if (!__classPrivateFieldGet(this, _SyncKeyValueStorage_storage, "f")) throw new PlatformNotSupportedError();
		__classPrivateFieldGet(this, _SyncKeyValueStorage_storage, "f").removeItem(key);
	}
	/**
	* This is used to clear the storage
	*/
	clear() {
		if (!__classPrivateFieldGet(this, _SyncKeyValueStorage_storage, "f")) throw new PlatformNotSupportedError();
		__classPrivateFieldGet(this, _SyncKeyValueStorage_storage, "f").clear();
	}
};
_SyncKeyValueStorage_storage = /* @__PURE__ */ new WeakMap();
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/storage/SyncSessionStorage.mjs
/**
* @internal
*/
var SyncSessionStorage = class extends SyncKeyValueStorage {
	constructor() {
		super(getSessionStorageWithFallback());
	}
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/storage/index.mjs
var defaultStorage = new DefaultStorage();
new SessionStorage();
var syncSessionStorage = new SyncSessionStorage();
new KeyValueStorage(new InMemoryStorage());
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/context/contextTokenOrchestrators.mjs
/**
* Maps a per-context token provider object to its write-capable orchestrator.
*
* The public `TokenProvider` contract is read-only (`getTokens` only), so the
* write side of a per-context provider cannot be hung off the provider itself
* without expanding the public surface. This registry keeps that association
* Amplify-owned and out of any public type.
*
* Weak keys so entries are GC'd with the context/provider. Values are kept
* opaque (`unknown`) so core carries no dependency on auth's orchestrator type;
* the reader supplies the concrete type at the call site.
*
* @internal
*/
var contextTokenOrchestrators = /* @__PURE__ */ new WeakMap();
/**
* Associates a per-context token provider with its write-capable orchestrator.
*
* @internal
*/
var registerContextTokenOrchestrator = (provider, orchestrator) => {
	contextTokenOrchestrators.set(provider, orchestrator);
};
/**
* Returns the orchestrator registered for the given token provider, or
* `undefined` when the provider is absent or was never registered (the global
* `Amplify.configure()` path).
*
* @internal
*/
var getContextTokenOrchestrator = (provider) => provider ? contextTokenOrchestrators.get(provider) : void 0;
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/errors/types/validation.mjs
var AuthValidationErrorCode;
(function(AuthValidationErrorCode) {
	AuthValidationErrorCode["EmptySignInUsername"] = "EmptySignInUsername";
	AuthValidationErrorCode["EmptySignInPassword"] = "EmptySignInPassword";
	AuthValidationErrorCode["CustomAuthSignInPassword"] = "CustomAuthSignInPassword";
	AuthValidationErrorCode["EmptySignUpUsername"] = "EmptySignUpUsername";
	AuthValidationErrorCode["EmptySignUpPassword"] = "EmptySignUpPassword";
	AuthValidationErrorCode["EmptyConfirmSignUpUsername"] = "EmptyConfirmSignUpUsername";
	AuthValidationErrorCode["EmptyConfirmSignUpCode"] = "EmptyConfirmSignUpCode";
	AuthValidationErrorCode["EmptyResendSignUpCodeUsername"] = "EmptyresendSignUpCodeUsername";
	AuthValidationErrorCode["EmptyChallengeResponse"] = "EmptyChallengeResponse";
	AuthValidationErrorCode["EmptyConfirmResetPasswordUsername"] = "EmptyConfirmResetPasswordUsername";
	AuthValidationErrorCode["EmptyConfirmResetPasswordNewPassword"] = "EmptyConfirmResetPasswordNewPassword";
	AuthValidationErrorCode["EmptyConfirmResetPasswordConfirmationCode"] = "EmptyConfirmResetPasswordConfirmationCode";
	AuthValidationErrorCode["EmptyResetPasswordUsername"] = "EmptyResetPasswordUsername";
	AuthValidationErrorCode["EmptyVerifyTOTPSetupCode"] = "EmptyVerifyTOTPSetupCode";
	AuthValidationErrorCode["EmptyConfirmUserAttributeCode"] = "EmptyConfirmUserAttributeCode";
	AuthValidationErrorCode["IncorrectMFAMethod"] = "IncorrectMFAMethod";
	AuthValidationErrorCode["EmptyUpdatePassword"] = "EmptyUpdatePassword";
	AuthValidationErrorCode["InvalidPreferredChallenge"] = "InvalidPreferredChallenge";
})(AuthValidationErrorCode || (AuthValidationErrorCode = {}));
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/common/AuthErrorStrings.mjs
var validationErrorMap = {
	[AuthValidationErrorCode.EmptyChallengeResponse]: { message: "challengeResponse is required to confirmSignIn" },
	[AuthValidationErrorCode.EmptyConfirmResetPasswordUsername]: { message: "username is required to confirmResetPassword" },
	[AuthValidationErrorCode.EmptyConfirmSignUpCode]: { message: "code is required to confirmSignUp" },
	[AuthValidationErrorCode.EmptyConfirmSignUpUsername]: { message: "username is required to confirmSignUp" },
	[AuthValidationErrorCode.EmptyConfirmResetPasswordConfirmationCode]: { message: "confirmationCode is required to confirmResetPassword" },
	[AuthValidationErrorCode.EmptyConfirmResetPasswordNewPassword]: { message: "newPassword is required to confirmResetPassword" },
	[AuthValidationErrorCode.EmptyResendSignUpCodeUsername]: { message: "username is required to confirmSignUp" },
	[AuthValidationErrorCode.EmptyResetPasswordUsername]: { message: "username is required to resetPassword" },
	[AuthValidationErrorCode.EmptySignInPassword]: { message: "password is required to signIn" },
	[AuthValidationErrorCode.EmptySignInUsername]: { message: "username is required to signIn" },
	[AuthValidationErrorCode.EmptySignUpPassword]: { message: "password is required to signUp" },
	[AuthValidationErrorCode.EmptySignUpUsername]: { message: "username is required to signUp" },
	[AuthValidationErrorCode.CustomAuthSignInPassword]: {
		message: "A password is not needed when signing in with CUSTOM_WITHOUT_SRP",
		recoverySuggestion: "Do not include a password in your signIn call."
	},
	[AuthValidationErrorCode.IncorrectMFAMethod]: {
		message: "Incorrect MFA method was chosen. It should be either SMS, TOTP, or EMAIL",
		recoverySuggestion: "Try to pass SMS, TOTP, or EMAIL as the challengeResponse"
	},
	[AuthValidationErrorCode.EmptyVerifyTOTPSetupCode]: { message: "code is required to verifyTotpSetup" },
	[AuthValidationErrorCode.EmptyUpdatePassword]: { message: "oldPassword and newPassword are required to changePassword" },
	[AuthValidationErrorCode.EmptyConfirmUserAttributeCode]: { message: "confirmation code is required to confirmUserAttribute" },
	[AuthValidationErrorCode.InvalidPreferredChallenge]: {
		message: "The preferred challenge is not enabled in your backend configuration",
		recoverySuggestion: "Ensure the authentication method is enabled in your Amplify backend configuration"
	}
};
var AuthErrorStrings;
(function(AuthErrorStrings) {
	AuthErrorStrings["DEFAULT_MSG"] = "Authentication Error";
	AuthErrorStrings["EMPTY_EMAIL"] = "Email cannot be empty";
	AuthErrorStrings["EMPTY_PHONE"] = "Phone number cannot be empty";
	AuthErrorStrings["EMPTY_USERNAME"] = "Username cannot be empty";
	AuthErrorStrings["INVALID_USERNAME"] = "The username should either be a string or one of the sign in types";
	AuthErrorStrings["EMPTY_PASSWORD"] = "Password cannot be empty";
	AuthErrorStrings["EMPTY_CODE"] = "Confirmation code cannot be empty";
	AuthErrorStrings["SIGN_UP_ERROR"] = "Error creating account";
	AuthErrorStrings["NO_MFA"] = "No valid MFA method provided";
	AuthErrorStrings["INVALID_MFA"] = "Invalid MFA type";
	AuthErrorStrings["EMPTY_CHALLENGE"] = "Challenge response cannot be empty";
	AuthErrorStrings["NO_USER_SESSION"] = "Failed to get the session because the user is empty";
	AuthErrorStrings["NETWORK_ERROR"] = "Network Error";
	AuthErrorStrings["DEVICE_CONFIG"] = "Device tracking has not been configured in this User Pool";
	AuthErrorStrings["AUTOSIGNIN_ERROR"] = "Please use your credentials to sign in";
	AuthErrorStrings["OAUTH_ERROR"] = "Couldn't finish OAuth flow, check your User Pool HostedUI settings";
})(AuthErrorStrings || (AuthErrorStrings = {}));
var AuthErrorCodes;
(function(AuthErrorCodes) {
	AuthErrorCodes["SignInException"] = "SignInException";
	AuthErrorCodes["OAuthSignInError"] = "OAuthSignInException";
})(AuthErrorCodes || (AuthErrorCodes = {}));
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/errors/AuthError.mjs
var AuthError = class AuthError extends AmplifyError {
	constructor(params) {
		super(params);
		this.constructor = AuthError;
		Object.setPrototypeOf(this, AuthError.prototype);
	}
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/errors/utils/assertValidationError.mjs
function assertValidationError(assertion, name) {
	const { message, recoverySuggestion } = validationErrorMap[name];
	if (!assertion) throw new AuthError({
		name,
		message,
		recoverySuggestion
	});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/parsers/regionParsers.mjs
function getRegionFromUserPoolId(userPoolId) {
	const region = userPoolId?.split("_")[0];
	if (!userPoolId || userPoolId.indexOf("_") < 0 || !region || typeof region !== "string") throw new AuthError({
		name: "InvalidUserPoolId",
		message: "Invalid user pool id provided."
	});
	return region;
}
function getRegionFromIdentityPoolId(identityPoolId) {
	if (!identityPoolId || !identityPoolId.includes(":")) throw new AuthError({
		name: "InvalidIdentityPoolIdException",
		message: "Invalid identity pool id provided.",
		recoverySuggestion: "Make sure a valid identityPoolId is given in the config."
	});
	return identityPoolId.split(":")[0];
}
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/serde/responseInfo.mjs
var parseMetadata = (response) => {
	const { headers, statusCode } = response;
	return {
		...isMetadataBearer(response) ? response.$metadata : {},
		httpStatusCode: statusCode,
		requestId: headers["x-amzn-requestid"] ?? headers["x-amzn-request-id"] ?? headers["x-amz-request-id"],
		extendedRequestId: headers["x-amz-id-2"],
		cfId: headers["x-amz-cf-id"]
	};
};
var isMetadataBearer = (response) => typeof response?.$metadata === "object";
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/serde/json.mjs
/**
* Utility functions for serializing and deserializing of JSON protocol in general(including: REST-JSON, JSON-RPC, etc.)
*/
/**
* Error parser for AWS JSON protocol.
*/
var parseJsonError = async (response) => {
	if (!response || response.statusCode < 300) return;
	const body = await parseJsonBody(response);
	const sanitizeErrorCode = (rawValue) => {
		const [cleanValue] = rawValue.toString().split(/[,:]+/);
		if (cleanValue.includes("#")) return cleanValue.split("#")[1];
		return cleanValue;
	};
	const code = sanitizeErrorCode(response.headers["x-amzn-errortype"] ?? body.code ?? body.__type ?? "UnknownError");
	const message = body.message ?? body.Message ?? "Unknown error";
	const error = new Error(message);
	return Object.assign(error, {
		name: code,
		$metadata: parseMetadata(response)
	});
};
/**
* Parse JSON response body to JavaScript object.
*/
var parseJsonBody = async (response) => {
	if (!response.body) throw new Error("Missing response payload");
	const output = await response.body.json();
	return Object.assign(output, { $metadata: parseMetadata(response) });
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/internal/composeServiceApi.mjs
/**
* Compose a service API handler that accepts input as defined shape and responds conforming to defined output shape.
* A service API handler is composed with:
* * A transfer handler
* * A serializer function
* * A deserializer function
* * A default config object
*
* The returned service API handler, when called, will trigger the following workflow:
* 1. When calling the service API handler function, the default config object is merged into the input config
* object to assign the default values of some omitted configs, resulting to a resolved config object.
* 2. The `endpointResolver` function from the default config object will be invoked with the resolved config object and
* API input object resulting to an endpoint instance.
* 3. The serializer function is invoked with API input object and the endpoint instance resulting to an HTTP request
* instance.
* 4. The HTTP request instance and the resolved config object is passed to the transfer handler function.
* 5. The transfer handler function resolves to an HTTP response instance(can be either successful or failed status code).
* 6. The deserializer function is invoked with the HTTP response instance resulting to the API output object, and
* return to the caller.
*
*
* @param transferHandler Async function for dispatching HTTP requests and returning HTTP response.
* @param serializer  Async function for converting object in defined input shape into HTTP request targeting a given
* 	endpoint.
* @param deserializer Async function for converting HTTP response into output object in defined output shape, or error
* 	shape.
* @param defaultConfig  object containing default options to be consumed by transfer handler, serializer and
*  deserializer.
* @returns a async service API handler function that accepts a config object and input object in defined shape, returns
* 	an output object in defined shape. It may also throw error instance in defined shape in deserializer. The config
*  object type is composed with options type of transferHandler, endpointResolver function as well as endpointResolver
*  function's input options type, region string. The config object property will be marked as optional if it's also
* 	defined in defaultConfig.
*
* @internal
*/
var composeServiceApi = (transferHandler, serializer, deserializer, defaultConfig) => {
	return async (config, input) => {
		const resolvedConfig = {
			...defaultConfig,
			...config
		};
		return deserializer(await transferHandler(await serializer(input, await resolvedConfig.endpointResolver(resolvedConfig, input)), { ...resolvedConfig }));
	};
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/middleware/retry/constants.mjs
var AMZ_SDK_INVOCATION_ID_HEADER = "amz-sdk-invocation-id";
var AMZ_SDK_REQUEST_HEADER = "amz-sdk-request";
var DEFAULT_MAX_DELAY_MS = 3e5;
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/middleware/retry/jitteredBackoff.mjs
var jitteredBackoff = (attempt) => {
	const delay = jitteredBackoff$1(DEFAULT_MAX_DELAY_MS)(attempt);
	return delay === false ? DEFAULT_MAX_DELAY_MS : delay;
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/middleware/retry/isClockSkewError.mjs
var CLOCK_SKEW_ERROR_CODES = [
	"AuthFailure",
	"InvalidSignatureException",
	"RequestExpired",
	"RequestInTheFuture",
	"RequestTimeTooSkewed",
	"SignatureDoesNotMatch",
	"BadRequestException"
];
/**
* Given an error code, returns true if it is related to a clock skew error.
*
* @param errorCode String representation of some error.
* @returns True if given error is present in `CLOCK_SKEW_ERROR_CODES`, false otherwise.
*
* @internal
*/
var isClockSkewError = (errorCode) => !!errorCode && CLOCK_SKEW_ERROR_CODES.includes(errorCode);
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/middleware/retry/defaultRetryDecider.mjs
/**
* Get retry decider function
* @param errorParser Function to load JavaScript error from HTTP response
*/
var getRetryDecider = (errorParser) => async (response, error) => {
	const parsedError = error ?? await errorParser(response) ?? void 0;
	const errorCode = parsedError?.code || parsedError?.name;
	const statusCode = response?.statusCode;
	return { retryable: isConnectionError(error) || isThrottlingError(statusCode, errorCode) || isClockSkewError(errorCode) || isServerSideError(statusCode, errorCode) };
};
var THROTTLING_ERROR_CODES = [
	"BandwidthLimitExceeded",
	"EC2ThrottledException",
	"LimitExceededException",
	"PriorRequestNotComplete",
	"ProvisionedThroughputExceededException",
	"RequestLimitExceeded",
	"RequestThrottled",
	"RequestThrottledException",
	"SlowDown",
	"ThrottledException",
	"Throttling",
	"ThrottlingException",
	"TooManyRequestsException"
];
var TIMEOUT_ERROR_CODES = [
	"TimeoutError",
	"RequestTimeout",
	"RequestTimeoutException"
];
var isThrottlingError = (statusCode, errorCode) => statusCode === 429 || !!errorCode && THROTTLING_ERROR_CODES.includes(errorCode);
var isConnectionError = (error) => [AmplifyErrorCode.NetworkError, "ERR_NETWORK"].includes(error?.name);
var isServerSideError = (statusCode, errorCode) => !!statusCode && [
	500,
	502,
	503,
	504
].includes(statusCode) || !!errorCode && TIMEOUT_ERROR_CODES.includes(errorCode);
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/middleware/retry/retryMiddleware.mjs
/**
* Middleware that executes the retry logic.
*/
var retryMiddlewareFactory = ({ maxAttempts = 3, retryDecider, computeDelay, abortSignal }) => {
	if (maxAttempts < 1) throw new Error("maxAttempts must be greater than 0");
	return (next, context) => async function retryMiddleware(request) {
		let error;
		let attemptsCount = context.attemptsCount ?? 0;
		let response;
		const handleTerminalErrorOrResponse = () => {
			if (response) {
				addOrIncrementMetadataAttempts(response, attemptsCount);
				return response;
			} else {
				addOrIncrementMetadataAttempts(error, attemptsCount);
				throw error;
			}
		};
		while (!abortSignal?.aborted && attemptsCount < maxAttempts) {
			try {
				response = await next(request);
				error = void 0;
			} catch (e) {
				error = e;
				response = void 0;
			}
			attemptsCount = (context.attemptsCount ?? 0) > attemptsCount ? context.attemptsCount ?? 0 : attemptsCount + 1;
			context.attemptsCount = attemptsCount;
			const { isCredentialsExpiredError, retryable } = await retryDecider(response, error, context);
			if (retryable) {
				context.isCredentialsExpired = !!isCredentialsExpiredError;
				if (!abortSignal?.aborted && attemptsCount < maxAttempts) await cancellableSleep(computeDelay(attemptsCount), abortSignal);
				continue;
			} else return handleTerminalErrorOrResponse();
		}
		if (abortSignal?.aborted) throw new Error("Request aborted.");
		else return handleTerminalErrorOrResponse();
	};
};
var cancellableSleep = (timeoutMs, abortSignal) => {
	if (abortSignal?.aborted) return Promise.resolve();
	let timeoutId;
	let sleepPromiseResolveFn;
	const sleepPromise = new Promise((resolve) => {
		sleepPromiseResolveFn = resolve;
		timeoutId = setTimeout(resolve, timeoutMs);
	});
	abortSignal?.addEventListener("abort", function cancelSleep(_) {
		clearTimeout(timeoutId);
		abortSignal?.removeEventListener("abort", cancelSleep);
		sleepPromiseResolveFn();
	});
	return sleepPromise;
};
var addOrIncrementMetadataAttempts = (nextHandlerOutput, attempts) => {
	if (Object.prototype.toString.call(nextHandlerOutput) !== "[object Object]") return;
	nextHandlerOutput.$metadata = {
		...nextHandlerOutput.$metadata ?? {},
		attempts
	};
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/middleware/retry/amzSdkInvocationIdHeaderMiddleware.mjs
/**
* Middleware injects a UUID string to `amz-sdk-invocation-id` header.
* if the header is not set already. This header is helpful to provide
* observability to group the requests caused by automatic retry.
*
* This middleware is standalone because of extra UUID dependency, we will
* NOT use this middleware for API categories.
*
* Ref: https://sdk.amazonaws.com/kotlin/api/smithy-kotlin/api/1.0.9/http-client/aws.smithy.kotlin.runtime.http.operation/-http-operation-context/-sdk-invocation-id.html
*/
var amzSdkInvocationIdHeaderMiddlewareFactory = () => (next) => {
	return async function amzSdkInvocationIdHeaderMiddleware(request) {
		if (!request.headers["amz-sdk-invocation-id"]) request.headers[AMZ_SDK_INVOCATION_ID_HEADER] = amplifyUuid();
		return next(request);
	};
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/middleware/retry/amzSdkRequestHeaderMiddleware.mjs
/**
* Middleware injects `amz-sdk-request` header to indicate the retry state at the time an HTTP request is made.
* This middleware should co-exist with retryMiddleware as it relies on the retryAttempts value in middleware context
* set by the retry middleware.
*
* Example header: `amz-sdk-request: attempt=1; max=3`.
*
* This middleware is standalone because of extra headers may conflict with custom endpoint settings(e.g. CORS), we will
* NOT use this middleware for API categories.
*/
var amzSdkRequestHeaderMiddlewareFactory = ({ maxAttempts = 3 }) => (next, context) => {
	return async function amzSdkRequestHeaderMiddleware(request) {
		const attemptsCount = context.attemptsCount ?? 0;
		request.headers[AMZ_SDK_REQUEST_HEADER] = `attempt=${attemptsCount + 1}; max=${maxAttempts}`;
		return next(request);
	};
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/middleware/userAgent/middleware.mjs
/**
* Middleware injects user agent string to specified header(default to 'x-amz-user-agent'),
* if the header is not set already.
*
* TODO: incorporate new user agent design
*/
var userAgentMiddlewareFactory = ({ userAgentHeader = "x-amz-user-agent", userAgentValue = "" }) => (next) => {
	return async function userAgentMiddleware(request) {
		if (userAgentValue.trim().length === 0) return await next(request);
		else {
			const headerName = userAgentHeader.toLowerCase();
			request.headers[headerName] = request.headers[headerName] ? `${request.headers[headerName]} ${userAgentValue}` : userAgentValue;
			return await next(request);
		}
	};
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/internal/composeTransferHandler.mjs
/**
* Compose a transfer handler with a core transfer handler and a list of middleware.
* @param coreHandler Core transfer handler
* @param middleware	List of middleware
* @returns A transfer handler whose option type is the union of the core
* 	transfer handler's option type and the middleware's option type.
* @internal
*/
var composeTransferHandler = (coreHandler, middleware) => (request, options) => {
	const context = {};
	let composedHandler = (composeHandlerRequest) => coreHandler(composeHandlerRequest, options);
	for (let i = middleware.length - 1; i >= 0; i--) {
		const m = middleware[i];
		composedHandler = m(options)(composedHandler, context);
	}
	return composedHandler(request);
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/utils/memoization.mjs
/**
* Cache the payload of a response body. It allows multiple calls to the body,
* for example, when reading the body in both retry decider and error deserializer.
* Caching body is allowed here because we call the body accessor(blob(), json(),
* etc.) when body is small or streaming implementation is not available(RN).
*
* @internal
*/
var withMemoization = (payloadAccessor) => {
	let cached;
	return () => {
		if (!cached) cached = payloadAccessor();
		return cached;
	};
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/handlers/fetch.mjs
var shouldSendBody = (method) => !["HEAD", "GET"].includes(method.toUpperCase());
var fetchTransferHandler = async ({ url, method, headers, body }, { abortSignal, cache, withCrossDomainCredentials }) => {
	let resp;
	try {
		resp = await fetch(url, {
			method,
			headers,
			body: shouldSendBody(method) ? body : void 0,
			signal: abortSignal,
			cache,
			credentials: withCrossDomainCredentials ? "include" : "same-origin"
		});
	} catch (e) {
		if (e instanceof TypeError) throw new AmplifyError({
			name: AmplifyErrorCode.NetworkError,
			message: "A network error has occurred.",
			underlyingError: e
		});
		throw e;
	}
	const responseHeaders = {};
	resp.headers?.forEach((value, key) => {
		responseHeaders[key.toLowerCase()] = value;
	});
	const httpResponse = {
		statusCode: resp.status,
		headers: responseHeaders,
		body: null
	};
	const bodyWithMixin = Object.assign(resp.body ?? {}, {
		text: withMemoization(() => resp.text()),
		blob: withMemoization(() => resp.blob()),
		json: withMemoization(() => resp.json())
	});
	return {
		...httpResponse,
		body: bodyWithMixin
	};
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/handlers/aws/unauthenticated.mjs
var unauthenticatedHandler = composeTransferHandler(fetchTransferHandler, [
	userAgentMiddlewareFactory,
	amzSdkInvocationIdHeaderMiddlewareFactory,
	retryMiddlewareFactory,
	amzSdkRequestHeaderMiddlewareFactory
]);
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/endpoints/partitions.mjs
/**
* Default partition for AWS services. This is used when the region is not provided or the region is not recognized.
*
* @internal
*/
var defaultPartition = {
	id: "aws",
	outputs: { dnsSuffix: "amazonaws.com" },
	regionRegex: "^(us|eu|ap|sa|ca|me|af)\\-\\w+\\-\\d+$",
	regions: ["aws-global"]
};
/**
* This data is adapted from the partition file from AWS SDK shared utilities but remove some contents for bundle size
* concern. Information removed are `dualStackDnsSuffix`, `supportDualStack`, `supportFIPS`, restricted partitions, and
* list of regions for each partition other than global regions.
*
* * Ref: https://docs.aws.amazon.com/general/latest/gr/rande.html#regional-endpoints
* * Ref: https://github.com/aws/aws-sdk-js-v3/blob/0201baef03c2379f1f6f7150b9d401d4b230d488/packages/util-endpoints/src/lib/aws/partitions.json#L1
*
* @internal
*/
var partitionsInfo = { partitions: [defaultPartition, {
	id: "aws-cn",
	outputs: { dnsSuffix: "amazonaws.com.cn" },
	regionRegex: "^cn\\-\\w+\\-\\d+$",
	regions: ["aws-cn-global"]
}] };
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/clients/endpoints/getDnsSuffix.mjs
/**
* Get the AWS Services endpoint URL's DNS suffix for a given region. A typical AWS regional service endpoint URL will
* follow this pattern: {endpointPrefix}.{region}.{dnsSuffix}. For example, the endpoint URL for Cognito Identity in
* us-east-1 will be cognito-identity.us-east-1.amazonaws.com. Here the DnsSuffix is `amazonaws.com`.
*
* @param region
* @returns The DNS suffix
*
* @internal
*/
var getDnsSuffix = (region) => {
	const { partitions } = partitionsInfo;
	for (const { regions, outputs, regionRegex } of partitions) {
		const regex = new RegExp(regionRegex);
		if (regions.includes(region) || regex.test(region)) return outputs.dnsSuffix;
	}
	return defaultPartition.outputs.dnsSuffix;
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Cache/constants.mjs
/**
* Default cache config
*/
var defaultConfig = {
	keyPrefix: "aws-amplify-cache",
	capacityInBytes: 1048576,
	itemMaxSize: 21e4,
	defaultTTL: 2592e5,
	defaultPriority: 5,
	warningThreshold: .8
};
var currentSizeKey = "CurSize";
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Cache/utils/cacheHelpers.mjs
/**
* return the byte size of the string
* @param str
*/
function getByteLength(str) {
	let ret = 0;
	ret = str.length;
	for (let i = str.length; i >= 0; i -= 1) {
		const charCode = str.charCodeAt(i);
		if (charCode > 127 && charCode <= 2047) ret += 1;
		else if (charCode > 2047 && charCode <= 65535) ret += 2;
		if (charCode >= 56320 && charCode <= 57343) i -= 1;
	}
	return ret;
}
/**
* get current time
*/
function getCurrentTime() {
	return (/* @__PURE__ */ new Date()).getTime();
}
var getCurrentSizeKey = (keyPrefix) => `${keyPrefix}${currentSizeKey}`;
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Cache/utils/errorHelpers.mjs
var CacheErrorCode;
(function(CacheErrorCode) {
	CacheErrorCode["NoCacheItem"] = "NoCacheItem";
	CacheErrorCode["NullNextNode"] = "NullNextNode";
	CacheErrorCode["NullPreviousNode"] = "NullPreviousNode";
})(CacheErrorCode || (CacheErrorCode = {}));
var assert$2 = createAssertionFunction({
	[CacheErrorCode.NoCacheItem]: { message: "Item not found in the cache storage." },
	[CacheErrorCode.NullNextNode]: { message: "Next node is null." },
	[CacheErrorCode.NullPreviousNode]: { message: "Previous node is null." }
});
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Cache/StorageCacheCommon.mjs
var logger$4 = new ConsoleLogger("StorageCache");
/**
* Initialization of the cache
*
*/
var StorageCacheCommon = class {
	/**
	* Initialize the cache
	*
	* @param config - Custom configuration for this instance.
	*/
	constructor({ config, keyValueStorage }) {
		this.config = {
			...defaultConfig,
			...config
		};
		this.keyValueStorage = keyValueStorage;
		this.sanitizeConfig();
	}
	getModuleName() {
		return "Cache";
	}
	/**
	* Set custom configuration for the cache instance.
	*
	* @param config - customized configuration (without keyPrefix, which can't be changed)
	*
	* @return - the current configuration
	*/
	configure(config) {
		if (config) {
			if (config.keyPrefix) logger$4.warn("keyPrefix can not be re-configured on an existing Cache instance.");
			this.config = {
				...this.config,
				...config
			};
		}
		this.sanitizeConfig();
		return this.config;
	}
	/**
	* return the current size of the cache
	* @return {Promise}
	*/
	async getCurrentCacheSize() {
		let size = await this.getStorage().getItem(getCurrentSizeKey(this.config.keyPrefix));
		if (!size) {
			await this.getStorage().setItem(getCurrentSizeKey(this.config.keyPrefix), "0");
			size = "0";
		}
		return Number(size);
	}
	/**
	* Set item into cache. You can put number, string, boolean or object.
	* The cache will first check whether has the same key.
	* If it has, it will delete the old item and then put the new item in
	* The cache will pop out items if it is full
	* You can specify the cache item options. The cache will abort and output a warning:
	* If the key is invalid
	* If the size of the item exceeds itemMaxSize.
	* If the value is undefined
	* If incorrect cache item configuration
	* If error happened with browser storage
	*
	* @param {String} key - the key of the item
	* @param {Object} value - the value of the item
	* @param {Object} [options] - optional, the specified meta-data
	*
	* @return {Promise}
	*/
	async setItem(key, value, options) {
		logger$4.debug(`Set item: key is ${key}, value is ${value} with options: ${options}`);
		if (!key || key === "CurSize") {
			logger$4.warn(`Invalid key: should not be empty or reserved key: '${currentSizeKey}'`);
			return;
		}
		if (typeof value === "undefined") {
			logger$4.warn(`The value of item should not be undefined!`);
			return;
		}
		const cacheItemOptions = {
			priority: options?.priority !== void 0 ? options.priority : this.config.defaultPriority,
			expires: options?.expires !== void 0 ? options.expires : this.config.defaultTTL + getCurrentTime()
		};
		if (cacheItemOptions.priority < 1 || cacheItemOptions.priority > 5) {
			logger$4.warn(`Invalid parameter: priority due to out or range. It should be within 1 and 5.`);
			return;
		}
		const prefixedKey = `${this.config.keyPrefix}${key}`;
		const item = this.fillCacheItem(prefixedKey, value, cacheItemOptions);
		if (item.byteSize > this.config.itemMaxSize) {
			logger$4.warn(`Item with key: ${key} you are trying to put into is too big!`);
			return;
		}
		try {
			const val = await this.getStorage().getItem(prefixedKey);
			if (val) await this.removeCacheItem(prefixedKey, JSON.parse(val).byteSize);
			if (await this.isCacheFull(item.byteSize)) {
				const validKeys = await this.clearInvalidAndGetRemainingKeys();
				if (await this.isCacheFull(item.byteSize)) {
					const sizeToPop = await this.sizeToPop(item.byteSize);
					await this.popOutItems(validKeys, sizeToPop);
				}
			}
			return this.setCacheItem(prefixedKey, item);
		} catch (e) {
			logger$4.warn(`setItem failed! ${e}`);
		}
	}
	/**
	* Get item from cache. It will return null if item doesn’t exist or it has been expired.
	* If you specified callback function in the options,
	* then the function will be executed if no such item in the cache
	* and finally put the return value into cache.
	* Please make sure the callback function will return the value you want to put into the cache.
	* The cache will abort output a warning:
	* If the key is invalid
	* If error happened with AsyncStorage
	*
	* @param {String} key - the key of the item
	* @param {Object} [options] - the options of callback function
	*
	* @return {Promise} - return a promise resolves to be the value of the item
	*/
	async getItem(key, options) {
		logger$4.debug(`Get item: key is ${key} with options ${options}`);
		let cached;
		if (!key || key === "CurSize") {
			logger$4.warn(`Invalid key: should not be empty or reserved key: '${currentSizeKey}'`);
			return null;
		}
		const prefixedKey = `${this.config.keyPrefix}${key}`;
		try {
			cached = await this.getStorage().getItem(prefixedKey);
			if (cached != null) {
				if (await this.isExpired(prefixedKey)) await this.removeCacheItem(prefixedKey, JSON.parse(cached).byteSize);
				else return (await this.updateVisitedTime(JSON.parse(cached), prefixedKey)).data;
			}
			if (options?.callback) {
				const val = options.callback();
				if (val !== null) await this.setItem(key, val, options);
				return val;
			}
			return null;
		} catch (e) {
			logger$4.warn(`getItem failed! ${e}`);
			return null;
		}
	}
	/**
	* remove item from the cache
	* The cache will abort output a warning:
	* If error happened with AsyncStorage
	* @param {String} key - the key of the item
	* @return {Promise}
	*/
	async removeItem(key) {
		logger$4.debug(`Remove item: key is ${key}`);
		if (!key || key === "CurSize") {
			logger$4.warn(`Invalid key: should not be empty or reserved key: '${currentSizeKey}'`);
			return;
		}
		const prefixedKey = `${this.config.keyPrefix}${key}`;
		try {
			const val = await this.getStorage().getItem(prefixedKey);
			if (val) await this.removeCacheItem(prefixedKey, JSON.parse(val).byteSize);
		} catch (e) {
			logger$4.warn(`removeItem failed! ${e}`);
		}
	}
	/**
	* Return all the keys owned by this cache.
	* Will return an empty array if error occurred.
	*
	* @return {Promise}
	*/
	async getAllKeys() {
		try {
			return await this.getAllCacheKeys();
		} catch (e) {
			logger$4.warn(`getAllkeys failed! ${e}`);
			return [];
		}
	}
	getStorage() {
		return this.keyValueStorage;
	}
	/**
	* check whether item is expired
	*
	* @param key - the key of the item
	*
	* @return true if the item is expired.
	*/
	async isExpired(key) {
		const text = await this.getStorage().getItem(key);
		assert$2(text !== null, CacheErrorCode.NoCacheItem, `Key: ${key}`);
		const item = JSON.parse(text);
		if (getCurrentTime() >= item.expires) return true;
		return false;
	}
	/**
	* delete item from cache
	*
	* @param prefixedKey - the key of the item
	* @param size - optional, the byte size of the item
	*/
	async removeCacheItem(prefixedKey, size) {
		const item = await this.getStorage().getItem(prefixedKey);
		assert$2(item !== null, CacheErrorCode.NoCacheItem, `Key: ${prefixedKey}`);
		const itemSize = size ?? JSON.parse(item).byteSize;
		await this.decreaseCurrentSizeInBytes(itemSize);
		try {
			await this.getStorage().removeItem(prefixedKey);
		} catch (removeItemError) {
			await this.increaseCurrentSizeInBytes(itemSize);
			logger$4.error(`Failed to remove item: ${removeItemError}`);
		}
	}
	/**
	* produce a JSON object with meta-data and data value
	* @param value - the value of the item
	* @param options - optional, the specified meta-data
	*
	* @return - the item which has the meta-data and the value
	*/
	fillCacheItem(key, value, options) {
		const item = {
			key,
			data: value,
			timestamp: getCurrentTime(),
			visitedTime: getCurrentTime(),
			priority: options.priority ?? 0,
			expires: options.expires ?? 0,
			type: typeof value,
			byteSize: 0
		};
		item.byteSize = getByteLength(JSON.stringify(item));
		item.byteSize = getByteLength(JSON.stringify(item));
		return item;
	}
	sanitizeConfig() {
		if (this.config.itemMaxSize > this.config.capacityInBytes) {
			logger$4.error("Invalid parameter: itemMaxSize. It should be smaller than capacityInBytes. Setting back to default.");
			this.config.itemMaxSize = defaultConfig.itemMaxSize;
		}
		if (this.config.defaultPriority > 5 || this.config.defaultPriority < 1) {
			logger$4.error("Invalid parameter: defaultPriority. It should be between 1 and 5. Setting back to default.");
			this.config.defaultPriority = defaultConfig.defaultPriority;
		}
		if (Number(this.config.warningThreshold) > 1 || Number(this.config.warningThreshold) < 0) {
			logger$4.error("Invalid parameter: warningThreshold. It should be between 0 and 1. Setting back to default.");
			this.config.warningThreshold = defaultConfig.warningThreshold;
		}
		if (this.config.capacityInBytes > 5242880) {
			logger$4.error("Cache Capacity should be less than 5MB. Setting back to default. Setting back to default.");
			this.config.capacityInBytes = defaultConfig.capacityInBytes;
		}
	}
	/**
	* increase current size of the cache
	*
	* @param amount - the amount of the cache szie which need to be increased
	*/
	async increaseCurrentSizeInBytes(amount) {
		const size = await this.getCurrentCacheSize();
		await this.getStorage().setItem(getCurrentSizeKey(this.config.keyPrefix), (size + amount).toString());
	}
	/**
	* decrease current size of the cache
	*
	* @param amount - the amount of the cache size which needs to be decreased
	*/
	async decreaseCurrentSizeInBytes(amount) {
		const size = await this.getCurrentCacheSize();
		await this.getStorage().setItem(getCurrentSizeKey(this.config.keyPrefix), (size - amount).toString());
	}
	/**
	* update the visited time if item has been visited
	*
	* @param item - the item which need to be updated
	* @param prefixedKey - the key of the item
	*
	* @return the updated item
	*/
	async updateVisitedTime(item, prefixedKey) {
		item.visitedTime = getCurrentTime();
		await this.getStorage().setItem(prefixedKey, JSON.stringify(item));
		return item;
	}
	/**
	* put item into cache
	*
	* @param prefixedKey - the key of the item
	* @param itemData - the value of the item
	* @param itemSizeInBytes - the byte size of the item
	*/
	async setCacheItem(prefixedKey, item) {
		await this.increaseCurrentSizeInBytes(item.byteSize);
		try {
			await this.getStorage().setItem(prefixedKey, JSON.stringify(item));
		} catch (setItemErr) {
			await this.decreaseCurrentSizeInBytes(item.byteSize);
			logger$4.error(`Failed to set item ${setItemErr}`);
		}
	}
	/**
	* total space needed when poping out items
	*
	* @param itemSize
	*
	* @return total space needed
	*/
	async sizeToPop(itemSize) {
		const spaceItemNeed = await this.getCurrentCacheSize() + itemSize - this.config.capacityInBytes;
		const cacheThresholdSpace = (1 - this.config.warningThreshold) * this.config.capacityInBytes;
		return spaceItemNeed > cacheThresholdSpace ? spaceItemNeed : cacheThresholdSpace;
	}
	/**
	* see whether cache is full
	*
	* @param itemSize
	*
	* @return true if cache is full
	*/
	async isCacheFull(itemSize) {
		return itemSize + await this.getCurrentCacheSize() > this.config.capacityInBytes;
	}
	/**
	* get all the items we have, sort them by their priority,
	* if priority is same, sort them by their last visited time
	* pop out items from the low priority (5 is the lowest)
	* @private
	* @param keys - all the keys in this cache
	* @param sizeToPop - the total size of the items which needed to be poped out
	*/
	async popOutItems(keys, sizeToPop) {
		const items = [];
		let remainedSize = sizeToPop;
		for (const key of keys) {
			const val = await this.getStorage().getItem(key);
			if (val != null) {
				const item = JSON.parse(val);
				items.push(item);
			}
		}
		items.sort((a, b) => {
			if (a.priority > b.priority) return -1;
			else if (a.priority < b.priority) return 1;
			else if (a.visitedTime < b.visitedTime) return -1;
			else return 1;
		});
		for (const item of items) {
			await this.removeCacheItem(item.key, item.byteSize);
			remainedSize -= item.byteSize;
			if (remainedSize <= 0) return;
		}
	}
	/**
	* Scan the storage and combine the following operations for efficiency
	*   1. Clear out all expired keys owned by this cache, not including the size key.
	*   2. Return the remaining keys.
	*
	* @return The remaining valid keys
	*/
	async clearInvalidAndGetRemainingKeys() {
		const remainingKeys = [];
		const keys = await this.getAllCacheKeys({ omitSizeKey: true });
		for (const key of keys) if (await this.isExpired(key)) await this.removeCacheItem(key);
		else remainingKeys.push(key);
		return remainingKeys;
	}
	/**
	* clear the entire cache
	* The cache will abort and output a warning if error occurs
	* @return {Promise}
	*/
	async clear() {
		logger$4.debug(`Clear Cache`);
		try {
			const keys = await this.getAllKeys();
			for (const key of keys) {
				const prefixedKey = `${this.config.keyPrefix}${key}`;
				await this.getStorage().removeItem(prefixedKey);
			}
		} catch (e) {
			logger$4.warn(`clear failed! ${e}`);
		}
	}
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/Cache/StorageCache.mjs
var logger$3 = new ConsoleLogger("StorageCache");
new class StorageCache extends StorageCacheCommon {
	/**
	* initialize the cache
	* @param config - the configuration of the cache
	*/
	constructor(config) {
		const storage = getLocalStorageWithFallback();
		super({
			config,
			keyValueStorage: new KeyValueStorage(storage)
		});
		this.storage = storage;
		this.getItem = this.getItem.bind(this);
		this.setItem = this.setItem.bind(this);
		this.removeItem = this.removeItem.bind(this);
	}
	async getAllCacheKeys(options) {
		const { omitSizeKey } = options ?? {};
		const keys = [];
		for (let i = 0; i < this.storage.length; i++) {
			const key = this.storage.key(i);
			if (omitSizeKey && key === getCurrentSizeKey(this.config.keyPrefix)) continue;
			if (key?.startsWith(this.config.keyPrefix)) keys.push(key.substring(this.config.keyPrefix.length));
		}
		return keys;
	}
	/**
	* Return a new instance of cache with customized configuration.
	* @param {Object} config - the customized configuration
	* @return {Object} - the new instance of Cache
	*/
	createInstance(config) {
		if (!config.keyPrefix || config.keyPrefix === defaultConfig.keyPrefix) {
			logger$3.error("invalid keyPrefix, setting keyPrefix with timeStamp");
			config.keyPrefix = getCurrentTime.toString();
		}
		return new StorageCache(config);
	}
}();
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/I18n/I18n.mjs
var logger$2 = new ConsoleLogger("I18n");
/**
* Language translation utility.
*/
var I18n$1 = class I18n {
	constructor() {
		/**
		* @private
		*/
		this._options = null;
		/**
		* @private
		*/
		this._lang = null;
		/**
		* @private
		*/
		this._dict = {};
	}
	/**
	* Sets the default language from the configuration when required.
	*/
	setDefaultLanguage() {
		if (!this._lang && typeof window !== "undefined" && window && window.navigator) this._lang = window.navigator.language;
		logger$2.debug(this._lang);
	}
	/**
	* @method
	* Explicitly setting language
	* @param {String} lang
	*/
	setLanguage(lang) {
		this._lang = lang;
	}
	/**
	* @method
	* Get value
	* @param {String} key
	* @param {String} defVal - Default value
	*/
	get(key, defVal = void 0) {
		this.setDefaultLanguage();
		if (!this._lang) return typeof defVal !== "undefined" ? defVal : key;
		const lang = this._lang;
		let val = this.getByLanguage(key, lang);
		if (val) return val;
		if (lang.indexOf("-") > 0) val = this.getByLanguage(key, lang.split("-")[0]);
		if (val) return val;
		return typeof defVal !== "undefined" ? defVal : key;
	}
	/**
	* @method
	* Get value according to specified language
	* @param {String} key
	* @param {String} language - Specified langurage to be used
	* @param {String} defVal - Default value
	*/
	getByLanguage(key, language, defVal = null) {
		if (!language) return defVal;
		const langDict = this._dict[language];
		if (!langDict) return defVal;
		return langDict[key];
	}
	/**
	* @method
	* Add vocabularies for one language
	* @param {String} language - Language of the dictionary
	* @param {Object} vocabularies - Object that has key-value as dictionary entry
	*/
	putVocabulariesForLanguage(language, vocabularies) {
		let langDict = this._dict[language];
		if (!langDict) langDict = this._dict[language] = {};
		this._dict[language] = {
			...langDict,
			...vocabularies
		};
	}
	/**
	* @method
	* Add vocabularies for one language
	* @param {Object} vocabularies - Object that has language as key,
	*                                vocabularies of each language as value
	*/
	putVocabularies(vocabularies) {
		Object.keys(vocabularies).forEach((key) => {
			this.putVocabulariesForLanguage(key, vocabularies[key]);
		});
	}
};
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/I18n/errorHelpers.mjs
var I18nErrorCode;
(function(I18nErrorCode) {
	I18nErrorCode["NotConfigured"] = "NotConfigured";
})(I18nErrorCode || (I18nErrorCode = {}));
var assert$1 = createAssertionFunction({ [I18nErrorCode.NotConfigured]: { message: "i18n is not configured." } });
//#endregion
//#region node_modules/@aws-amplify/core/dist/esm/I18n/index.mjs
var logger$1 = new ConsoleLogger("I18n");
var _config = { language: null };
var _i18n = null;
(class I18n {
	/**
	* @static
	* @method
	* Configure I18n part
	* @param {Object} config - Configuration of the I18n
	*/
	static configure(config) {
		logger$1.debug("configure I18n");
		if (!config) return _config;
		_config = Object.assign({}, _config, config.I18n || config);
		I18n.createInstance();
		return _config;
	}
	static getModuleName() {
		return "I18n";
	}
	/**
	* @static
	* @method
	* Create an instance of I18n for the library
	*/
	static createInstance() {
		logger$1.debug("create I18n instance");
		if (_i18n) return;
		_i18n = new I18n$1();
	}
	/**
	* @static @method
	* Explicitly setting language
	* @param {String} lang
	*/
	static setLanguage(lang) {
		I18n.checkConfig();
		assert$1(!!_i18n, I18nErrorCode.NotConfigured);
		_i18n.setLanguage(lang);
	}
	/**
	* @static @method
	* Get value
	* @param {String} key
	* @param {String} defVal - Default value
	*/
	static get(key, defVal) {
		if (!I18n.checkConfig()) return typeof defVal === "undefined" ? key : defVal;
		assert$1(!!_i18n, I18nErrorCode.NotConfigured);
		return _i18n.get(key, defVal);
	}
	/**
	* @static
	* @method
	* Add vocabularies for one language
	* @param {String} language - Language of the dictionary
	* @param {Object} vocabularies - Object that has key-value as dictionary entry
	*/
	static putVocabulariesForLanguage(language, vocabularies) {
		I18n.checkConfig();
		assert$1(!!_i18n, I18nErrorCode.NotConfigured);
		_i18n.putVocabulariesForLanguage(language, vocabularies);
	}
	/**
	* @static
	* @method
	* Add vocabularies for one language
	* @param {Object} vocabularies - Object that has language as key,
	*                                vocabularies of each language as value
	*/
	static putVocabularies(vocabularies) {
		I18n.checkConfig();
		assert$1(!!_i18n, I18nErrorCode.NotConfigured);
		_i18n.putVocabularies(vocabularies);
	}
	static checkConfig() {
		if (!_i18n) I18n.createInstance();
		return true;
	}
}).createInstance();
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/types/errors.mjs
var AssociateSoftwareTokenException;
(function(AssociateSoftwareTokenException) {
	AssociateSoftwareTokenException["ConcurrentModificationException"] = "ConcurrentModificationException";
	AssociateSoftwareTokenException["ForbiddenException"] = "ForbiddenException";
	AssociateSoftwareTokenException["InternalErrorException"] = "InternalErrorException";
	AssociateSoftwareTokenException["InvalidParameterException"] = "InvalidParameterException";
	AssociateSoftwareTokenException["NotAuthorizedException"] = "NotAuthorizedException";
	AssociateSoftwareTokenException["ResourceNotFoundException"] = "ResourceNotFoundException";
	AssociateSoftwareTokenException["SoftwareTokenMFANotFoundException"] = "SoftwareTokenMFANotFoundException";
})(AssociateSoftwareTokenException || (AssociateSoftwareTokenException = {}));
var ChangePasswordException;
(function(ChangePasswordException) {
	ChangePasswordException["ForbiddenException"] = "ForbiddenException";
	ChangePasswordException["InternalErrorException"] = "InternalErrorException";
	ChangePasswordException["InvalidParameterException"] = "InvalidParameterException";
	ChangePasswordException["InvalidPasswordException"] = "InvalidPasswordException";
	ChangePasswordException["LimitExceededException"] = "LimitExceededException";
	ChangePasswordException["NotAuthorizedException"] = "NotAuthorizedException";
	ChangePasswordException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	ChangePasswordException["ResourceNotFoundException"] = "ResourceNotFoundException";
	ChangePasswordException["TooManyRequestsException"] = "TooManyRequestsException";
	ChangePasswordException["UserNotConfirmedException"] = "UserNotConfirmedException";
	ChangePasswordException["UserNotFoundException"] = "UserNotFoundException";
})(ChangePasswordException || (ChangePasswordException = {}));
var ConfirmDeviceException;
(function(ConfirmDeviceException) {
	ConfirmDeviceException["ForbiddenException"] = "ForbiddenException";
	ConfirmDeviceException["InternalErrorException"] = "InternalErrorException";
	ConfirmDeviceException["InvalidLambdaResponseException"] = "InvalidLambdaResponseException";
	ConfirmDeviceException["InvalidParameterException"] = "InvalidParameterException";
	ConfirmDeviceException["InvalidPasswordException"] = "InvalidPasswordException";
	ConfirmDeviceException["InvalidUserPoolConfigurationException"] = "InvalidUserPoolConfigurationException";
	ConfirmDeviceException["NotAuthorizedException"] = "NotAuthorizedException";
	ConfirmDeviceException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	ConfirmDeviceException["ResourceNotFoundException"] = "ResourceNotFoundException";
	ConfirmDeviceException["TooManyRequestsException"] = "TooManyRequestsException";
	ConfirmDeviceException["UsernameExistsException"] = "UsernameExistsException";
	ConfirmDeviceException["UserNotConfirmedException"] = "UserNotConfirmedException";
	ConfirmDeviceException["UserNotFoundException"] = "UserNotFoundException";
})(ConfirmDeviceException || (ConfirmDeviceException = {}));
var ConfirmForgotPasswordException;
(function(ConfirmForgotPasswordException) {
	ConfirmForgotPasswordException["CodeMismatchException"] = "CodeMismatchException";
	ConfirmForgotPasswordException["ExpiredCodeException"] = "ExpiredCodeException";
	ConfirmForgotPasswordException["ForbiddenException"] = "ForbiddenException";
	ConfirmForgotPasswordException["InternalErrorException"] = "InternalErrorException";
	ConfirmForgotPasswordException["InvalidLambdaResponseException"] = "InvalidLambdaResponseException";
	ConfirmForgotPasswordException["InvalidParameterException"] = "InvalidParameterException";
	ConfirmForgotPasswordException["InvalidPasswordException"] = "InvalidPasswordException";
	ConfirmForgotPasswordException["LimitExceededException"] = "LimitExceededException";
	ConfirmForgotPasswordException["NotAuthorizedException"] = "NotAuthorizedException";
	ConfirmForgotPasswordException["ResourceNotFoundException"] = "ResourceNotFoundException";
	ConfirmForgotPasswordException["TooManyFailedAttemptsException"] = "TooManyFailedAttemptsException";
	ConfirmForgotPasswordException["TooManyRequestsException"] = "TooManyRequestsException";
	ConfirmForgotPasswordException["UnexpectedLambdaException"] = "UnexpectedLambdaException";
	ConfirmForgotPasswordException["UserLambdaValidationException"] = "UserLambdaValidationException";
	ConfirmForgotPasswordException["UserNotConfirmedException"] = "UserNotConfirmedException";
	ConfirmForgotPasswordException["UserNotFoundException"] = "UserNotFoundException";
})(ConfirmForgotPasswordException || (ConfirmForgotPasswordException = {}));
var ConfirmSignUpException;
(function(ConfirmSignUpException) {
	ConfirmSignUpException["AliasExistsException"] = "AliasExistsException";
	ConfirmSignUpException["CodeMismatchException"] = "CodeMismatchException";
	ConfirmSignUpException["ExpiredCodeException"] = "ExpiredCodeException";
	ConfirmSignUpException["ForbiddenException"] = "ForbiddenException";
	ConfirmSignUpException["InternalErrorException"] = "InternalErrorException";
	ConfirmSignUpException["InvalidLambdaResponseException"] = "InvalidLambdaResponseException";
	ConfirmSignUpException["InvalidParameterException"] = "InvalidParameterException";
	ConfirmSignUpException["LimitExceededException"] = "LimitExceededException";
	ConfirmSignUpException["NotAuthorizedException"] = "NotAuthorizedException";
	ConfirmSignUpException["ResourceNotFoundException"] = "ResourceNotFoundException";
	ConfirmSignUpException["TooManyFailedAttemptsException"] = "TooManyFailedAttemptsException";
	ConfirmSignUpException["TooManyRequestsException"] = "TooManyRequestsException";
	ConfirmSignUpException["UnexpectedLambdaException"] = "UnexpectedLambdaException";
	ConfirmSignUpException["UserLambdaValidationException"] = "UserLambdaValidationException";
	ConfirmSignUpException["UserNotFoundException"] = "UserNotFoundException";
})(ConfirmSignUpException || (ConfirmSignUpException = {}));
var DeleteUserAttributesException;
(function(DeleteUserAttributesException) {
	DeleteUserAttributesException["ForbiddenException"] = "ForbiddenException";
	DeleteUserAttributesException["InternalErrorException"] = "InternalErrorException";
	DeleteUserAttributesException["InvalidParameterException"] = "InvalidParameterException";
	DeleteUserAttributesException["NotAuthorizedException"] = "NotAuthorizedException";
	DeleteUserAttributesException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	DeleteUserAttributesException["ResourceNotFoundException"] = "ResourceNotFoundException";
	DeleteUserAttributesException["TooManyRequestsException"] = "TooManyRequestsException";
	DeleteUserAttributesException["UserNotConfirmedException"] = "UserNotConfirmedException";
	DeleteUserAttributesException["UserNotFoundException"] = "UserNotFoundException";
})(DeleteUserAttributesException || (DeleteUserAttributesException = {}));
var DeleteUserException;
(function(DeleteUserException) {
	DeleteUserException["ForbiddenException"] = "ForbiddenException";
	DeleteUserException["InternalErrorException"] = "InternalErrorException";
	DeleteUserException["InvalidParameterException"] = "InvalidParameterException";
	DeleteUserException["NotAuthorizedException"] = "NotAuthorizedException";
	DeleteUserException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	DeleteUserException["ResourceNotFoundException"] = "ResourceNotFoundException";
	DeleteUserException["TooManyRequestsException"] = "TooManyRequestsException";
	DeleteUserException["UserNotConfirmedException"] = "UserNotConfirmedException";
	DeleteUserException["UserNotFoundException"] = "UserNotFoundException";
})(DeleteUserException || (DeleteUserException = {}));
var ForgetDeviceException;
(function(ForgetDeviceException) {
	ForgetDeviceException["ForbiddenException"] = "ForbiddenException";
	ForgetDeviceException["InternalErrorException"] = "InternalErrorException";
	ForgetDeviceException["InvalidParameterException"] = "InvalidParameterException";
	ForgetDeviceException["InvalidUserPoolConfigurationException"] = "InvalidUserPoolConfigurationException";
	ForgetDeviceException["NotAuthorizedException"] = "NotAuthorizedException";
	ForgetDeviceException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	ForgetDeviceException["ResourceNotFoundException"] = "ResourceNotFoundException";
	ForgetDeviceException["TooManyRequestsException"] = "TooManyRequestsException";
	ForgetDeviceException["UserNotConfirmedException"] = "UserNotConfirmedException";
	ForgetDeviceException["UserNotFoundException"] = "UserNotFoundException";
})(ForgetDeviceException || (ForgetDeviceException = {}));
var ForgotPasswordException;
(function(ForgotPasswordException) {
	ForgotPasswordException["CodeDeliveryFailureException"] = "CodeDeliveryFailureException";
	ForgotPasswordException["ForbiddenException"] = "ForbiddenException";
	ForgotPasswordException["InternalErrorException"] = "InternalErrorException";
	ForgotPasswordException["InvalidEmailRoleAccessPolicyException"] = "InvalidEmailRoleAccessPolicyException";
	ForgotPasswordException["InvalidLambdaResponseException"] = "InvalidLambdaResponseException";
	ForgotPasswordException["InvalidParameterException"] = "InvalidParameterException";
	ForgotPasswordException["InvalidSmsRoleAccessPolicyException"] = "InvalidSmsRoleAccessPolicyException";
	ForgotPasswordException["InvalidSmsRoleTrustRelationshipException"] = "InvalidSmsRoleTrustRelationshipException";
	ForgotPasswordException["LimitExceededException"] = "LimitExceededException";
	ForgotPasswordException["NotAuthorizedException"] = "NotAuthorizedException";
	ForgotPasswordException["ResourceNotFoundException"] = "ResourceNotFoundException";
	ForgotPasswordException["TooManyRequestsException"] = "TooManyRequestsException";
	ForgotPasswordException["UnexpectedLambdaException"] = "UnexpectedLambdaException";
	ForgotPasswordException["UserLambdaValidationException"] = "UserLambdaValidationException";
	ForgotPasswordException["UserNotFoundException"] = "UserNotFoundException";
})(ForgotPasswordException || (ForgotPasswordException = {}));
var GetUserException;
(function(GetUserException) {
	GetUserException["ForbiddenException"] = "ForbiddenException";
	GetUserException["InternalErrorException"] = "InternalErrorException";
	GetUserException["InvalidParameterException"] = "InvalidParameterException";
	GetUserException["NotAuthorizedException"] = "NotAuthorizedException";
	GetUserException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	GetUserException["ResourceNotFoundException"] = "ResourceNotFoundException";
	GetUserException["TooManyRequestsException"] = "TooManyRequestsException";
	GetUserException["UserNotConfirmedException"] = "UserNotConfirmedException";
	GetUserException["UserNotFoundException"] = "UserNotFoundException";
})(GetUserException || (GetUserException = {}));
var GetIdException;
(function(GetIdException) {
	GetIdException["ExternalServiceException"] = "ExternalServiceException";
	GetIdException["InternalErrorException"] = "InternalErrorException";
	GetIdException["InvalidParameterException"] = "InvalidParameterException";
	GetIdException["LimitExceededException"] = "LimitExceededException";
	GetIdException["NotAuthorizedException"] = "NotAuthorizedException";
	GetIdException["ResourceConflictException"] = "ResourceConflictException";
	GetIdException["ResourceNotFoundException"] = "ResourceNotFoundException";
	GetIdException["TooManyRequestsException"] = "TooManyRequestsException";
})(GetIdException || (GetIdException = {}));
var GetCredentialsForIdentityException;
(function(GetCredentialsForIdentityException) {
	GetCredentialsForIdentityException["ExternalServiceException"] = "ExternalServiceException";
	GetCredentialsForIdentityException["InternalErrorException"] = "InternalErrorException";
	GetCredentialsForIdentityException["InvalidIdentityPoolConfigurationException"] = "InvalidIdentityPoolConfigurationException";
	GetCredentialsForIdentityException["InvalidParameterException"] = "InvalidParameterException";
	GetCredentialsForIdentityException["NotAuthorizedException"] = "NotAuthorizedException";
	GetCredentialsForIdentityException["ResourceConflictException"] = "ResourceConflictException";
	GetCredentialsForIdentityException["ResourceNotFoundException"] = "ResourceNotFoundException";
	GetCredentialsForIdentityException["TooManyRequestsException"] = "TooManyRequestsException";
})(GetCredentialsForIdentityException || (GetCredentialsForIdentityException = {}));
var GetUserAttributeVerificationException;
(function(GetUserAttributeVerificationException) {
	GetUserAttributeVerificationException["CodeDeliveryFailureException"] = "CodeDeliveryFailureException";
	GetUserAttributeVerificationException["ForbiddenException"] = "ForbiddenException";
	GetUserAttributeVerificationException["InternalErrorException"] = "InternalErrorException";
	GetUserAttributeVerificationException["InvalidEmailRoleAccessPolicyException"] = "InvalidEmailRoleAccessPolicyException";
	GetUserAttributeVerificationException["InvalidLambdaResponseException"] = "InvalidLambdaResponseException";
	GetUserAttributeVerificationException["InvalidParameterException"] = "InvalidParameterException";
	GetUserAttributeVerificationException["InvalidSmsRoleAccessPolicyException"] = "InvalidSmsRoleAccessPolicyException";
	GetUserAttributeVerificationException["InvalidSmsRoleTrustRelationshipException"] = "InvalidSmsRoleTrustRelationshipException";
	GetUserAttributeVerificationException["LimitExceededException"] = "LimitExceededException";
	GetUserAttributeVerificationException["NotAuthorizedException"] = "NotAuthorizedException";
	GetUserAttributeVerificationException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	GetUserAttributeVerificationException["ResourceNotFoundException"] = "ResourceNotFoundException";
	GetUserAttributeVerificationException["TooManyRequestsException"] = "TooManyRequestsException";
	GetUserAttributeVerificationException["UnexpectedLambdaException"] = "UnexpectedLambdaException";
	GetUserAttributeVerificationException["UserLambdaValidationException"] = "UserLambdaValidationException";
	GetUserAttributeVerificationException["UserNotConfirmedException"] = "UserNotConfirmedException";
	GetUserAttributeVerificationException["UserNotFoundException"] = "UserNotFoundException";
})(GetUserAttributeVerificationException || (GetUserAttributeVerificationException = {}));
var GlobalSignOutException;
(function(GlobalSignOutException) {
	GlobalSignOutException["ForbiddenException"] = "ForbiddenException";
	GlobalSignOutException["InternalErrorException"] = "InternalErrorException";
	GlobalSignOutException["InvalidParameterException"] = "InvalidParameterException";
	GlobalSignOutException["NotAuthorizedException"] = "NotAuthorizedException";
	GlobalSignOutException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	GlobalSignOutException["ResourceNotFoundException"] = "ResourceNotFoundException";
	GlobalSignOutException["TooManyRequestsException"] = "TooManyRequestsException";
	GlobalSignOutException["UserNotConfirmedException"] = "UserNotConfirmedException";
})(GlobalSignOutException || (GlobalSignOutException = {}));
var InitiateAuthException;
(function(InitiateAuthException) {
	InitiateAuthException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	InitiateAuthException["ForbiddenException"] = "ForbiddenException";
	InitiateAuthException["InternalErrorException"] = "InternalErrorException";
	InitiateAuthException["InvalidLambdaResponseException"] = "InvalidLambdaResponseException";
	InitiateAuthException["InvalidParameterException"] = "InvalidParameterException";
	InitiateAuthException["InvalidSmsRoleAccessPolicyException"] = "InvalidSmsRoleAccessPolicyException";
	InitiateAuthException["InvalidSmsRoleTrustRelationshipException"] = "InvalidSmsRoleTrustRelationshipException";
	InitiateAuthException["InvalidUserPoolConfigurationException"] = "InvalidUserPoolConfigurationException";
	InitiateAuthException["NotAuthorizedException"] = "NotAuthorizedException";
	InitiateAuthException["ResourceNotFoundException"] = "ResourceNotFoundException";
	InitiateAuthException["TooManyRequestsException"] = "TooManyRequestsException";
	InitiateAuthException["UnexpectedLambdaException"] = "UnexpectedLambdaException";
	InitiateAuthException["UserLambdaValidationException"] = "UserLambdaValidationException";
	InitiateAuthException["UserNotConfirmedException"] = "UserNotConfirmedException";
	InitiateAuthException["UserNotFoundException"] = "UserNotFoundException";
})(InitiateAuthException || (InitiateAuthException = {}));
var ResendConfirmationException;
(function(ResendConfirmationException) {
	ResendConfirmationException["CodeDeliveryFailureException"] = "CodeDeliveryFailureException";
	ResendConfirmationException["ForbiddenException"] = "ForbiddenException";
	ResendConfirmationException["InternalErrorException"] = "InternalErrorException";
	ResendConfirmationException["InvalidEmailRoleAccessPolicyException"] = "InvalidEmailRoleAccessPolicyException";
	ResendConfirmationException["InvalidLambdaResponseException"] = "InvalidLambdaResponseException";
	ResendConfirmationException["InvalidParameterException"] = "InvalidParameterException";
	ResendConfirmationException["InvalidSmsRoleAccessPolicyException"] = "InvalidSmsRoleAccessPolicyException";
	ResendConfirmationException["InvalidSmsRoleTrustRelationshipException"] = "InvalidSmsRoleTrustRelationshipException";
	ResendConfirmationException["LimitExceededException"] = "LimitExceededException";
	ResendConfirmationException["NotAuthorizedException"] = "NotAuthorizedException";
	ResendConfirmationException["ResourceNotFoundException"] = "ResourceNotFoundException";
	ResendConfirmationException["TooManyRequestsException"] = "TooManyRequestsException";
	ResendConfirmationException["UnexpectedLambdaException"] = "UnexpectedLambdaException";
	ResendConfirmationException["UserLambdaValidationException"] = "UserLambdaValidationException";
	ResendConfirmationException["UserNotFoundException"] = "UserNotFoundException";
})(ResendConfirmationException || (ResendConfirmationException = {}));
var RespondToAuthChallengeException;
(function(RespondToAuthChallengeException) {
	RespondToAuthChallengeException["AliasExistsException"] = "AliasExistsException";
	RespondToAuthChallengeException["CodeMismatchException"] = "CodeMismatchException";
	RespondToAuthChallengeException["ExpiredCodeException"] = "ExpiredCodeException";
	RespondToAuthChallengeException["ForbiddenException"] = "ForbiddenException";
	RespondToAuthChallengeException["InternalErrorException"] = "InternalErrorException";
	RespondToAuthChallengeException["InvalidLambdaResponseException"] = "InvalidLambdaResponseException";
	RespondToAuthChallengeException["InvalidParameterException"] = "InvalidParameterException";
	RespondToAuthChallengeException["InvalidPasswordException"] = "InvalidPasswordException";
	RespondToAuthChallengeException["InvalidSmsRoleAccessPolicyException"] = "InvalidSmsRoleAccessPolicyException";
	RespondToAuthChallengeException["InvalidSmsRoleTrustRelationshipException"] = "InvalidSmsRoleTrustRelationshipException";
	RespondToAuthChallengeException["InvalidUserPoolConfigurationException"] = "InvalidUserPoolConfigurationException";
	RespondToAuthChallengeException["MFAMethodNotFoundException"] = "MFAMethodNotFoundException";
	RespondToAuthChallengeException["NotAuthorizedException"] = "NotAuthorizedException";
	RespondToAuthChallengeException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	RespondToAuthChallengeException["ResourceNotFoundException"] = "ResourceNotFoundException";
	RespondToAuthChallengeException["SoftwareTokenMFANotFoundException"] = "SoftwareTokenMFANotFoundException";
	RespondToAuthChallengeException["TooManyRequestsException"] = "TooManyRequestsException";
	RespondToAuthChallengeException["UnexpectedLambdaException"] = "UnexpectedLambdaException";
	RespondToAuthChallengeException["UserLambdaValidationException"] = "UserLambdaValidationException";
	RespondToAuthChallengeException["UserNotConfirmedException"] = "UserNotConfirmedException";
	RespondToAuthChallengeException["UserNotFoundException"] = "UserNotFoundException";
})(RespondToAuthChallengeException || (RespondToAuthChallengeException = {}));
var SetUserMFAPreferenceException;
(function(SetUserMFAPreferenceException) {
	SetUserMFAPreferenceException["ForbiddenException"] = "ForbiddenException";
	SetUserMFAPreferenceException["InternalErrorException"] = "InternalErrorException";
	SetUserMFAPreferenceException["InvalidParameterException"] = "InvalidParameterException";
	SetUserMFAPreferenceException["NotAuthorizedException"] = "NotAuthorizedException";
	SetUserMFAPreferenceException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	SetUserMFAPreferenceException["ResourceNotFoundException"] = "ResourceNotFoundException";
	SetUserMFAPreferenceException["UserNotConfirmedException"] = "UserNotConfirmedException";
	SetUserMFAPreferenceException["UserNotFoundException"] = "UserNotFoundException";
})(SetUserMFAPreferenceException || (SetUserMFAPreferenceException = {}));
var SignUpException;
(function(SignUpException) {
	SignUpException["CodeDeliveryFailureException"] = "CodeDeliveryFailureException";
	SignUpException["InternalErrorException"] = "InternalErrorException";
	SignUpException["InvalidEmailRoleAccessPolicyException"] = "InvalidEmailRoleAccessPolicyException";
	SignUpException["InvalidLambdaResponseException"] = "InvalidLambdaResponseException";
	SignUpException["InvalidParameterException"] = "InvalidParameterException";
	SignUpException["InvalidPasswordException"] = "InvalidPasswordException";
	SignUpException["InvalidSmsRoleAccessPolicyException"] = "InvalidSmsRoleAccessPolicyException";
	SignUpException["InvalidSmsRoleTrustRelationshipException"] = "InvalidSmsRoleTrustRelationshipException";
	SignUpException["NotAuthorizedException"] = "NotAuthorizedException";
	SignUpException["ResourceNotFoundException"] = "ResourceNotFoundException";
	SignUpException["TooManyRequestsException"] = "TooManyRequestsException";
	SignUpException["UnexpectedLambdaException"] = "UnexpectedLambdaException";
	SignUpException["UserLambdaValidationException"] = "UserLambdaValidationException";
	SignUpException["UsernameExistsException"] = "UsernameExistsException";
})(SignUpException || (SignUpException = {}));
var UpdateUserAttributesException;
(function(UpdateUserAttributesException) {
	UpdateUserAttributesException["AliasExistsException"] = "AliasExistsException";
	UpdateUserAttributesException["CodeDeliveryFailureException"] = "CodeDeliveryFailureException";
	UpdateUserAttributesException["CodeMismatchException"] = "CodeMismatchException";
	UpdateUserAttributesException["ExpiredCodeException"] = "ExpiredCodeException";
	UpdateUserAttributesException["ForbiddenException"] = "ForbiddenException";
	UpdateUserAttributesException["InternalErrorException"] = "InternalErrorException";
	UpdateUserAttributesException["InvalidEmailRoleAccessPolicyException"] = "InvalidEmailRoleAccessPolicyException";
	UpdateUserAttributesException["InvalidLambdaResponseException"] = "InvalidLambdaResponseException";
	UpdateUserAttributesException["InvalidParameterException"] = "InvalidParameterException";
	UpdateUserAttributesException["InvalidSmsRoleAccessPolicyException"] = "InvalidSmsRoleAccessPolicyException";
	UpdateUserAttributesException["InvalidSmsRoleTrustRelationshipException"] = "InvalidSmsRoleTrustRelationshipException";
	UpdateUserAttributesException["NotAuthorizedException"] = "NotAuthorizedException";
	UpdateUserAttributesException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	UpdateUserAttributesException["ResourceNotFoundException"] = "ResourceNotFoundException";
	UpdateUserAttributesException["TooManyRequestsException"] = "TooManyRequestsException";
	UpdateUserAttributesException["UnexpectedLambdaException"] = "UnexpectedLambdaException";
	UpdateUserAttributesException["UserLambdaValidationException"] = "UserLambdaValidationException";
	UpdateUserAttributesException["UserNotConfirmedException"] = "UserNotConfirmedException";
	UpdateUserAttributesException["UserNotFoundException"] = "UserNotFoundException";
})(UpdateUserAttributesException || (UpdateUserAttributesException = {}));
var VerifySoftwareTokenException;
(function(VerifySoftwareTokenException) {
	VerifySoftwareTokenException["CodeMismatchException"] = "CodeMismatchException";
	VerifySoftwareTokenException["EnableSoftwareTokenMFAException"] = "EnableSoftwareTokenMFAException";
	VerifySoftwareTokenException["ForbiddenException"] = "ForbiddenException";
	VerifySoftwareTokenException["InternalErrorException"] = "InternalErrorException";
	VerifySoftwareTokenException["InvalidParameterException"] = "InvalidParameterException";
	VerifySoftwareTokenException["InvalidUserPoolConfigurationException"] = "InvalidUserPoolConfigurationException";
	VerifySoftwareTokenException["NotAuthorizedException"] = "NotAuthorizedException";
	VerifySoftwareTokenException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	VerifySoftwareTokenException["ResourceNotFoundException"] = "ResourceNotFoundException";
	VerifySoftwareTokenException["SoftwareTokenMFANotFoundException"] = "SoftwareTokenMFANotFoundException";
	VerifySoftwareTokenException["TooManyRequestsException"] = "TooManyRequestsException";
	VerifySoftwareTokenException["UserNotConfirmedException"] = "UserNotConfirmedException";
	VerifySoftwareTokenException["UserNotFoundException"] = "UserNotFoundException";
})(VerifySoftwareTokenException || (VerifySoftwareTokenException = {}));
var VerifyUserAttributeException;
(function(VerifyUserAttributeException) {
	VerifyUserAttributeException["AliasExistsException"] = "AliasExistsException";
	VerifyUserAttributeException["CodeMismatchException"] = "CodeMismatchException";
	VerifyUserAttributeException["ExpiredCodeException"] = "ExpiredCodeException";
	VerifyUserAttributeException["ForbiddenException"] = "ForbiddenException";
	VerifyUserAttributeException["InternalErrorException"] = "InternalErrorException";
	VerifyUserAttributeException["InvalidParameterException"] = "InvalidParameterException";
	VerifyUserAttributeException["LimitExceededException"] = "LimitExceededException";
	VerifyUserAttributeException["NotAuthorizedException"] = "NotAuthorizedException";
	VerifyUserAttributeException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	VerifyUserAttributeException["ResourceNotFoundException"] = "ResourceNotFoundException";
	VerifyUserAttributeException["TooManyRequestsException"] = "TooManyRequestsException";
	VerifyUserAttributeException["UserNotConfirmedException"] = "UserNotConfirmedException";
	VerifyUserAttributeException["UserNotFoundException"] = "UserNotFoundException";
})(VerifyUserAttributeException || (VerifyUserAttributeException = {}));
var UpdateDeviceStatusException;
(function(UpdateDeviceStatusException) {
	UpdateDeviceStatusException["ForbiddenException"] = "ForbiddenException";
	UpdateDeviceStatusException["InternalErrorException"] = "InternalErrorException";
	UpdateDeviceStatusException["InvalidParameterException"] = "InvalidParameterException";
	UpdateDeviceStatusException["InvalidUserPoolConfigurationException"] = "InvalidUserPoolConfigurationException";
	UpdateDeviceStatusException["NotAuthorizedException"] = "NotAuthorizedException";
	UpdateDeviceStatusException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	UpdateDeviceStatusException["ResourceNotFoundException"] = "ResourceNotFoundException";
	UpdateDeviceStatusException["TooManyRequestsException"] = "TooManyRequestsException";
	UpdateDeviceStatusException["UserNotConfirmedException"] = "UserNotConfirmedException";
	UpdateDeviceStatusException["UserNotFoundException"] = "UserNotFoundException";
})(UpdateDeviceStatusException || (UpdateDeviceStatusException = {}));
var ListDevicesException;
(function(ListDevicesException) {
	ListDevicesException["ForbiddenException"] = "ForbiddenException";
	ListDevicesException["InternalErrorException"] = "InternalErrorException";
	ListDevicesException["InvalidParameterException"] = "InvalidParameterException";
	ListDevicesException["InvalidUserPoolConfigurationException"] = "InvalidUserPoolConfigurationException";
	ListDevicesException["NotAuthorizedException"] = "NotAuthorizedException";
	ListDevicesException["PasswordResetRequiredException"] = "PasswordResetRequiredException";
	ListDevicesException["ResourceNotFoundException"] = "ResourceNotFoundException";
	ListDevicesException["TooManyRequestsException"] = "TooManyRequestsException";
	ListDevicesException["UserNotConfirmedException"] = "UserNotConfirmedException";
	ListDevicesException["UserNotFoundException"] = "UserNotFoundException";
})(ListDevicesException || (ListDevicesException = {}));
var SETUP_TOTP_EXCEPTION = "SetUpTOTPException";
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/errors/constants.mjs
var USER_UNAUTHENTICATED_EXCEPTION = "UserUnAuthenticatedException";
var USER_ALREADY_AUTHENTICATED_EXCEPTION = "UserAlreadyAuthenticatedException";
var DEVICE_METADATA_NOT_FOUND_EXCEPTION = "DeviceMetadataNotFoundException";
var AUTO_SIGN_IN_EXCEPTION = "AutoSignInException";
var INVALID_REDIRECT_EXCEPTION = "InvalidRedirectException";
var INVALID_APP_SCHEME_EXCEPTION = "InvalidAppSchemeException";
var INVALID_PREFERRED_REDIRECT_EXCEPTION = "InvalidPreferredRedirectUrlException";
var invalidRedirectException = new AuthError({
	name: INVALID_REDIRECT_EXCEPTION,
	message: "signInRedirect or signOutRedirect had an invalid format or was not found.",
	recoverySuggestion: "Please make sure the signIn/Out redirect in your oauth config is valid."
});
new AuthError({
	name: INVALID_APP_SCHEME_EXCEPTION,
	message: "A valid non-http app scheme was not found in the config.",
	recoverySuggestion: "Please make sure a valid custom app scheme is present in the config."
});
var invalidPreferredRedirectUrlException = new AuthError({
	name: INVALID_PREFERRED_REDIRECT_EXCEPTION,
	message: "The given preferredRedirectUrl does not match any items in the redirectSignOutUrls array from the config.",
	recoverySuggestion: "Please make sure a matching preferredRedirectUrl is provided."
});
var invalidOriginException = new AuthError({
	name: "InvalidOriginException",
	message: "redirect is coming from a different origin. The oauth flow needs to be initiated from the same origin",
	recoverySuggestion: "Please call signInWithRedirect from the same origin."
});
var OAUTH_SIGNOUT_EXCEPTION = "OAuthSignOutException";
var TOKEN_REFRESH_EXCEPTION = "TokenRefreshException";
var UNEXPECTED_SIGN_IN_INTERRUPTION_EXCEPTION = "UnexpectedSignInInterruptionException";
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/types.mjs
function assertAuthTokens(tokens) {
	if (!tokens || !tokens.accessToken) throw new AuthError({
		name: USER_UNAUTHENTICATED_EXCEPTION,
		message: "User needs to be authenticated to call this API.",
		recoverySuggestion: "Sign in before calling this API again."
	});
}
function assertIdTokenInAuthTokens(tokens) {
	if (!tokens || !tokens.idToken) throw new AuthError({
		name: USER_UNAUTHENTICATED_EXCEPTION,
		message: "User needs to be authenticated to call this API.",
		recoverySuggestion: "Sign in before calling this API again."
	});
}
var oAuthTokenRefreshException = new AuthError({
	name: TOKEN_REFRESH_EXCEPTION,
	message: `Token refresh is not supported when authenticated with the 'implicit grant' (token) oauth flow. 
	Please change your oauth configuration to use 'code grant' flow.`,
	recoverySuggestion: `Please logout and change your Amplify configuration to use "code grant" flow. 
	E.g { responseType: 'code' }`
});
var tokenRefreshException = new AuthError({
	name: USER_UNAUTHENTICATED_EXCEPTION,
	message: "User needs to be authenticated to call this API.",
	recoverySuggestion: "Sign in before calling this API again."
});
function assertAuthTokensWithRefreshToken(tokens) {
	if (isAuthenticatedWithImplicitOauthFlow(tokens)) throw oAuthTokenRefreshException;
	if (!isAuthenticatedWithRefreshToken(tokens)) throw tokenRefreshException;
}
function assertDeviceMetadata(deviceMetadata) {
	if (!deviceMetadata || !deviceMetadata.deviceKey || !deviceMetadata.deviceGroupKey || !deviceMetadata.randomPassword) throw new AuthError({
		name: DEVICE_METADATA_NOT_FOUND_EXCEPTION,
		message: "Either deviceKey, deviceGroupKey or secretPassword were not found during the sign-in process.",
		recoverySuggestion: "Make sure to not clear storage after calling the signIn API."
	});
}
var OAuthStorageKeys = {
	inflightOAuth: "inflightOAuth",
	inflightOAuthDeadline: "inflightOAuthDeadline",
	oauthSignIn: "oauthSignIn",
	oauthPKCE: "oauthPKCE",
	oauthState: "oauthState"
};
function isAuthenticated(tokens) {
	return tokens?.accessToken || tokens?.idToken;
}
function isAuthenticatedWithRefreshToken(tokens) {
	return isAuthenticated(tokens) && tokens?.refreshToken;
}
function isAuthenticatedWithImplicitOauthFlow(tokens) {
	return isAuthenticated(tokens) && !tokens?.refreshToken;
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/internal/getCurrentUser.mjs
var getCurrentUser$1 = async (amplify) => {
	const authConfig = amplify.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const tokens = await amplify.getTokens({ forceRefresh: false });
	assertAuthTokens(tokens);
	const { "cognito:username": username, sub } = tokens.idToken?.payload ?? {};
	const authUser = {
		username,
		userId: sub
	};
	const signInDetails = getSignInDetailsFromTokens(tokens);
	if (signInDetails) authUser.signInDetails = signInDetails;
	return authUser;
};
function getSignInDetailsFromTokens(tokens) {
	return tokens?.signInDetails;
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/getCurrentUser.mjs
async function getCurrentUser(...args) {
	const [ctx] = resolveCtxArgs(args);
	return getCurrentUser$1(ctx);
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/utils/getAuthUserAgentValue.mjs
var getAuthUserAgentValue = (action, customUserAgentDetails) => getAmplifyUserAgent({
	category: Category.Auth,
	action,
	...customUserAgentDetails
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/shared/serde/createUserPoolSerializer.mjs
var createUserPoolSerializer = (operation) => (input, endpoint) => {
	return buildHttpRpcRequest(endpoint, getSharedHeaders(operation), JSON.stringify(input));
};
var getSharedHeaders = (operation) => ({
	"content-type": "application/x-amz-json-1.1",
	"x-amz-target": `AWSCognitoIdentityProviderService.${operation}`
});
var buildHttpRpcRequest = ({ url }, headers, body) => ({
	headers,
	url,
	body,
	method: "POST"
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/errors/utils/assertServiceError.mjs
function assertServiceError(error) {
	if (!error || error.name === "Error" || error instanceof TypeError) throw new AuthError({
		name: AmplifyErrorCode.Unknown,
		message: "An unknown error has occurred.",
		underlyingError: error
	});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/shared/serde/createUserPoolDeserializer.mjs
var createUserPoolDeserializer = () => async (response) => {
	if (response.statusCode >= 300) {
		const error = await parseJsonError(response);
		assertServiceError(error);
		throw new AuthError({
			name: error.name,
			message: error.message,
			metadata: error.$metadata
		});
	}
	return parseJsonBody(response);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/shared/handler/cognitoUserPoolTransferHandler.mjs
/**
* A Cognito Identity-specific middleware that disables caching for all requests.
*/
var disableCacheMiddlewareFactory = () => (next, _) => async function disableCacheMiddleware(request) {
	const customHeaders = hasGlobalContext() ? await getGlobalContext().libraryOptions?.Auth?.headers?.() : void 0;
	request.headers = {
		...request.headers,
		"cache-control": "no-store",
		...customHeaders
	};
	return next(request);
};
/**
* A Cognito Identity-specific transfer handler that does NOT sign requests, and
* disables caching.
*
* @internal
*/
var cognitoUserPoolTransferHandler = composeTransferHandler(unauthenticatedHandler, [disableCacheMiddlewareFactory]);
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/constants.mjs
/**
* The service name used to sign requests if the API requires authentication.
*/
var COGNITO_IDP_SERVICE_NAME = "cognito-idp";
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/constants.mjs
var DEFAULT_SERVICE_CLIENT_API_CONFIG = {
	service: COGNITO_IDP_SERVICE_NAME,
	retryDecider: getRetryDecider(parseJsonError),
	computeDelay: jitteredBackoff,
	get userAgentValue() {
		return getAmplifyUserAgent();
	},
	cache: "no-store"
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createInitiateAuthClient.mjs
var createInitiateAuthClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("InitiateAuth"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createRespondToAuthChallengeClient.mjs
var createRespondToAuthChallengeClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("RespondToAuthChallenge"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createVerifySoftwareTokenClient.mjs
var createVerifySoftwareTokenClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("VerifySoftwareToken"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createAssociateSoftwareTokenClient.mjs
var createAssociateSoftwareTokenClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("AssociateSoftwareToken"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/cognitoUserPoolEndpointResolver.mjs
var cognitoUserPoolEndpointResolver = ({ region }) => ({ url: new AmplifyUrl(`https://${COGNITO_IDP_SERVICE_NAME}.${region}.${getDnsSuffix(region)}`) });
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/factories/createCognitoUserPoolEndpointResolver.mjs
var createCognitoUserPoolEndpointResolver = ({ endpointOverride }) => (input) => {
	if (endpointOverride) return { url: new AmplifyUrl(endpointOverride) };
	return cognitoUserPoolEndpointResolver(input);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createGetTokensFromRefreshTokenClient.mjs
var createGetTokensFromRefreshTokenClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("GetTokensFromRefreshToken"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/refreshAuthTokens.mjs
var refreshAuthTokensFunction = async ({ tokens, authConfig, username, clientMetadata }) => {
	assertTokenProviderConfig(authConfig?.Cognito);
	const { userPoolId, userPoolClientId, userPoolEndpoint } = authConfig.Cognito;
	const region = getRegionFromUserPoolId(userPoolId);
	assertAuthTokensWithRefreshToken(tokens);
	const { AuthenticationResult } = await createGetTokensFromRefreshTokenClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({ region }, {
		ClientId: userPoolClientId,
		RefreshToken: tokens.refreshToken,
		DeviceKey: tokens.deviceMetadata?.deviceKey,
		ClientMetadata: clientMetadata
	});
	const accessToken = decodeJWT(AuthenticationResult?.AccessToken ?? "");
	const idToken = AuthenticationResult?.IdToken ? decodeJWT(AuthenticationResult.IdToken) : void 0;
	const { iat } = accessToken.payload;
	if (!iat) throw new AuthError({
		name: "iatNotFoundException",
		message: "iat not found in access token"
	});
	return {
		accessToken,
		idToken,
		clockDrift: iat * 1e3 - (/* @__PURE__ */ new Date()).getTime(),
		refreshToken: AuthenticationResult?.RefreshToken ?? tokens.refreshToken,
		username
	};
};
var refreshAuthTokens = deDupeAsyncFunction(refreshAuthTokensFunction);
var refreshAuthTokensWithoutDedupe = refreshAuthTokensFunction;
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/tokenProvider/types.mjs
var AuthTokenStorageKeys = {
	accessToken: "accessToken",
	idToken: "idToken",
	oidcProvider: "oidcProvider",
	clockDrift: "clockDrift",
	refreshToken: "refreshToken",
	deviceKey: "deviceKey",
	randomPasswordKey: "randomPasswordKey",
	deviceGroupKey: "deviceGroupKey",
	signInDetails: "signInDetails",
	oauthMetadata: "oauthMetadata"
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/tokenProvider/errorHelpers.mjs
var TokenProviderErrorCode;
(function(TokenProviderErrorCode) {
	TokenProviderErrorCode["InvalidAuthTokens"] = "InvalidAuthTokens";
})(TokenProviderErrorCode || (TokenProviderErrorCode = {}));
var assert = createAssertionFunction({ [TokenProviderErrorCode.InvalidAuthTokens]: {
	message: "Invalid tokens.",
	recoverySuggestion: "Make sure the tokens are valid."
} });
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/tokenProvider/constants.mjs
var AUTH_KEY_PREFIX = "CognitoIdentityServiceProvider";
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/tokenProvider/TokenStore.mjs
var DefaultTokenStore = class {
	getKeyValueStorage() {
		if (!this.keyValueStorage) throw new AuthError({
			name: "KeyValueStorageNotFoundException",
			message: "KeyValueStorage was not found in TokenStore"
		});
		return this.keyValueStorage;
	}
	setKeyValueStorage(keyValueStorage) {
		const wasActive = !!this.stopNotify;
		this.teardownNotify();
		this.keyValueStorage = keyValueStorage;
		if (wasActive) this.setupNotify();
	}
	setAuthConfig(authConfig) {
		this.authConfig = authConfig;
	}
	setupNotify() {
		if (this.stopNotify) return;
		this.stopNotify = this.keyValueStorage?.addListener?.(async (e) => {
			const key = e.key || "";
			if (!key.startsWith(`CognitoIdentityServiceProvider.`)) return;
			const { newValue, oldValue } = e;
			if (key.endsWith(".refreshToken")) {
				if (newValue && !oldValue) Hub.dispatch("auth", {
					event: "signedIn",
					data: await getCurrentUser()
				}, "Auth", AMPLIFY_SYMBOL, true);
				else if (!newValue && oldValue) Hub.dispatch("auth", { event: "signedOut" }, "Auth", AMPLIFY_SYMBOL, true);
			} else if (key.endsWith(".accessToken")) {
				if (oldValue && newValue && oldValue !== newValue) Hub.dispatch("auth", { event: "tokenRefresh" }, "Auth", AMPLIFY_SYMBOL, true);
			}
		});
	}
	/**
	* Detaches the cross-tab storage listener registered by {@link setupNotify}
	* and clears the retained unsubscribe handle, allowing a subsequent
	* `setupNotify()` to re-register (e.g. after a storage swap, in tests, or
	* during HMR). No-op when notify was never set up.
	*/
	teardownNotify() {
		this.stopNotify?.();
		this.stopNotify = void 0;
	}
	async loadTokens() {
		try {
			const authKeys = await this.getAuthKeys();
			const accessTokenString = await this.getKeyValueStorage().getItem(authKeys.accessToken);
			if (!accessTokenString) throw new AuthError({
				name: "NoSessionFoundException",
				message: "Auth session was not found. Make sure to call signIn."
			});
			const accessToken = decodeJWT(accessTokenString);
			const itString = await this.getKeyValueStorage().getItem(authKeys.idToken);
			const idToken = itString ? decodeJWT(itString) : void 0;
			const refreshToken = await this.getKeyValueStorage().getItem(authKeys.refreshToken) ?? void 0;
			const clockDriftString = await this.getKeyValueStorage().getItem(authKeys.clockDrift) ?? "0";
			const clockDrift = Number.parseInt(clockDriftString);
			const signInDetails = await this.getKeyValueStorage().getItem(authKeys.signInDetails);
			const tokens = {
				accessToken,
				idToken,
				refreshToken,
				deviceMetadata: await this.getDeviceMetadata() ?? void 0,
				clockDrift,
				username: await this.getLastAuthUser()
			};
			if (signInDetails) tokens.signInDetails = JSON.parse(signInDetails);
			return tokens;
		} catch (err) {
			return null;
		}
	}
	async storeTokens(tokens) {
		assert(tokens !== void 0, TokenProviderErrorCode.InvalidAuthTokens);
		const lastAuthUser = tokens.username;
		await this.getKeyValueStorage().setItem(this.getLastAuthUserKey(), lastAuthUser);
		const authKeys = await this.getAuthKeys();
		await this.getKeyValueStorage().setItem(authKeys.accessToken, tokens.accessToken.toString());
		if (tokens.idToken) await this.getKeyValueStorage().setItem(authKeys.idToken, tokens.idToken.toString());
		else await this.getKeyValueStorage().removeItem(authKeys.idToken);
		if (tokens.refreshToken) await this.getKeyValueStorage().setItem(authKeys.refreshToken, tokens.refreshToken);
		else await this.getKeyValueStorage().removeItem(authKeys.refreshToken);
		if (tokens.deviceMetadata) {
			if (tokens.deviceMetadata.deviceKey) await this.getKeyValueStorage().setItem(authKeys.deviceKey, tokens.deviceMetadata.deviceKey);
			if (tokens.deviceMetadata.deviceGroupKey) await this.getKeyValueStorage().setItem(authKeys.deviceGroupKey, tokens.deviceMetadata.deviceGroupKey);
			await this.getKeyValueStorage().setItem(authKeys.randomPasswordKey, tokens.deviceMetadata.randomPassword);
		}
		if (tokens.signInDetails) await this.getKeyValueStorage().setItem(authKeys.signInDetails, JSON.stringify(tokens.signInDetails));
		else await this.getKeyValueStorage().removeItem(authKeys.signInDetails);
		await this.getKeyValueStorage().setItem(authKeys.clockDrift, `${tokens.clockDrift}`);
	}
	async clearTokens() {
		const authKeys = await this.getAuthKeys();
		await Promise.all([
			this.getKeyValueStorage().removeItem(authKeys.accessToken),
			this.getKeyValueStorage().removeItem(authKeys.idToken),
			this.getKeyValueStorage().removeItem(authKeys.clockDrift),
			this.getKeyValueStorage().removeItem(authKeys.refreshToken),
			this.getKeyValueStorage().removeItem(authKeys.signInDetails),
			this.getKeyValueStorage().removeItem(this.getLastAuthUserKey()),
			this.getKeyValueStorage().removeItem(authKeys.oauthMetadata)
		]);
	}
	async getDeviceMetadata(username) {
		const authKeys = await this.getAuthKeys(username);
		const deviceKey = await this.getKeyValueStorage().getItem(authKeys.deviceKey);
		const deviceGroupKey = await this.getKeyValueStorage().getItem(authKeys.deviceGroupKey);
		const randomPassword = await this.getKeyValueStorage().getItem(authKeys.randomPasswordKey);
		return randomPassword && deviceGroupKey && deviceKey ? {
			deviceKey,
			deviceGroupKey,
			randomPassword
		} : null;
	}
	async clearDeviceMetadata(username) {
		const authKeys = await this.getAuthKeys(username);
		await Promise.all([
			this.getKeyValueStorage().removeItem(authKeys.deviceKey),
			this.getKeyValueStorage().removeItem(authKeys.deviceGroupKey),
			this.getKeyValueStorage().removeItem(authKeys.randomPasswordKey)
		]);
	}
	async getAuthKeys(username) {
		assertTokenProviderConfig(this.authConfig?.Cognito);
		const lastAuthUser = username ?? await this.getLastAuthUser();
		return createKeysForAuthStorage$1(AUTH_KEY_PREFIX, `${this.authConfig.Cognito.userPoolClientId}.${lastAuthUser}`);
	}
	getLastAuthUserKey() {
		assertTokenProviderConfig(this.authConfig?.Cognito);
		return `${AUTH_KEY_PREFIX}.${this.authConfig.Cognito.userPoolClientId}.LastAuthUser`;
	}
	async getLastAuthUser() {
		return await this.getKeyValueStorage().getItem(this.getLastAuthUserKey()) ?? "username";
	}
	async setOAuthMetadata(metadata) {
		const { oauthMetadata: oauthMetadataKey } = await this.getAuthKeys();
		await this.getKeyValueStorage().setItem(oauthMetadataKey, JSON.stringify(metadata));
	}
	async getOAuthMetadata() {
		const { oauthMetadata: oauthMetadataKey } = await this.getAuthKeys();
		const oauthMetadata = await this.getKeyValueStorage().getItem(oauthMetadataKey);
		return oauthMetadata && JSON.parse(oauthMetadata);
	}
};
var createKeysForAuthStorage$1 = (provider, identifier) => {
	return getAuthStorageKeys(AuthTokenStorageKeys)(`${provider}`, identifier);
};
function getAuthStorageKeys(authKeys) {
	const keys = Object.values({ ...authKeys });
	return (prefix, identifier) => keys.reduce((acc, authKey) => ({
		...acc,
		[authKey]: `${prefix}.${identifier}.${authKey}`
	}), {});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/signInWithRedirectStore.mjs
var V5_HOSTED_UI_KEY = "amplify-signin-with-hostedUI";
var OAUTH_INFLIGHT_TTL_MS = 3e5;
var DefaultOAuthStore = class {
	constructor(keyValueStorage) {
		this.keyValueStorage = keyValueStorage;
	}
	async clearOAuthInflightData() {
		assertTokenProviderConfig(this.cognitoConfig);
		const authKeys = createKeysForAuthStorage(AUTH_KEY_PREFIX, this.cognitoConfig.userPoolClientId);
		await Promise.all([
			this.keyValueStorage.removeItem(authKeys.inflightOAuth),
			this.keyValueStorage.removeItem(authKeys.inflightOAuthDeadline),
			this.keyValueStorage.removeItem(authKeys.oauthPKCE),
			this.keyValueStorage.removeItem(authKeys.oauthState)
		]);
	}
	async clearOAuthData() {
		assertTokenProviderConfig(this.cognitoConfig);
		const authKeys = createKeysForAuthStorage(AUTH_KEY_PREFIX, this.cognitoConfig.userPoolClientId);
		await this.clearOAuthInflightData();
		await this.keyValueStorage.removeItem(V5_HOSTED_UI_KEY);
		return this.keyValueStorage.removeItem(authKeys.oauthSignIn);
	}
	loadOAuthState() {
		assertTokenProviderConfig(this.cognitoConfig);
		const authKeys = createKeysForAuthStorage(AUTH_KEY_PREFIX, this.cognitoConfig.userPoolClientId);
		return this.keyValueStorage.getItem(authKeys.oauthState);
	}
	storeOAuthState(state) {
		assertTokenProviderConfig(this.cognitoConfig);
		const authKeys = createKeysForAuthStorage(AUTH_KEY_PREFIX, this.cognitoConfig.userPoolClientId);
		return this.keyValueStorage.setItem(authKeys.oauthState, state);
	}
	loadPKCE() {
		assertTokenProviderConfig(this.cognitoConfig);
		const authKeys = createKeysForAuthStorage(AUTH_KEY_PREFIX, this.cognitoConfig.userPoolClientId);
		return this.keyValueStorage.getItem(authKeys.oauthPKCE);
	}
	storePKCE(pkce) {
		assertTokenProviderConfig(this.cognitoConfig);
		const authKeys = createKeysForAuthStorage(AUTH_KEY_PREFIX, this.cognitoConfig.userPoolClientId);
		return this.keyValueStorage.setItem(authKeys.oauthPKCE, pkce);
	}
	setAuthConfig(authConfigParam) {
		this.cognitoConfig = authConfigParam;
	}
	async loadOAuthInFlight() {
		assertTokenProviderConfig(this.cognitoConfig);
		const authKeys = createKeysForAuthStorage(AUTH_KEY_PREFIX, this.cognitoConfig.userPoolClientId);
		return await this.keyValueStorage.getItem(authKeys.inflightOAuth) === "true";
	}
	async loadOAuthInFlightDeadline() {
		assertTokenProviderConfig(this.cognitoConfig);
		const { userPoolClientId } = this.cognitoConfig;
		if (!await this.loadOAuthInFlight()) return;
		const authKeys = createKeysForAuthStorage(AUTH_KEY_PREFIX, userPoolClientId);
		const storedDeadline = await this.keyValueStorage.getItem(authKeys.inflightOAuthDeadline);
		let deadline = Number(storedDeadline);
		if (storedDeadline === null || Number.isNaN(deadline)) {
			deadline = Date.now() + OAUTH_INFLIGHT_TTL_MS;
			await this.keyValueStorage.setItem(authKeys.inflightOAuthDeadline, String(deadline));
		}
		return deadline > Date.now() ? deadline : void 0;
	}
	async storeOAuthInFlight(inflight) {
		assertTokenProviderConfig(this.cognitoConfig);
		const authKeys = createKeysForAuthStorage(AUTH_KEY_PREFIX, this.cognitoConfig.userPoolClientId);
		if (inflight) await this.keyValueStorage.setItem(authKeys.inflightOAuthDeadline, String(Date.now() + OAUTH_INFLIGHT_TTL_MS));
		else await this.keyValueStorage.removeItem(authKeys.inflightOAuthDeadline);
		await this.keyValueStorage.setItem(authKeys.inflightOAuth, `${inflight}`);
	}
	async loadOAuthSignIn() {
		assertTokenProviderConfig(this.cognitoConfig);
		const authKeys = createKeysForAuthStorage(AUTH_KEY_PREFIX, this.cognitoConfig.userPoolClientId);
		const isLegacyHostedUISignIn = await this.keyValueStorage.getItem(V5_HOSTED_UI_KEY);
		const [isOAuthSignIn, preferPrivateSession] = (await this.keyValueStorage.getItem(authKeys.oauthSignIn))?.split(",") ?? [];
		return {
			isOAuthSignIn: isOAuthSignIn === "true" || isLegacyHostedUISignIn === "true",
			preferPrivateSession: preferPrivateSession === "true"
		};
	}
	async storeOAuthSignIn(oauthSignIn, preferPrivateSession = false) {
		assertTokenProviderConfig(this.cognitoConfig);
		const authKeys = createKeysForAuthStorage(AUTH_KEY_PREFIX, this.cognitoConfig.userPoolClientId);
		await this.keyValueStorage.setItem(authKeys.oauthSignIn, `${oauthSignIn},${preferPrivateSession}`);
	}
};
var createKeysForAuthStorage = (provider, identifier) => {
	return getAuthStorageKeys(OAuthStorageKeys)(provider, identifier);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/oAuthStore.mjs
var oAuthStore = new DefaultOAuthStore(defaultStorage);
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/inflightPromise.mjs
var inflightPromises = [];
var deadlineTimer;
var addInflightPromise = (resolver) => {
	inflightPromises.push(resolver);
};
/**
* Arms (or re-arms) the backstop timer that releases parked token consumers
* once the inflight OAuth blocking deadline passes.
*
* On fire it re-reads the deadline instead of trusting the armed one: a fresh
* `signInWithRedirect` may have renewed it (re-arm for the new deadline), or
* the flow may have been released through another path already (the re-check
* returns `undefined` and draining is a no-op). The release is purely local —
* it never mutates shared OAuth state, so another tab's still-running flow is
* left intact.
*
* Note: browsers throttle timers in background tabs, which may delay (never
* prevent) this release; the cross-tab storage listener remains the fast path.
*/
var armInflightDeadline = (deadline, recheckDeadline) => {
	if (deadlineTimer !== void 0) clearTimeout(deadlineTimer);
	deadlineTimer = setTimeout(() => {
		deadlineTimer = void 0;
		recheckDeadline().then((renewedDeadline) => {
			if (renewedDeadline !== void 0) {
				armInflightDeadline(renewedDeadline, recheckDeadline);
				return;
			}
			resolveAndClearInflightPromises();
		}).catch(() => {
			resolveAndClearInflightPromises();
		});
	}, Math.max(0, deadline - Date.now()));
};
var resolveAndClearInflightPromises = () => {
	if (deadlineTimer !== void 0) {
		clearTimeout(deadlineTimer);
		deadlineTimer = void 0;
	}
	while (inflightPromises.length) inflightPromises.pop()?.();
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/tokenProvider/TokenOrchestrator.mjs
var TokenOrchestrator = class {
	constructor() {
		this.waitForInflightOAuth = isBrowser() ? async () => {
			const deadline = await oAuthStore.loadOAuthInFlightDeadline();
			if (deadline === void 0) return;
			if (this.inflightPromise) {
				armInflightDeadline(deadline, () => oAuthStore.loadOAuthInFlightDeadline());
				return this.inflightPromise;
			}
			this.inflightPromise = new Promise((resolve) => {
				addInflightPromise(() => {
					this.inflightPromise = void 0;
					resolve();
				});
				armInflightDeadline(deadline, () => oAuthStore.loadOAuthInFlightDeadline());
			});
			return this.inflightPromise;
		} : async () => {};
	}
	setAuthConfig(authConfig) {
		oAuthStore.setAuthConfig(authConfig.Cognito);
		this.authConfig = authConfig;
	}
	setTokenRefresher(tokenRefresher) {
		this.tokenRefresher = tokenRefresher;
	}
	setAuthTokenStore(tokenStore) {
		this.tokenStore = tokenStore;
	}
	getTokenStore() {
		if (!this.tokenStore) throw new AuthError({
			name: "EmptyTokenStoreException",
			message: "TokenStore not set"
		});
		return this.tokenStore;
	}
	getTokenRefresher() {
		if (!this.tokenRefresher) throw new AuthError({
			name: "EmptyTokenRefresherException",
			message: "TokenRefresher not set"
		});
		return this.tokenRefresher;
	}
	setClientMetadataProvider(clientMetadataProvider) {
		this.clientMetadataProvider = clientMetadataProvider;
	}
	async getTokens(options) {
		let tokens;
		try {
			assertTokenProviderConfig(this.authConfig?.Cognito);
		} catch (_err) {
			return null;
		}
		await this.waitForInflightOAuth();
		tokens = await this.getTokenStore().loadTokens();
		const username = await this.getTokenStore().getLastAuthUser();
		if (tokens === null) return null;
		const idTokenExpired = !!tokens?.idToken && isTokenExpired({
			expiresAt: (tokens.idToken?.payload?.exp ?? 0) * 1e3,
			clockDrift: tokens.clockDrift ?? 0
		});
		const accessTokenExpired = isTokenExpired({
			expiresAt: (tokens.accessToken?.payload?.exp ?? 0) * 1e3,
			clockDrift: tokens.clockDrift ?? 0
		});
		if (options?.forceRefresh || idTokenExpired || accessTokenExpired) {
			tokens = await this.refreshTokens({
				tokens,
				username,
				clientMetadata: options?.clientMetadata ?? await this.clientMetadataProvider?.()
			});
			if (tokens === null) return null;
		}
		return {
			accessToken: tokens?.accessToken,
			idToken: tokens?.idToken,
			signInDetails: tokens?.signInDetails
		};
	}
	async refreshTokens({ tokens, username, clientMetadata }) {
		try {
			const { signInDetails } = tokens;
			const newTokens = await this.getTokenRefresher()({
				tokens,
				authConfig: this.authConfig,
				username,
				clientMetadata
			});
			newTokens.signInDetails = signInDetails;
			await this.setTokens({ tokens: newTokens });
			Hub.dispatch("auth", { event: "tokenRefresh" }, "Auth", AMPLIFY_SYMBOL);
			return newTokens;
		} catch (err) {
			return this.handleErrors(err);
		}
	}
	handleErrors(err) {
		assertServiceError(err);
		if (this.isAuthenticationError(err)) this.clearTokens();
		Hub.dispatch("auth", {
			event: "tokenRefresh_failure",
			data: { error: err }
		}, "Auth", AMPLIFY_SYMBOL);
		if (err.name.startsWith("NotAuthorizedException")) return null;
		throw err;
	}
	isAuthenticationError(err) {
		return [
			"NotAuthorizedException",
			"TokenRevokedException",
			"UserNotFoundException",
			"PasswordResetRequiredException",
			"UserNotConfirmedException",
			"RefreshTokenReuseException"
		].some((errorName) => err?.name?.startsWith?.(errorName));
	}
	async setTokens({ tokens }) {
		return this.getTokenStore().storeTokens(tokens);
	}
	async clearTokens() {
		return this.getTokenStore().clearTokens();
	}
	getDeviceMetadata(username) {
		return this.getTokenStore().getDeviceMetadata(username);
	}
	clearDeviceMetadata(username) {
		return this.getTokenStore().clearDeviceMetadata(username);
	}
	setOAuthMetadata(metadata) {
		return this.getTokenStore().setOAuthMetadata(metadata);
	}
	getOAuthMetadata() {
		return this.getTokenStore().getOAuthMetadata();
	}
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/tokenProvider/CognitoUserPoolsTokenProvider.mjs
var CognitoUserPoolsTokenProvider = class {
	constructor() {
		this.authTokenStore = new DefaultTokenStore();
		this.authTokenStore.setKeyValueStorage(defaultStorage);
		this.authTokenStore.setupNotify();
		this.tokenOrchestrator = new TokenOrchestrator();
		this.tokenOrchestrator.setAuthTokenStore(this.authTokenStore);
		this.tokenOrchestrator.setTokenRefresher(refreshAuthTokens);
	}
	getTokens(options = {}) {
		return this.tokenOrchestrator.getTokens(options);
	}
	setKeyValueStorage(keyValueStorage) {
		this.authTokenStore.setKeyValueStorage(keyValueStorage);
	}
	/**
	* Tears down the cross-tab storage listener held by the underlying token
	* store. Intended for tests, HMR, and micro-frontend teardown; safe no-op
	* when notify was never set up.
	*/
	teardownNotify() {
		this.authTokenStore.teardownNotify();
	}
	setClientMetadataProvider(clientMetadataProvider) {
		this.tokenOrchestrator.setClientMetadataProvider(clientMetadataProvider);
	}
	setAuthConfig(authConfig) {
		this.authTokenStore.setAuthConfig(authConfig);
		this.tokenOrchestrator.setAuthConfig(authConfig);
	}
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/tokenProvider/tokenProvider.mjs
/**
* The default provider for the JWT access token and ID token issued from the configured Cognito user pool. It manages
* the refresh and storage of the tokens. It stores the tokens in `window.localStorage` if available, and falls back to
* in-memory storage if not.
*/
var cognitoUserPoolsTokenProvider = new CognitoUserPoolsTokenProvider();
var { tokenOrchestrator } = cognitoUserPoolsTokenProvider;
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/tokenProvider/cacheTokens.mjs
async function cacheCognitoTokens(AuthenticationResult, orchestrator) {
	if (AuthenticationResult.AccessToken) {
		const accessToken = decodeJWT(AuthenticationResult.AccessToken);
		const accessTokenIssuedAtInMillis = (accessToken.payload.iat || 0) * 1e3;
		const currentTime = (/* @__PURE__ */ new Date()).getTime();
		const clockDrift = accessTokenIssuedAtInMillis > 0 ? accessTokenIssuedAtInMillis - currentTime : 0;
		let idToken;
		let refreshToken;
		let deviceMetadata;
		if (AuthenticationResult.RefreshToken) refreshToken = AuthenticationResult.RefreshToken;
		if (AuthenticationResult.IdToken) idToken = decodeJWT(AuthenticationResult.IdToken);
		if (AuthenticationResult?.NewDeviceMetadata) deviceMetadata = AuthenticationResult.NewDeviceMetadata;
		const tokens = {
			accessToken,
			idToken,
			refreshToken,
			clockDrift,
			deviceMetadata,
			username: AuthenticationResult.username
		};
		if (AuthenticationResult?.signInDetails) tokens.signInDetails = AuthenticationResult.signInDetails;
		await (orchestrator ?? tokenOrchestrator).setTokens({ tokens });
	} else throw new AmplifyError({
		message: "Invalid tokens",
		name: "InvalidTokens",
		recoverySuggestion: "Check Cognito UserPool settings"
	});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/tokenProvider/contextTokenOrchestrators.mjs
/**
* Resolves the write-capable token orchestrator for the given context.
*
* Returns the per-context orchestrator registered for the context's token
* provider when one exists (the `createAmplifyContext()` path), and falls back
* to the module-level singleton for the global `Amplify.configure()` path.
*
* This MUST be called at the entry point of a flow (e.g. `signInWithSRP`) so
* every step downstream — including early device-metadata reads — uses the same
* correctly configured orchestrator. Internal only.
*/
var resolveTokenOrchestrator = (ctx) => getContextTokenOrchestrator(ctx?.libraryOptions?.Auth?.tokenProvider) ?? tokenOrchestrator;
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/dispatchSignedInHubEvent.mjs
var ERROR_MESSAGE = "Unable to get user session following successful sign-in.";
var dispatchSignedInHubEvent = async (ctx) => {
	try {
		Hub.dispatch("auth", {
			event: "signedIn",
			data: await getCurrentUser(ctx)
		}, "Auth", AMPLIFY_SYMBOL);
	} catch (error) {
		if (error.name === "UserUnAuthenticatedException") throw new AuthError({
			name: UNEXPECTED_SIGN_IN_INTERRUPTION_EXCEPTION,
			message: ERROR_MESSAGE,
			recoverySuggestion: "This most likely is due to auth tokens not being persisted. If you are using cookie store, please ensure cookies can be correctly set from your server."
		});
		throw error;
	}
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/utils/store/signInStore.mjs
var MS_TO_EXPIRY = 18e4;
var TGT_STATE = "CognitoSignInState";
var SIGN_IN_STATE_KEYS = {
	username: `${TGT_STATE}.username`,
	challengeName: `${TGT_STATE}.challengeName`,
	signInSession: `${TGT_STATE}.signInSession`,
	expiry: `${TGT_STATE}.expiry`
};
var signInReducer = (state, action) => {
	switch (action.type) {
		case "SET_SIGN_IN_SESSION":
			persistSignInState({ signInSession: action.value });
			return {
				...state,
				signInSession: action.value
			};
		case "SET_SIGN_IN_STATE":
			persistSignInState(action.value);
			return { ...action.value };
		case "SET_CHALLENGE_NAME":
			persistSignInState({ challengeName: action.value });
			return {
				...state,
				challengeName: action.value
			};
		case "SET_USERNAME":
			persistSignInState({ username: action.value });
			return {
				...state,
				username: action.value
			};
		case "SET_INITIAL_STATE": return getInitialState();
		case "RESET_STATE":
			clearPersistedSignInState();
			return getDefaultState();
		default: return state;
	}
};
var isExpired = (expiryDate) => {
	return Number(expiryDate) <= Date.now();
};
var resetActiveSignInState = () => {
	signInStore.dispatch({ type: "RESET_STATE" });
};
var clearPersistedSignInState = () => {
	for (const stateKey of Object.values(SIGN_IN_STATE_KEYS)) syncSessionStorage.removeItem(stateKey);
};
var getDefaultState = () => ({
	username: void 0,
	challengeName: void 0,
	signInSession: void 0
});
var getInitialState = () => {
	const expiry = syncSessionStorage.getItem(SIGN_IN_STATE_KEYS.expiry);
	if (!expiry || isExpired(expiry)) {
		clearPersistedSignInState();
		return getDefaultState();
	}
	return {
		username: syncSessionStorage.getItem(SIGN_IN_STATE_KEYS.username) ?? void 0,
		challengeName: syncSessionStorage.getItem(SIGN_IN_STATE_KEYS.challengeName) ?? void 0,
		signInSession: syncSessionStorage.getItem(SIGN_IN_STATE_KEYS.signInSession) ?? void 0
	};
};
var createStore = (reducer) => {
	let currentState = reducer(getDefaultState(), { type: "SET_INITIAL_STATE" });
	return {
		getState: () => currentState,
		dispatch: (action) => {
			currentState = reducer(currentState, action);
		}
	};
};
var signInStore = createStore(signInReducer);
function setActiveSignInState(state) {
	signInStore.dispatch({
		type: "SET_SIGN_IN_STATE",
		value: state
	});
}
var persistSignInState = ({ challengeName, signInSession, username }) => {
	username && syncSessionStorage.setItem(SIGN_IN_STATE_KEYS.username, username);
	challengeName && syncSessionStorage.setItem(SIGN_IN_STATE_KEYS.challengeName, challengeName);
	if (signInSession) {
		syncSessionStorage.setItem(SIGN_IN_STATE_KEYS.signInSession, signInSession);
		syncSessionStorage.setItem(SIGN_IN_STATE_KEYS.expiry, String(Date.now() + MS_TO_EXPIRY));
	}
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/utils/passkey/errors/passkeyErrorPlatformConstants.mjs
var NOT_SUPPORTED_RECOVERY_SUGGESTION = "Passkeys may not be supported on this device. Ensure your application is running in a secure context (HTTPS) and Web Authentication API is supported.";
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/utils/passkey/errors/passkeyError.mjs
var PasskeyError = class PasskeyError extends AmplifyError {
	constructor(params) {
		super(params);
		this.constructor = PasskeyError;
		Object.setPrototypeOf(this, PasskeyError.prototype);
	}
};
var PasskeyErrorCode;
(function(PasskeyErrorCode) {
	PasskeyErrorCode["PasskeyNotSupported"] = "PasskeyNotSupported";
	PasskeyErrorCode["PasskeyAlreadyExists"] = "PasskeyAlreadyExists";
	PasskeyErrorCode["InvalidPasskeyRegistrationOptions"] = "InvalidPasskeyRegistrationOptions";
	PasskeyErrorCode["InvalidPasskeyAuthenticationOptions"] = "InvalidPasskeyAuthenticationOptions";
	PasskeyErrorCode["RelyingPartyMismatch"] = "RelyingPartyMismatch";
	PasskeyErrorCode["PasskeyRegistrationFailed"] = "PasskeyRegistrationFailed";
	PasskeyErrorCode["PasskeyRetrievalFailed"] = "PasskeyRetrievalFailed";
	PasskeyErrorCode["PasskeyRegistrationCanceled"] = "PasskeyRegistrationCanceled";
	PasskeyErrorCode["PasskeyAuthenticationCanceled"] = "PasskeyAuthenticationCanceled";
	PasskeyErrorCode["PasskeyOperationAborted"] = "PasskeyOperationAborted";
})(PasskeyErrorCode || (PasskeyErrorCode = {}));
var ABORT_OR_CANCEL_RECOVERY_SUGGESTION = "User may have canceled the ceremony or another interruption has occurred. Check underlying error for details.";
var MISCONFIGURATION_RECOVERY_SUGGESTION = "Ensure your user pool is configured to support the WEB_AUTHN as an authentication factor.";
var passkeyErrorMap = {
	[PasskeyErrorCode.PasskeyNotSupported]: {
		message: "Passkeys may not be supported on this device.",
		recoverySuggestion: NOT_SUPPORTED_RECOVERY_SUGGESTION
	},
	[PasskeyErrorCode.InvalidPasskeyRegistrationOptions]: {
		message: "Invalid passkey registration options.",
		recoverySuggestion: MISCONFIGURATION_RECOVERY_SUGGESTION
	},
	[PasskeyErrorCode.InvalidPasskeyAuthenticationOptions]: {
		message: "Invalid passkey authentication options.",
		recoverySuggestion: MISCONFIGURATION_RECOVERY_SUGGESTION
	},
	[PasskeyErrorCode.PasskeyRegistrationFailed]: {
		message: "Device failed to create passkey.",
		recoverySuggestion: NOT_SUPPORTED_RECOVERY_SUGGESTION
	},
	[PasskeyErrorCode.PasskeyRetrievalFailed]: {
		message: "Device failed to retrieve passkey.",
		recoverySuggestion: "Passkeys may not be available on this device. Try an alternative authentication factor like PASSWORD, EMAIL_OTP, or SMS_OTP."
	},
	[PasskeyErrorCode.PasskeyAlreadyExists]: {
		message: "Passkey already exists in authenticator.",
		recoverySuggestion: "Proceed with existing passkey or try again after deleting the credential."
	},
	[PasskeyErrorCode.PasskeyRegistrationCanceled]: {
		message: "Passkey registration ceremony has been canceled.",
		recoverySuggestion: ABORT_OR_CANCEL_RECOVERY_SUGGESTION
	},
	[PasskeyErrorCode.PasskeyAuthenticationCanceled]: {
		message: "Passkey authentication ceremony has been canceled.",
		recoverySuggestion: ABORT_OR_CANCEL_RECOVERY_SUGGESTION
	},
	[PasskeyErrorCode.PasskeyOperationAborted]: {
		message: "Passkey operation has been aborted.",
		recoverySuggestion: ABORT_OR_CANCEL_RECOVERY_SUGGESTION
	},
	[PasskeyErrorCode.RelyingPartyMismatch]: {
		message: "Relying party does not match current domain.",
		recoverySuggestion: "Ensure relying party identifier matches current domain."
	}
};
var assertPasskeyError = createAssertionFunction(passkeyErrorMap, PasskeyError);
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/utils/passkey/errors/handlePasskeyError.mjs
/**
* Handles Overlapping Passkey Errors Between Registration & Authentication
* https://w3c.github.io/webauthn/#sctn-create-request-exceptions
* https://w3c.github.io/webauthn/#sctn-get-request-exceptions
*
* @param err unknown
* @returns PasskeyError
*/
var handlePasskeyError = (err) => {
	if (err instanceof Error) {
		if (err.name === "AbortError") {
			const { message, recoverySuggestion } = passkeyErrorMap[PasskeyErrorCode.PasskeyOperationAborted];
			return new PasskeyError({
				name: PasskeyErrorCode.PasskeyOperationAborted,
				message,
				recoverySuggestion,
				underlyingError: err
			});
		}
		if (err.name === "SecurityError") {
			const { message, recoverySuggestion } = passkeyErrorMap[PasskeyErrorCode.RelyingPartyMismatch];
			return new PasskeyError({
				name: PasskeyErrorCode.RelyingPartyMismatch,
				message,
				recoverySuggestion,
				underlyingError: err
			});
		}
	}
	return new PasskeyError({
		name: AmplifyErrorCode.Unknown,
		message: "An unknown error has occurred.",
		underlyingError: err
	});
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/utils/passkey/errors/handlePasskeyAuthenticationError.mjs
/**
* Handle Passkey Authentication Errors
* https://w3c.github.io/webauthn/#sctn-get-request-exceptions
*
* @param err unknown
* @returns PasskeyError
*/
var handlePasskeyAuthenticationError = (err) => {
	if (err instanceof PasskeyError) return err;
	if (err instanceof Error) {
		if (err.name === "NotAllowedError") {
			const { message, recoverySuggestion } = passkeyErrorMap[PasskeyErrorCode.PasskeyAuthenticationCanceled];
			return new PasskeyError({
				name: PasskeyErrorCode.PasskeyAuthenticationCanceled,
				message,
				recoverySuggestion,
				underlyingError: err
			});
		}
	}
	return handlePasskeyError(err);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/utils/passkey/getIsPasskeySupported.mjs
/**
* Determines if passkey is supported in current context
* Will return false if executed in non-secure context
* @returns boolean
*/
var getIsPasskeySupported = () => {
	return isBrowser() && window.isSecureContext && "credentials" in navigator && typeof window.PublicKeyCredential === "function";
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/convert/base64url/convertArrayBufferToBase64Url.mjs
/**
* Converts an ArrayBuffer to a base64url encoded string
* @param buffer - the ArrayBuffer instance of a Uint8Array
* @returns string - a base64url encoded string
*/
var convertArrayBufferToBase64Url = (buffer) => {
	return base64Encoder.convert(new Uint8Array(buffer), {
		urlSafe: true,
		skipPadding: true
	});
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/convert/base64url/convertBase64UrlToArrayBuffer.mjs
/**
* Converts a base64url encoded string to an ArrayBuffer
* @param base64url - a base64url encoded string
* @returns ArrayBuffer
*/
var convertBase64UrlToArrayBuffer = (base64url) => {
	return Uint8Array.from(base64Decoder.convert(base64url, { urlSafe: true }), (x) => x.charCodeAt(0)).buffer;
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/utils/passkey/serde.mjs
/**
* Deserializes Public Key Credential Creation Options JSON
* @param input PasskeyCreateOptionsJson
* @returns PublicKeyCredentialCreationOptions
*/
var deserializeJsonToPkcCreationOptions = (input) => {
	const userIdBuffer = convertBase64UrlToArrayBuffer(input.user.id);
	const challengeBuffer = convertBase64UrlToArrayBuffer(input.challenge);
	const excludeCredentialsWithBuffer = (input.excludeCredentials || []).map((excludeCred) => ({
		...excludeCred,
		id: convertBase64UrlToArrayBuffer(excludeCred.id)
	}));
	return {
		...input,
		excludeCredentials: excludeCredentialsWithBuffer,
		challenge: challengeBuffer,
		user: {
			...input.user,
			id: userIdBuffer
		}
	};
};
/**
* Serializes a Public Key Credential With Attestation to JSON
* @param input PasskeyCreateResult
* @returns PasskeyCreateResultJson
*/
var serializePkcWithAttestationToJson = (input) => {
	const response = {
		clientDataJSON: convertArrayBufferToBase64Url(input.response.clientDataJSON),
		attestationObject: convertArrayBufferToBase64Url(input.response.attestationObject),
		transports: input.response.getTransports(),
		publicKeyAlgorithm: input.response.getPublicKeyAlgorithm(),
		authenticatorData: convertArrayBufferToBase64Url(input.response.getAuthenticatorData())
	};
	const publicKey = input.response.getPublicKey();
	if (publicKey) response.publicKey = convertArrayBufferToBase64Url(publicKey);
	const resultJson = {
		type: input.type,
		id: input.id,
		rawId: convertArrayBufferToBase64Url(input.rawId),
		clientExtensionResults: input.getClientExtensionResults(),
		response
	};
	if (input.authenticatorAttachment) resultJson.authenticatorAttachment = input.authenticatorAttachment;
	return resultJson;
};
/**
* Deserializes Public Key Credential Get Options JSON
* @param input PasskeyGetOptionsJson
* @returns PublicKeyCredentialRequestOptions
*/
var deserializeJsonToPkcGetOptions = (input) => {
	const challengeBuffer = convertBase64UrlToArrayBuffer(input.challenge);
	const allowedCredentialsWithBuffer = (input.allowCredentials || []).map((allowedCred) => ({
		...allowedCred,
		id: convertBase64UrlToArrayBuffer(allowedCred.id)
	}));
	return {
		...input,
		challenge: challengeBuffer,
		allowCredentials: allowedCredentialsWithBuffer
	};
};
/**
* Serializes a Public Key Credential With Attestation to JSON
* @param input PasskeyGetResult
* @returns PasskeyGetResultJson
*/
var serializePkcWithAssertionToJson = (input) => {
	const response = {
		clientDataJSON: convertArrayBufferToBase64Url(input.response.clientDataJSON),
		authenticatorData: convertArrayBufferToBase64Url(input.response.authenticatorData),
		signature: convertArrayBufferToBase64Url(input.response.signature)
	};
	if (input.response.userHandle) response.userHandle = convertArrayBufferToBase64Url(input.response.userHandle);
	const resultJson = {
		id: input.id,
		rawId: convertArrayBufferToBase64Url(input.rawId),
		type: input.type,
		clientExtensionResults: input.getClientExtensionResults(),
		response
	};
	if (input.authenticatorAttachment) resultJson.authenticatorAttachment = input.authenticatorAttachment;
	return resultJson;
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/utils/passkey/types/index.mjs
function assertCredentialIsPkcWithAuthenticatorAttestationResponse(credential) {
	assertPasskeyError(credential && credential instanceof PublicKeyCredential && credential.response instanceof AuthenticatorAttestationResponse, PasskeyErrorCode.PasskeyRegistrationFailed);
}
function assertCredentialIsPkcWithAuthenticatorAssertionResponse(credential) {
	assertPasskeyError(credential && credential instanceof PublicKeyCredential && credential.response instanceof AuthenticatorAssertionResponse, PasskeyErrorCode.PasskeyRetrievalFailed);
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/utils/passkey/getPasskey.mjs
var getPasskey = async (input) => {
	try {
		assertPasskeyError(getIsPasskeySupported(), PasskeyErrorCode.PasskeyNotSupported);
		const passkeyGetOptions = deserializeJsonToPkcGetOptions(input);
		const credential = await navigator.credentials.get({ publicKey: passkeyGetOptions });
		assertCredentialIsPkcWithAuthenticatorAssertionResponse(credential);
		return serializePkcWithAssertionToJson(credential);
	} catch (err) {
		throw handlePasskeyAuthenticationError(err);
	}
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createConfirmDeviceClient.mjs
var createConfirmDeviceClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("ConfirmDevice"), createUserPoolDeserializer(), {
	...DEFAULT_SERVICE_CLIENT_API_CONFIG,
	...config
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/textEncoder/index.mjs
var textEncoder = { convert(input) {
	return new TextEncoder().encode(input);
} };
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/BigInteger/BigInteger.mjs
function BigInteger(a, b) {
	if (a != null) this.fromString(a, b);
}
function nbi() {
	return new BigInteger(null, null);
}
var dbits;
function am1(i, x, w, j, c, n) {
	while (--n >= 0) {
		const v = x * this[i++] + w[j] + c;
		c = Math.floor(v / 67108864);
		w[j++] = v & 67108863;
	}
	return c;
}
function am2(i, x, w, j, c, n) {
	const xl = x & 32767;
	const xh = x >> 15;
	while (--n >= 0) {
		let l = this[i] & 32767;
		const h = this[i++] >> 15;
		const m = xh * l + h * xl;
		l = xl * l + ((m & 32767) << 15) + w[j] + (c & 1073741823);
		c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
		w[j++] = l & 1073741823;
	}
	return c;
}
function am3(i, x, w, j, c, n) {
	const xl = x & 16383;
	const xh = x >> 14;
	while (--n >= 0) {
		let l = this[i] & 16383;
		const h = this[i++] >> 14;
		const m = xh * l + h * xl;
		l = xl * l + ((m & 16383) << 14) + w[j] + c;
		c = (l >> 28) + (m >> 14) + xh * h;
		w[j++] = l & 268435455;
	}
	return c;
}
var inBrowser = typeof navigator !== "undefined";
if (inBrowser && navigator.appName === "Microsoft Internet Explorer") {
	BigInteger.prototype.am = am2;
	dbits = 30;
} else if (inBrowser && navigator.appName !== "Netscape") {
	BigInteger.prototype.am = am1;
	dbits = 26;
} else {
	BigInteger.prototype.am = am3;
	dbits = 28;
}
BigInteger.prototype.DB = dbits;
BigInteger.prototype.DM = (1 << dbits) - 1;
BigInteger.prototype.DV = 1 << dbits;
var BI_FP = 52;
BigInteger.prototype.FV = Math.pow(2, BI_FP);
BigInteger.prototype.F1 = BI_FP - dbits;
BigInteger.prototype.F2 = 2 * dbits - BI_FP;
var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
var BI_RC = [];
var rr;
var vv;
rr = "0".charCodeAt(0);
for (vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
rr = "a".charCodeAt(0);
for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
rr = "A".charCodeAt(0);
for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
function int2char(n) {
	return BI_RM.charAt(n);
}
function intAt(s, i) {
	const c = BI_RC[s.charCodeAt(i)];
	return c == null ? -1 : c;
}
function bnpCopyTo(r) {
	for (let i = this.t - 1; i >= 0; --i) r[i] = this[i];
	r.t = this.t;
	r.s = this.s;
}
function bnpFromInt(x) {
	this.t = 1;
	this.s = x < 0 ? -1 : 0;
	if (x > 0) this[0] = x;
	else if (x < -1) this[0] = x + this.DV;
	else this.t = 0;
}
function nbv(i) {
	const r = nbi();
	r.fromInt(i);
	return r;
}
function bnpFromString(s, b) {
	let k;
	if (b === 16) k = 4;
	else if (b === 8) k = 3;
	else if (b === 2) k = 1;
	else if (b === 32) k = 5;
	else if (b === 4) k = 2;
	else throw new Error("Only radix 2, 4, 8, 16, 32 are supported");
	this.t = 0;
	this.s = 0;
	let i = s.length;
	let mi = false;
	let sh = 0;
	while (--i >= 0) {
		const x = intAt(s, i);
		if (x < 0) {
			if (s.charAt(i) === "-") mi = true;
			continue;
		}
		mi = false;
		if (sh === 0) this[this.t++] = x;
		else if (sh + k > this.DB) {
			this[this.t - 1] |= (x & (1 << this.DB - sh) - 1) << sh;
			this[this.t++] = x >> this.DB - sh;
		} else this[this.t - 1] |= x << sh;
		sh += k;
		if (sh >= this.DB) sh -= this.DB;
	}
	this.clamp();
	if (mi) BigInteger.ZERO.subTo(this, this);
}
function bnpClamp() {
	const c = this.s & this.DM;
	while (this.t > 0 && this[this.t - 1] == c) --this.t;
}
function bnToString(b) {
	if (this.s < 0) return "-" + this.negate().toString(b);
	let k;
	if (b == 16) k = 4;
	else if (b === 8) k = 3;
	else if (b === 2) k = 1;
	else if (b === 32) k = 5;
	else if (b === 4) k = 2;
	else throw new Error("Only radix 2, 4, 8, 16, 32 are supported");
	const km = (1 << k) - 1;
	let d;
	let m = false;
	let r = "";
	let i = this.t;
	let p = this.DB - i * this.DB % k;
	if (i-- > 0) {
		if (p < this.DB && (d = this[i] >> p) > 0) {
			m = true;
			r = int2char(d);
		}
		while (i >= 0) {
			if (p < k) {
				d = (this[i] & (1 << p) - 1) << k - p;
				d |= this[--i] >> (p += this.DB - k);
			} else {
				d = this[i] >> (p -= k) & km;
				if (p <= 0) {
					p += this.DB;
					--i;
				}
			}
			if (d > 0) m = true;
			if (m) r += int2char(d);
		}
	}
	return m ? r : "0";
}
function bnNegate() {
	const r = nbi();
	BigInteger.ZERO.subTo(this, r);
	return r;
}
function bnAbs() {
	return this.s < 0 ? this.negate() : this;
}
function bnCompareTo(a) {
	let r = this.s - a.s;
	if (r != 0) return r;
	let i = this.t;
	r = i - a.t;
	if (r != 0) return this.s < 0 ? -r : r;
	while (--i >= 0) if ((r = this[i] - a[i]) != 0) return r;
	return 0;
}
function nbits(x) {
	let r = 1;
	let t;
	if ((t = x >>> 16) !== 0) {
		x = t;
		r += 16;
	}
	if ((t = x >> 8) !== 0) {
		x = t;
		r += 8;
	}
	if ((t = x >> 4) !== 0) {
		x = t;
		r += 4;
	}
	if ((t = x >> 2) !== 0) {
		x = t;
		r += 2;
	}
	if ((t = x >> 1) !== 0) {
		x = t;
		r += 1;
	}
	return r;
}
function bnBitLength() {
	if (this.t <= 0) return 0;
	return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ this.s & this.DM);
}
function bnpDLShiftTo(n, r) {
	let i;
	for (i = this.t - 1; i >= 0; --i) r[i + n] = this[i];
	for (i = n - 1; i >= 0; --i) r[i] = 0;
	r.t = this.t + n;
	r.s = this.s;
}
function bnpDRShiftTo(n, r) {
	for (let i = n; i < this.t; ++i) r[i - n] = this[i];
	r.t = Math.max(this.t - n, 0);
	r.s = this.s;
}
function bnpLShiftTo(n, r) {
	const bs = n % this.DB;
	const cbs = this.DB - bs;
	const bm = (1 << cbs) - 1;
	const ds = Math.floor(n / this.DB);
	let c = this.s << bs & this.DM;
	let i;
	for (i = this.t - 1; i >= 0; --i) {
		r[i + ds + 1] = this[i] >> cbs | c;
		c = (this[i] & bm) << bs;
	}
	for (i = ds - 1; i >= 0; --i) r[i] = 0;
	r[ds] = c;
	r.t = this.t + ds + 1;
	r.s = this.s;
	r.clamp();
}
function bnpRShiftTo(n, r) {
	r.s = this.s;
	const ds = Math.floor(n / this.DB);
	if (ds >= this.t) {
		r.t = 0;
		return;
	}
	const bs = n % this.DB;
	const cbs = this.DB - bs;
	const bm = (1 << bs) - 1;
	r[0] = this[ds] >> bs;
	for (let i = ds + 1; i < this.t; ++i) {
		r[i - ds - 1] |= (this[i] & bm) << cbs;
		r[i - ds] = this[i] >> bs;
	}
	if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs;
	r.t = this.t - ds;
	r.clamp();
}
function bnpSubTo(a, r) {
	let i = 0;
	let c = 0;
	const m = Math.min(a.t, this.t);
	while (i < m) {
		c += this[i] - a[i];
		r[i++] = c & this.DM;
		c >>= this.DB;
	}
	if (a.t < this.t) {
		c -= a.s;
		while (i < this.t) {
			c += this[i];
			r[i++] = c & this.DM;
			c >>= this.DB;
		}
		c += this.s;
	} else {
		c += this.s;
		while (i < a.t) {
			c -= a[i];
			r[i++] = c & this.DM;
			c >>= this.DB;
		}
		c -= a.s;
	}
	r.s = c < 0 ? -1 : 0;
	if (c < -1) r[i++] = this.DV + c;
	else if (c > 0) r[i++] = c;
	r.t = i;
	r.clamp();
}
function bnpMultiplyTo(a, r) {
	const x = this.abs();
	const y = a.abs();
	let i = x.t;
	r.t = i + y.t;
	while (--i >= 0) r[i] = 0;
	for (i = 0; i < y.t; ++i) r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
	r.s = 0;
	r.clamp();
	if (this.s !== a.s) BigInteger.ZERO.subTo(r, r);
}
function bnpSquareTo(r) {
	const x = this.abs();
	let i = r.t = 2 * x.t;
	while (--i >= 0) r[i] = 0;
	for (i = 0; i < x.t - 1; ++i) {
		const c = x.am(i, x[i], r, 2 * i, 0, 1);
		if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
			r[i + x.t] -= x.DV;
			r[i + x.t + 1] = 1;
		}
	}
	if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
	r.s = 0;
	r.clamp();
}
function bnpDivRemTo(m, q, r) {
	const pm = m.abs();
	if (pm.t <= 0) return;
	const pt = this.abs();
	if (pt.t < pm.t) {
		if (q != null) q.fromInt(0);
		if (r != null) this.copyTo(r);
		return;
	}
	if (r === null) r = nbi();
	const y = nbi();
	const ts = this.s;
	const ms = m.s;
	const nsh = this.DB - nbits(pm[pm.t - 1]);
	if (nsh > 0) {
		pm.lShiftTo(nsh, y);
		pt.lShiftTo(nsh, r);
	} else {
		pm.copyTo(y);
		pt.copyTo(r);
	}
	const ys = y.t;
	const y0 = y[ys - 1];
	if (y0 === 0) return;
	const yt = y0 * (1 << this.F1) + (ys > 1 ? y[ys - 2] >> this.F2 : 0);
	const d1 = this.FV / yt;
	const d2 = (1 << this.F1) / yt;
	const e = 1 << this.F2;
	let i = r.t;
	let j = i - ys;
	const t = q === null ? nbi() : q;
	y.dlShiftTo(j, t);
	if (r.compareTo(t) >= 0) {
		r[r.t++] = 1;
		r.subTo(t, r);
	}
	BigInteger.ONE.dlShiftTo(ys, t);
	t.subTo(y, y);
	while (y.t < ys) y[y.t++] = 0;
	while (--j >= 0) {
		let qd = r[--i] === y0 ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
		if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
			y.dlShiftTo(j, t);
			r.subTo(t, r);
			while (r[i] < --qd) r.subTo(t, r);
		}
	}
	if (q !== null) {
		r.drShiftTo(ys, q);
		if (ts !== ms) BigInteger.ZERO.subTo(q, q);
	}
	r.t = ys;
	r.clamp();
	if (nsh > 0) r.rShiftTo(nsh, r);
	if (ts < 0) BigInteger.ZERO.subTo(r, r);
}
function bnMod(a) {
	const r = nbi();
	this.abs().divRemTo(a, null, r);
	if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
	return r;
}
function bnpInvDigit() {
	if (this.t < 1) return 0;
	const x = this[0];
	if ((x & 1) === 0) return 0;
	let y = x & 3;
	y = y * (2 - (x & 15) * y) & 15;
	y = y * (2 - (x & 255) * y) & 255;
	y = y * (2 - ((x & 65535) * y & 65535)) & 65535;
	y = y * (2 - x * y % this.DV) % this.DV;
	return y > 0 ? this.DV - y : -y;
}
function bnEquals(a) {
	return this.compareTo(a) === 0;
}
function bnpAddTo(a, r) {
	let i = 0;
	let c = 0;
	const m = Math.min(a.t, this.t);
	while (i < m) {
		c += this[i] + a[i];
		r[i++] = c & this.DM;
		c >>= this.DB;
	}
	if (a.t < this.t) {
		c += a.s;
		while (i < this.t) {
			c += this[i];
			r[i++] = c & this.DM;
			c >>= this.DB;
		}
		c += this.s;
	} else {
		c += this.s;
		while (i < a.t) {
			c += a[i];
			r[i++] = c & this.DM;
			c >>= this.DB;
		}
		c += a.s;
	}
	r.s = c < 0 ? -1 : 0;
	if (c > 0) r[i++] = c;
	else if (c < -1) r[i++] = this.DV + c;
	r.t = i;
	r.clamp();
}
function bnAdd(a) {
	const r = nbi();
	this.addTo(a, r);
	return r;
}
function bnSubtract(a) {
	const r = nbi();
	this.subTo(a, r);
	return r;
}
function bnMultiply(a) {
	const r = nbi();
	this.multiplyTo(a, r);
	return r;
}
function bnDivide(a) {
	const r = nbi();
	this.divRemTo(a, r, null);
	return r;
}
function Montgomery(m) {
	this.m = m;
	this.mp = m.invDigit();
	this.mpl = this.mp & 32767;
	this.mph = this.mp >> 15;
	this.um = (1 << m.DB - 15) - 1;
	this.mt2 = 2 * m.t;
}
function montConvert(x) {
	const r = nbi();
	x.abs().dlShiftTo(this.m.t, r);
	r.divRemTo(this.m, null, r);
	if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
	return r;
}
function montRevert(x) {
	const r = nbi();
	x.copyTo(r);
	this.reduce(r);
	return r;
}
function montReduce(x) {
	while (x.t <= this.mt2) x[x.t++] = 0;
	for (let i = 0; i < this.m.t; ++i) {
		let j = x[i] & 32767;
		const u0 = j * this.mpl + ((j * this.mph + (x[i] >> 15) * this.mpl & this.um) << 15) & x.DM;
		j = i + this.m.t;
		x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
		while (x[j] >= x.DV) {
			x[j] -= x.DV;
			x[++j]++;
		}
	}
	x.clamp();
	x.drShiftTo(this.m.t, x);
	if (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
}
function montSqrTo(x, r) {
	x.squareTo(r);
	this.reduce(r);
}
function montMulTo(x, y, r) {
	x.multiplyTo(y, r);
	this.reduce(r);
}
Montgomery.prototype.convert = montConvert;
Montgomery.prototype.revert = montRevert;
Montgomery.prototype.reduce = montReduce;
Montgomery.prototype.mulTo = montMulTo;
Montgomery.prototype.sqrTo = montSqrTo;
function bnModPow(e, m, callback) {
	let i = e.bitLength();
	let k;
	let r = nbv(1);
	const z = new Montgomery(m);
	if (i <= 0) return r;
	else if (i < 18) k = 1;
	else if (i < 48) k = 3;
	else if (i < 144) k = 4;
	else if (i < 768) k = 5;
	else k = 6;
	const g = [];
	let n = 3;
	const k1 = k - 1;
	const km = (1 << k) - 1;
	g[1] = z.convert(this);
	if (k > 1) {
		const g2 = nbi();
		z.sqrTo(g[1], g2);
		while (n <= km) {
			g[n] = nbi();
			z.mulTo(g2, g[n - 2], g[n]);
			n += 2;
		}
	}
	let j = e.t - 1;
	let w;
	let is1 = true;
	let r2 = nbi();
	let t;
	i = nbits(e[j]) - 1;
	while (j >= 0) {
		if (i >= k1) w = e[j] >> i - k1 & km;
		else {
			w = (e[j] & (1 << i + 1) - 1) << k1 - i;
			if (j > 0) w |= e[j - 1] >> this.DB + i - k1;
		}
		n = k;
		while ((w & 1) === 0) {
			w >>= 1;
			--n;
		}
		if ((i -= n) < 0) {
			i += this.DB;
			--j;
		}
		if (is1) {
			g[w].copyTo(r);
			is1 = false;
		} else {
			while (n > 1) {
				z.sqrTo(r, r2);
				z.sqrTo(r2, r);
				n -= 2;
			}
			if (n > 0) z.sqrTo(r, r2);
			else {
				t = r;
				r = r2;
				r2 = t;
			}
			z.mulTo(r2, g[w], r);
		}
		while (j >= 0 && (e[j] & 1 << i) === 0) {
			z.sqrTo(r, r2);
			t = r;
			r = r2;
			r2 = t;
			if (--i < 0) {
				i = this.DB - 1;
				--j;
			}
		}
	}
	const result = z.revert(r);
	callback(null, result);
	return result;
}
BigInteger.prototype.copyTo = bnpCopyTo;
BigInteger.prototype.fromInt = bnpFromInt;
BigInteger.prototype.fromString = bnpFromString;
BigInteger.prototype.clamp = bnpClamp;
BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
BigInteger.prototype.drShiftTo = bnpDRShiftTo;
BigInteger.prototype.lShiftTo = bnpLShiftTo;
BigInteger.prototype.rShiftTo = bnpRShiftTo;
BigInteger.prototype.subTo = bnpSubTo;
BigInteger.prototype.multiplyTo = bnpMultiplyTo;
BigInteger.prototype.squareTo = bnpSquareTo;
BigInteger.prototype.divRemTo = bnpDivRemTo;
BigInteger.prototype.invDigit = bnpInvDigit;
BigInteger.prototype.addTo = bnpAddTo;
BigInteger.prototype.toString = bnToString;
BigInteger.prototype.negate = bnNegate;
BigInteger.prototype.abs = bnAbs;
BigInteger.prototype.compareTo = bnCompareTo;
BigInteger.prototype.bitLength = bnBitLength;
BigInteger.prototype.mod = bnMod;
BigInteger.prototype.equals = bnEquals;
BigInteger.prototype.add = bnAdd;
BigInteger.prototype.subtract = bnSubtract;
BigInteger.prototype.multiply = bnMultiply;
BigInteger.prototype.divide = bnDivide;
BigInteger.prototype.modPow = bnModPow;
BigInteger.ZERO = nbv(0);
BigInteger.ONE = nbv(1);
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/calculate/calculateS.mjs
/**
* @internal
*/
var calculateS = async ({ a, g, k, x, B, N, U }) => {
	return new Promise((resolve, reject) => {
		g.modPow(x, N, (outerErr, outerResult) => {
			if (outerErr) {
				reject(outerErr);
				return;
			}
			B.subtract(k.multiply(outerResult)).modPow(a.add(U.multiply(x)), N, (innerErr, innerResult) => {
				if (innerErr) {
					reject(innerErr);
					return;
				}
				resolve(innerResult.mod(N));
			});
		});
	});
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/constants.mjs
var INIT_N = "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF";
var SHORT_TO_HEX = {};
var HEX_TO_SHORT = {};
for (let i = 0; i < 256; i++) {
	let encodedByte = i.toString(16).toLowerCase();
	if (encodedByte.length === 1) encodedByte = `0${encodedByte}`;
	SHORT_TO_HEX[i] = encodedByte;
	HEX_TO_SHORT[encodedByte] = i;
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/getBytesFromHex.mjs
/**
* Converts a hexadecimal encoded string to a Uint8Array of bytes.
*
* @param encoded The hexadecimal encoded string
*/
var getBytesFromHex = (encoded) => {
	if (encoded.length % 2 !== 0) throw new Error("Hex encoded strings must have an even number length");
	const out = new Uint8Array(encoded.length / 2);
	for (let i = 0; i < encoded.length; i += 2) {
		const encodedByte = encoded.slice(i, i + 2).toLowerCase();
		if (encodedByte in HEX_TO_SHORT) out[i / 2] = HEX_TO_SHORT[encodedByte];
		else throw new Error(`Cannot decode unrecognized sequence ${encodedByte} as hexadecimal`);
	}
	return out;
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/getHexFromBytes.mjs
/**
* Converts a Uint8Array of binary data to a hexadecimal encoded string.
*
* @param bytes The binary data to encode
*/
var getHexFromBytes = (bytes) => {
	let out = "";
	for (let i = 0; i < bytes.byteLength; i++) out += SHORT_TO_HEX[bytes[i]];
	return out;
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/getHashFromData.mjs
/**
* Calculate a hash from a `SourceData`
* @param {SourceData} data Value to hash.
* @returns {string} Hex-encoded hash.
* @private
*/
var getHashFromData = (data) => {
	const sha256 = new Sha256();
	sha256.update(data);
	const hashHexFromUint8 = getHexFromBytes(sha256.digestSync());
	return new Array(64 - hashHexFromUint8.length).join("0") + hashHexFromUint8;
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/getHashFromHex.mjs
/**
* Calculate a hash from a hex string
* @param {string} hexStr Value to hash.
* @returns {string} Hex-encoded hash.
* @private
*/
var getHashFromHex = (hexStr) => getHashFromData(getBytesFromHex(hexStr));
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/getPaddedHex.mjs
/**
* Tests if a hex string has it most significant bit set (case-insensitive regex)
*/
var HEX_MSB_REGEX = /^[89a-f]/i;
/**
* Returns an unambiguous, even-length hex string of the two's complement encoding of an integer.
*
* It is compatible with the hex encoding of Java's BigInteger's toByteArray(), wich returns a
* byte array containing the two's-complement representation of a BigInteger. The array contains
* the minimum number of bytes required to represent the BigInteger, including at least one sign bit.
*
* Examples showing how ambiguity is avoided by left padding with:
* 	"00" (for positive values where the most-significant-bit is set)
*  "FF" (for negative values where the most-significant-bit is set)
*
* padHex(bigInteger.fromInt(-236))  === "FF14"
* padHex(bigInteger.fromInt(20))    === "14"
*
* padHex(bigInteger.fromInt(-200))  === "FF38"
* padHex(bigInteger.fromInt(56))    === "38"
*
* padHex(bigInteger.fromInt(-20))   === "EC"
* padHex(bigInteger.fromInt(236))   === "00EC"
*
* padHex(bigInteger.fromInt(-56))   === "C8"
* padHex(bigInteger.fromInt(200))   === "00C8"
*
* @param {AuthBigInteger} bigInt Number to encode.
* @returns {String} even-length hex string of the two's complement encoding.
*/
var getPaddedHex = (bigInt) => {
	if (!(bigInt instanceof BigInteger)) throw new Error("Not a BigInteger");
	const isNegative = bigInt.compareTo(BigInteger.ZERO) < 0;
	let hexStr = bigInt.abs().toString(16);
	hexStr = hexStr.length % 2 !== 0 ? `0${hexStr}` : hexStr;
	hexStr = HEX_MSB_REGEX.test(hexStr) ? `00${hexStr}` : hexStr;
	if (isNegative) {
		hexStr = new BigInteger(hexStr.split("").map((x) => {
			const invertedNibble = ~parseInt(x, 16) & 15;
			return "0123456789ABCDEF".charAt(invertedNibble);
		}).join(""), 16).add(BigInteger.ONE).toString(16);
		if (hexStr.toUpperCase().startsWith("FF8")) hexStr = hexStr.substring(2);
	}
	return hexStr;
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/calculate/calculateU.mjs
/**
* @internal
*/
var calculateU = ({ A, B }) => {
	const U = new BigInteger(getHashFromHex(getPaddedHex(A) + getPaddedHex(B)), 16);
	if (U.equals(BigInteger.ZERO)) throw new Error("U cannot be zero.");
	return U;
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/getHkdfKey.mjs
/**
* Standard HKDF algorithm.
*
* @param {Uint8Array} ikm Input key material.
* @param {Uint8Array} salt Salt value.
* @param {Uint8Array} info Context and application specific info.
*
* @returns {Uint8Array} Strong key material.
*
* @internal
*/
var getHkdfKey = (ikm, salt, info) => {
	const awsCryptoHash = new Sha256(salt);
	awsCryptoHash.update(ikm);
	const awsCryptoHashHmac = new Sha256(awsCryptoHash.digestSync());
	awsCryptoHashHmac.update(info);
	return awsCryptoHashHmac.digestSync().slice(0, 16);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/getRandomBytes.mjs
/**
* Returns a Uint8Array with a sequence of random nBytes
*
* @param {number} nBytes
* @returns {Uint8Array} fixed-length sequence of random bytes
*/
var getRandomBytes = (nBytes) => {
	return getBytesFromHex(new WordArray().random(nBytes).toString());
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/getRandomString.mjs
/**
* Helper function to generate a random string
* @returns {string} a random value.
*
* @internal
*/
var getRandomString = () => base64Encoder.convert(getRandomBytes(40));
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/AuthenticationHelper/AuthenticationHelper.mjs
/** @class */
var AuthenticationHelper = class {
	constructor({ userPoolName, a, g, A, N }) {
		this.encoder = textEncoder;
		this.userPoolName = userPoolName;
		this.a = a;
		this.g = g;
		this.A = A;
		this.N = N;
		this.k = new BigInteger(getHashFromHex(`${getPaddedHex(N)}${getPaddedHex(g)}`), 16);
	}
	/**
	* @returns {string} Generated random value included in password hash.
	*/
	getRandomPassword() {
		if (!this.randomPassword) throw new AuthError({
			name: "EmptyBigIntegerRandomPassword",
			message: "random password is empty"
		});
		return this.randomPassword;
	}
	/**
	* @returns {string} Generated random value included in devices hash.
	*/
	getSaltToHashDevices() {
		if (!this.saltToHashDevices) throw new AuthError({
			name: "EmptyBigIntegersaltToHashDevices",
			message: "saltToHashDevices is empty"
		});
		return this.saltToHashDevices;
	}
	/**
	* @returns {string} Value used to verify devices.
	*/
	getVerifierDevices() {
		if (!this.verifierDevices) throw new AuthError({
			name: "EmptyBigIntegerVerifierDevices",
			message: "verifyDevices is empty"
		});
		return this.verifierDevices;
	}
	/**
	* Generate salts and compute verifier.
	*
	* @param {string} deviceGroupKey Devices to generate verifier for.
	* @param {string} username User to generate verifier for.
	*
	* @returns {Promise<void>}
	*/
	async generateHashDevice(deviceGroupKey, username) {
		this.randomPassword = getRandomString();
		const hashedString = getHashFromData(`${deviceGroupKey}${username}:${this.randomPassword}`);
		const hexRandom = getHexFromBytes(getRandomBytes(16));
		this.saltToHashDevices = getPaddedHex(new BigInteger(hexRandom, 16));
		return new Promise((resolve, reject) => {
			this.g.modPow(new BigInteger(getHashFromHex(this.saltToHashDevices + hashedString), 16), this.N, (err, result) => {
				if (err) {
					reject(err);
					return;
				}
				this.verifierDevices = getPaddedHex(result);
				resolve();
			});
		});
	}
	/**
	* Calculates the final HKDF key based on computed S value, computed U value and the key
	*
	* @param {String} username Username.
	* @param {String} password Password.
	* @param {AuthBigInteger} B Server B value.
	* @param {AuthBigInteger} salt Generated salt.
	*/
	async getPasswordAuthenticationKey({ username, password, serverBValue, salt }) {
		if (serverBValue.mod(this.N).equals(BigInteger.ZERO)) throw new Error("B cannot be zero.");
		const U = calculateU({
			A: this.A,
			B: serverBValue
		});
		const usernamePasswordHash = getHashFromData(`${this.userPoolName}${username}:${password}`);
		const x = new BigInteger(getHashFromHex(getPaddedHex(salt) + usernamePasswordHash), 16);
		const S = await calculateS({
			a: this.a,
			g: this.g,
			k: this.k,
			x,
			B: serverBValue,
			N: this.N,
			U
		});
		const context = this.encoder.convert("Caldera Derived Key");
		const spacer = this.encoder.convert(String.fromCharCode(1));
		const info = new Uint8Array(context.byteLength + spacer.byteLength);
		info.set(context, 0);
		info.set(spacer, context.byteLength);
		return getHkdfKey(getBytesFromHex(getPaddedHex(S)), getBytesFromHex(getPaddedHex(U)), info);
	}
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/calculate/calculateA.mjs
/**
* @internal
*/
var calculateA = async ({ a, g, N }) => {
	return new Promise((resolve, reject) => {
		g.modPow(a, N, (err, A) => {
			if (err) {
				reject(err);
				return;
			}
			if (A.mod(N).equals(BigInteger.ZERO)) {
				reject(/* @__PURE__ */ new Error("Illegal parameter. A mod N cannot be 0."));
				return;
			}
			resolve(A);
		});
	});
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/getAuthenticationHelper.mjs
/**
* Returns a new {@link AuthenticationHelper} instance with randomly generated BigInteger seed
*
* @param userPoolName Cognito user pool name.
* @returns An {@link AuthenticationHelper} instance.
*
* @internal
*/
var getAuthenticationHelper = async (userPoolName) => {
	const N = new BigInteger(INIT_N, 16);
	const g = new BigInteger("2", 16);
	const a = generateRandomBigInteger();
	return new AuthenticationHelper({
		userPoolName,
		a,
		g,
		A: await calculateA({
			a,
			g,
			N
		}),
		N
	});
};
/**
* Generates a random BigInteger.
*
* @returns {BigInteger} a random value.
*/
var generateRandomBigInteger = () => {
	return new BigInteger(getHexFromBytes(getRandomBytes(128)), 16);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/getNewDeviceMetadata.mjs
/**
* This function is used to kick off the device management flow.
*
* If an error is thrown while generating a hash device or calling the `ConfirmDevice`
* client, then this API will ignore the error and return undefined. Otherwise the authentication
* flow will not complete and the user won't be able to be signed in.
*
* @returns DeviceMetadata | undefined
*/
async function getNewDeviceMetadata({ userPoolId, userPoolEndpoint, newDeviceMetadata, accessToken }) {
	if (!newDeviceMetadata) return void 0;
	const authenticationHelper = await getAuthenticationHelper(userPoolId.split("_")[1] || "");
	const deviceKey = newDeviceMetadata?.DeviceKey;
	const deviceGroupKey = newDeviceMetadata?.DeviceGroupKey;
	try {
		await authenticationHelper.generateHashDevice(deviceGroupKey ?? "", deviceKey ?? "");
	} catch (errGenHash) {
		return;
	}
	const deviceSecretVerifierConfig = {
		Salt: base64Encoder.convert(getBytesFromHex(authenticationHelper.getSaltToHashDevices())),
		PasswordVerifier: base64Encoder.convert(getBytesFromHex(authenticationHelper.getVerifierDevices()))
	};
	const randomPassword = authenticationHelper.getRandomPassword();
	try {
		await createConfirmDeviceClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({ region: getRegionFromUserPoolId(userPoolId) }, {
			AccessToken: accessToken,
			DeviceName: await getDeviceName(),
			DeviceKey: newDeviceMetadata?.DeviceKey,
			DeviceSecretVerifierConfig: deviceSecretVerifierConfig
		});
		return {
			deviceKey,
			deviceGroupKey,
			randomPassword
		};
	} catch (error) {
		return;
	}
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/flows/userAuth/handleWebAuthnSignInResult.mjs
async function handleWebAuthnSignInResult(ctx, challengeParameters) {
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { username, signInSession, signInDetails, challengeName } = signInStore.getState();
	if (challengeName !== "WEB_AUTHN" || !username) throw new AuthError({
		name: AuthErrorCodes.SignInException,
		message: "Unable to proceed due to invalid sign in state."
	});
	const { CREDENTIAL_REQUEST_OPTIONS: credentialRequestOptions } = challengeParameters;
	assertPasskeyError(!!credentialRequestOptions, PasskeyErrorCode.InvalidPasskeyAuthenticationOptions);
	const cred = await getPasskey(JSON.parse(credentialRequestOptions));
	const { ChallengeName: nextChallengeName, ChallengeParameters: nextChallengeParameters, AuthenticationResult: authenticationResult, Session: nextSession } = await createRespondToAuthChallengeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: authConfig.userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(authConfig.userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmSignIn)
	}, {
		ChallengeName: "WEB_AUTHN",
		ChallengeResponses: {
			USERNAME: username,
			CREDENTIAL: JSON.stringify(cred)
		},
		ClientId: authConfig.userPoolClientId,
		Session: signInSession
	});
	setActiveSignInState({
		signInSession: nextSession,
		username,
		challengeName: nextChallengeName,
		signInDetails
	});
	if (authenticationResult) {
		await cacheCognitoTokens({
			...authenticationResult,
			username,
			NewDeviceMetadata: await getNewDeviceMetadata({
				userPoolId: authConfig.userPoolId,
				userPoolEndpoint: authConfig.userPoolEndpoint,
				newDeviceMetadata: authenticationResult.NewDeviceMetadata,
				accessToken: authenticationResult.AccessToken
			}),
			signInDetails
		}, resolveTokenOrchestrator(ctx));
		signInStore.dispatch({ type: "RESET_STATE" });
		await dispatchSignedInHubEvent(ctx);
		return {
			isSignedIn: true,
			nextStep: { signInStep: "DONE" }
		};
	}
	if (nextChallengeName === "WEB_AUTHN") throw new AuthError({
		name: AuthErrorCodes.SignInException,
		message: "Sequential WEB_AUTHN challenges returned from underlying service cannot be handled."
	});
	return {
		challengeName: nextChallengeName,
		challengeParameters: nextChallengeParameters
	};
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/userContextData.mjs
function getUserContextData({ username, userPoolId, userPoolClientId }) {
	if (typeof window === "undefined") return;
	const amazonCognitoAdvancedSecurityData = window.AmazonCognitoAdvancedSecurityData;
	if (typeof amazonCognitoAdvancedSecurityData === "undefined") return;
	const advancedSecurityData = amazonCognitoAdvancedSecurityData.getData(username, userPoolId, userPoolClientId);
	if (advancedSecurityData) return { EncodedData: advancedSecurityData };
	return {};
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/getNowString.mjs
var MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec"
];
var WEEK_NAMES = [
	"Sun",
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat"
];
var getNowString = () => {
	const now = /* @__PURE__ */ new Date();
	const weekDay = WEEK_NAMES[now.getUTCDay()];
	const month = MONTH_NAMES[now.getUTCMonth()];
	const day = now.getUTCDate();
	let hours = now.getUTCHours();
	if (hours < 10) hours = `0${hours}`;
	let minutes = now.getUTCMinutes();
	if (minutes < 10) minutes = `0${minutes}`;
	let seconds = now.getUTCSeconds();
	if (seconds < 10) seconds = `0${seconds}`;
	const year = now.getUTCFullYear();
	return `${weekDay} ${month} ${day} ${hours}:${minutes}:${seconds} UTC ${year}`;
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/srp/getSignatureString.mjs
var getSignatureString = ({ userPoolName, username, challengeParameters, dateNow, hkdf }) => {
	const bufUPIDaToB = textEncoder.convert(userPoolName);
	const bufUNaToB = textEncoder.convert(username);
	const bufSBaToB = urlB64ToUint8Array(challengeParameters.SECRET_BLOCK);
	const bufDNaToB = textEncoder.convert(dateNow);
	const bufConcat = new Uint8Array(bufUPIDaToB.byteLength + bufUNaToB.byteLength + bufSBaToB.byteLength + bufDNaToB.byteLength);
	bufConcat.set(bufUPIDaToB, 0);
	bufConcat.set(bufUNaToB, bufUPIDaToB.byteLength);
	bufConcat.set(bufSBaToB, bufUPIDaToB.byteLength + bufUNaToB.byteLength);
	bufConcat.set(bufDNaToB, bufUPIDaToB.byteLength + bufUNaToB.byteLength + bufSBaToB.byteLength);
	const awsCryptoHash = new Sha256(hkdf);
	awsCryptoHash.update(bufConcat);
	const resultFromAWSCrypto = awsCryptoHash.digestSync();
	return base64Encoder.convert(resultFromAWSCrypto);
};
var urlB64ToUint8Array = (base64String) => {
	const base64 = (base64String + "=".repeat((4 - base64String.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = base64Decoder.convert(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
	return outputArray;
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/handleDeviceSRPAuth.mjs
async function handleDeviceSRPAuth({ username, config, clientMetadata, session, tokenOrchestrator }) {
	const { userPoolId, userPoolEndpoint } = config;
	const clientId = config.userPoolClientId;
	const deviceMetadata = await tokenOrchestrator?.getDeviceMetadata(username);
	assertDeviceMetadata(deviceMetadata);
	const authenticationHelper = await getAuthenticationHelper(deviceMetadata.deviceGroupKey);
	const jsonReqResponseChallenge = {
		ChallengeName: "DEVICE_SRP_AUTH",
		ClientId: clientId,
		ChallengeResponses: {
			USERNAME: username,
			SRP_A: authenticationHelper.A.toString(16),
			DEVICE_KEY: deviceMetadata.deviceKey
		},
		ClientMetadata: clientMetadata,
		Session: session
	};
	const { ChallengeParameters: respondedChallengeParameters, Session } = await createRespondToAuthChallengeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({ region: getRegionFromUserPoolId(userPoolId) }, jsonReqResponseChallenge);
	return handleDevicePasswordVerifier(username, respondedChallengeParameters, clientMetadata, Session, authenticationHelper, config, tokenOrchestrator);
}
async function handleDevicePasswordVerifier(username, challengeParameters, clientMetadata, session, authenticationHelper, { userPoolId, userPoolClientId, userPoolEndpoint }, tokenOrchestrator) {
	const deviceMetadata = await tokenOrchestrator?.getDeviceMetadata(username);
	assertDeviceMetadata(deviceMetadata);
	const serverBValue = new BigInteger(challengeParameters?.SRP_B, 16);
	const salt = new BigInteger(challengeParameters?.SALT, 16);
	const { deviceKey } = deviceMetadata;
	const { deviceGroupKey } = deviceMetadata;
	const hkdf = await authenticationHelper.getPasswordAuthenticationKey({
		username: deviceMetadata.deviceKey,
		password: deviceMetadata.randomPassword,
		serverBValue,
		salt
	});
	const dateNow = getNowString();
	const jsonReqResponseChallenge = {
		ChallengeName: "DEVICE_PASSWORD_VERIFIER",
		ClientId: userPoolClientId,
		ChallengeResponses: {
			USERNAME: challengeParameters?.USERNAME ?? username,
			PASSWORD_CLAIM_SECRET_BLOCK: challengeParameters?.SECRET_BLOCK,
			TIMESTAMP: dateNow,
			PASSWORD_CLAIM_SIGNATURE: getSignatureString({
				username: deviceKey,
				userPoolName: deviceGroupKey,
				challengeParameters,
				dateNow,
				hkdf
			}),
			DEVICE_KEY: deviceKey
		},
		Session: session,
		ClientMetadata: clientMetadata,
		UserContextData: getUserContextData({
			username,
			userPoolId,
			userPoolClientId
		})
	};
	return createRespondToAuthChallengeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({ region: getRegionFromUserPoolId(userPoolId) }, jsonReqResponseChallenge);
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/handlePasswordVerifierChallenge.mjs
async function handlePasswordVerifierChallenge(password, challengeParameters, clientMetadata, session, authenticationHelper, config, tokenOrchestrator) {
	const { userPoolId, userPoolClientId, userPoolEndpoint } = config;
	const userPoolName = userPoolId?.split("_")[1] || "";
	const serverBValue = new BigInteger(challengeParameters?.SRP_B, 16);
	const salt = new BigInteger(challengeParameters?.SALT, 16);
	const username = challengeParameters?.USER_ID_FOR_SRP;
	if (!username) throw new AuthError({
		name: "EmptyUserIdForSRPException",
		message: "USER_ID_FOR_SRP was not found in challengeParameters"
	});
	const hkdf = await authenticationHelper.getPasswordAuthenticationKey({
		username,
		password,
		serverBValue,
		salt
	});
	const dateNow = getNowString();
	const challengeResponses = {
		USERNAME: username,
		PASSWORD_CLAIM_SECRET_BLOCK: challengeParameters?.SECRET_BLOCK,
		TIMESTAMP: dateNow,
		PASSWORD_CLAIM_SIGNATURE: getSignatureString({
			username,
			userPoolName,
			challengeParameters,
			dateNow,
			hkdf
		})
	};
	const deviceMetadata = await tokenOrchestrator.getDeviceMetadata(username);
	if (deviceMetadata && deviceMetadata.deviceKey) challengeResponses.DEVICE_KEY = deviceMetadata.deviceKey;
	const jsonReqResponseChallenge = {
		ChallengeName: "PASSWORD_VERIFIER",
		ChallengeResponses: challengeResponses,
		ClientMetadata: clientMetadata,
		Session: session,
		ClientId: userPoolClientId,
		UserContextData: getUserContextData({
			username,
			userPoolId,
			userPoolClientId
		})
	};
	const response = await createRespondToAuthChallengeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({ region: getRegionFromUserPoolId(userPoolId) }, jsonReqResponseChallenge);
	if (response.ChallengeName === "DEVICE_SRP_AUTH") return handleDeviceSRPAuth({
		username,
		config,
		clientMetadata,
		session: response.Session,
		tokenOrchestrator
	});
	return response;
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/retryOnResourceNotFoundException.mjs
/**
* It will retry the function if the error is a `ResourceNotFoundException` and
* will clean the device keys stored in the storage mechanism.
*
*/
async function retryOnResourceNotFoundException(func, args, username, tokenOrchestrator) {
	try {
		return await func(...args);
	} catch (error) {
		if (error instanceof AuthError && error.name === "ResourceNotFoundException" && error.message.includes("Device does not exist.")) {
			await tokenOrchestrator.clearDeviceMetadata(username);
			return func(...args);
		}
		throw error;
	}
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/setActiveSignInUsername.mjs
function setActiveSignInUsername(username) {
	const { dispatch } = signInStore;
	dispatch({
		type: "SET_USERNAME",
		value: username
	});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/flows/shared/handlePasswordSRP.mjs
/**
* Handles the Password SRP (Secure Remote Password) authentication flow.
* This function can be used with both USER_SRP_AUTH and USER_AUTH flows.
*
* @param {Object} params - The parameters for the Password SRP authentication
* @param {string} params.username - The username for authentication
* @param {string} params.password - The user's password
* @param {ClientMetadata} [params.clientMetadata] - Optional metadata to be sent with auth requests
* @param {CognitoUserPoolConfig} params.config - Cognito User Pool configuration
* @param {AuthTokenOrchestrator} params.tokenOrchestrator - Token orchestrator for managing auth tokens
* @param {AuthFlowType} params.authFlow - The type of authentication flow ('USER_SRP_AUTH' or 'USER_AUTH')
* @param {AuthFactorType} [params.preferredChallenge] - Optional preferred challenge type when using USER_AUTH flow
*
* @returns {Promise<RespondToAuthChallengeCommandOutput>} The authentication response
*/
async function handlePasswordSRP({ username, password, clientMetadata, config, tokenOrchestrator, authFlow, preferredChallenge }) {
	const { userPoolId, userPoolClientId, userPoolEndpoint } = config;
	const authenticationHelper = await getAuthenticationHelper(userPoolId?.split("_")[1] || "");
	const authParameters = {
		USERNAME: username,
		SRP_A: authenticationHelper.A.toString(16)
	};
	if (authFlow === "USER_AUTH" && preferredChallenge) authParameters.PREFERRED_CHALLENGE = preferredChallenge;
	const jsonReq = {
		AuthFlow: authFlow,
		AuthParameters: authParameters,
		ClientMetadata: clientMetadata,
		ClientId: userPoolClientId,
		UserContextData: getUserContextData({
			username,
			userPoolId,
			userPoolClientId
		})
	};
	const resp = await createInitiateAuthClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.SignIn)
	}, jsonReq);
	const { ChallengeParameters: challengeParameters, Session: session } = resp;
	const activeUsername = challengeParameters?.USERNAME ?? username;
	setActiveSignInUsername(activeUsername);
	if (resp.ChallengeName === "PASSWORD_VERIFIER") return retryOnResourceNotFoundException(handlePasswordVerifierChallenge, [
		password,
		challengeParameters,
		clientMetadata,
		session,
		authenticationHelper,
		config,
		tokenOrchestrator
	], activeUsername, tokenOrchestrator);
	return resp;
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/flows/userAuth/handleSelectChallenge.mjs
/**
* Handles the SELECT_CHALLENGE response for authentication.
* Initiates the selected authentication challenge based on user choice.
*
* @param {Object} params - The parameters for handling the selected challenge
* @param {string} params.username - The username for authentication
* @param {string} params.session - The current authentication session token
* @param {string} params.selectedChallenge - The challenge type selected by the user
* @param {CognitoUserPoolConfig} params.config - Cognito User Pool configuration
* @param {ClientMetadata} [params.clientMetadata] - Optional metadata to be sent with auth requests
*
* @returns {Promise<RespondToAuthChallengeCommandOutput>} The challenge response
*/
async function initiateSelectedChallenge({ username, session, selectedChallenge, config, clientMetadata }) {
	return createRespondToAuthChallengeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: config.userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(config.userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmSignIn)
	}, {
		ChallengeName: "SELECT_CHALLENGE",
		ChallengeResponses: {
			USERNAME: username,
			ANSWER: selectedChallenge
		},
		ClientId: config.userPoolClientId,
		Session: session,
		ClientMetadata: clientMetadata
	});
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/flows/userAuth/handleSelectChallengeWithPassword.mjs
/**
* Handles the SELECT_CHALLENGE response specifically for Password authentication.
* This function combines the SELECT_CHALLENGE flow with standard password authentication.
*
* @param {string} username - The username for authentication
* @param {string} password - The user's password
* @param {ClientMetadata} [clientMetadata] - Optional metadata to be sent with auth requests
* @param {CognitoUserPoolConfig} config - Cognito User Pool configuration
* @param {string} session - The current authentication session token
*
* @returns {Promise<RespondToAuthChallengeCommandOutput>} The challenge response
*/
async function handleSelectChallengeWithPassword(username, password, clientMetadata, config, session) {
	const { userPoolId, userPoolClientId, userPoolEndpoint } = config;
	const authParameters = {
		ANSWER: "PASSWORD",
		USERNAME: username,
		PASSWORD: password
	};
	const userContextData = getUserContextData({
		username,
		userPoolId,
		userPoolClientId
	});
	const response = await createRespondToAuthChallengeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmSignIn)
	}, {
		ChallengeName: "SELECT_CHALLENGE",
		ChallengeResponses: authParameters,
		ClientId: userPoolClientId,
		ClientMetadata: clientMetadata,
		Session: session,
		UserContextData: userContextData
	});
	setActiveSignInUsername(response.ChallengeParameters?.USERNAME ?? username);
	return response;
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/client/flows/userAuth/handleSelectChallengeWithPasswordSRP.mjs
/**
* Handles the SELECT_CHALLENGE response specifically for Password SRP authentication.
* This function combines the SELECT_CHALLENGE flow with Password SRP protocol.
*
* @param {string} username - The username for authentication
* @param {string} password - The user's password
* @param {ClientMetadata} [clientMetadata] - Optional metadata to be sent with auth requests
* @param {CognitoUserPoolConfig} config - Cognito User Pool configuration
* @param {string} session - The current authentication session token
* @param {AuthTokenOrchestrator} tokenOrchestrator - Token orchestrator for managing auth tokens
*
* @returns {Promise<RespondToAuthChallengeCommandOutput>} The challenge response
*/
async function handleSelectChallengeWithPasswordSRP(username, password, clientMetadata, config, session, tokenOrchestrator) {
	const { userPoolId, userPoolClientId, userPoolEndpoint } = config;
	const authenticationHelper = await getAuthenticationHelper(userPoolId.split("_")[1] || "");
	const authParameters = {
		ANSWER: "PASSWORD_SRP",
		USERNAME: username,
		SRP_A: authenticationHelper.A.toString(16)
	};
	const userContextData = getUserContextData({
		username,
		userPoolId,
		userPoolClientId
	});
	const response = await createRespondToAuthChallengeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmSignIn)
	}, {
		ChallengeName: "SELECT_CHALLENGE",
		ChallengeResponses: authParameters,
		ClientId: userPoolClientId,
		ClientMetadata: clientMetadata,
		Session: session,
		UserContextData: userContextData
	});
	const activeUsername = response.ChallengeParameters?.USERNAME ?? username;
	setActiveSignInUsername(activeUsername);
	if (response.ChallengeName === "PASSWORD_VERIFIER") return retryOnResourceNotFoundException(handlePasswordVerifierChallenge, [
		password,
		response.ChallengeParameters,
		clientMetadata,
		response.Session,
		authenticationHelper,
		config,
		tokenOrchestrator
	], activeUsername, tokenOrchestrator);
	return response;
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/signInHelpers.mjs
var USER_ATTRIBUTES = "userAttributes.";
function isWebAuthnResultAuthSignInOutput(result) {
	return "isSignedIn" in result && "nextStep" in result;
}
async function handleCustomChallenge({ challengeResponse, clientMetadata, session, username, config, tokenOrchestrator }) {
	const { userPoolId, userPoolClientId, userPoolEndpoint } = config;
	const challengeResponses = {
		USERNAME: username,
		ANSWER: challengeResponse
	};
	const deviceMetadata = await tokenOrchestrator?.getDeviceMetadata(username);
	if (deviceMetadata && deviceMetadata.deviceKey) challengeResponses.DEVICE_KEY = deviceMetadata.deviceKey;
	const jsonReq = {
		ChallengeName: "CUSTOM_CHALLENGE",
		ChallengeResponses: challengeResponses,
		Session: session,
		ClientMetadata: clientMetadata,
		ClientId: userPoolClientId,
		UserContextData: getUserContextData({
			username,
			userPoolId,
			userPoolClientId
		})
	};
	const response = await createRespondToAuthChallengeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmSignIn)
	}, jsonReq);
	if (response.ChallengeName === "DEVICE_SRP_AUTH") return handleDeviceSRPAuth({
		username,
		config,
		clientMetadata,
		session: response.Session,
		tokenOrchestrator
	});
	return response;
}
async function handleMFASetupChallenge({ challengeResponse, username, clientMetadata, session, deviceName, config }) {
	const { userPoolId, userPoolClientId, userPoolEndpoint } = config;
	if (challengeResponse === "EMAIL") return {
		ChallengeName: "MFA_SETUP",
		Session: session,
		ChallengeParameters: { MFAS_CAN_SETUP: "[\"EMAIL_OTP\"]" },
		$metadata: {}
	};
	if (challengeResponse === "TOTP") return {
		ChallengeName: "MFA_SETUP",
		Session: session,
		ChallengeParameters: { MFAS_CAN_SETUP: "[\"SOFTWARE_TOKEN_MFA\"]" },
		$metadata: {}
	};
	const challengeResponses = { USERNAME: username };
	if (/^\d+$/.test(challengeResponse)) {
		const { Session } = await createVerifySoftwareTokenClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
			region: getRegionFromUserPoolId(userPoolId),
			userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmSignIn)
		}, {
			UserCode: challengeResponse,
			Session: session,
			FriendlyDeviceName: deviceName
		});
		signInStore.dispatch({
			type: "SET_SIGN_IN_SESSION",
			value: Session
		});
		const jsonReq = {
			ChallengeName: "MFA_SETUP",
			ChallengeResponses: challengeResponses,
			Session,
			ClientMetadata: clientMetadata,
			ClientId: userPoolClientId
		};
		return createRespondToAuthChallengeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
			region: getRegionFromUserPoolId(userPoolId),
			userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmSignIn)
		}, jsonReq);
	}
	if (challengeResponse.includes("@")) {
		challengeResponses.EMAIL = challengeResponse;
		const jsonReq = {
			ChallengeName: "MFA_SETUP",
			ChallengeResponses: challengeResponses,
			Session: session,
			ClientMetadata: clientMetadata,
			ClientId: userPoolClientId
		};
		return createRespondToAuthChallengeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
			region: getRegionFromUserPoolId(userPoolId),
			userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmSignIn)
		}, jsonReq);
	}
	throw new AuthError({
		name: AuthErrorCodes.SignInException,
		message: `Cannot proceed with MFA setup using challengeResponse: ${challengeResponse}`,
		recoverySuggestion: "Try passing \"EMAIL\", \"TOTP\", a valid email, or OTP code as the challengeResponse."
	});
}
async function handleSelectMFATypeChallenge({ challengeResponse, username, clientMetadata, session, config }) {
	const { userPoolId, userPoolClientId, userPoolEndpoint } = config;
	assertValidationError(challengeResponse === "TOTP" || challengeResponse === "SMS" || challengeResponse === "EMAIL", AuthValidationErrorCode.IncorrectMFAMethod);
	const jsonReq = {
		ChallengeName: "SELECT_MFA_TYPE",
		ChallengeResponses: {
			USERNAME: username,
			ANSWER: mapMfaType(challengeResponse)
		},
		Session: session,
		ClientMetadata: clientMetadata,
		ClientId: userPoolClientId,
		UserContextData: getUserContextData({
			username,
			userPoolId,
			userPoolClientId
		})
	};
	return createRespondToAuthChallengeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmSignIn)
	}, jsonReq);
}
async function handleCompleteNewPasswordChallenge({ challengeResponse, clientMetadata, session, username, requiredAttributes, config }) {
	const { userPoolId, userPoolClientId, userPoolEndpoint } = config;
	const jsonReq = {
		ChallengeName: "NEW_PASSWORD_REQUIRED",
		ChallengeResponses: {
			...createAttributes(requiredAttributes),
			NEW_PASSWORD: challengeResponse,
			USERNAME: username
		},
		ClientMetadata: clientMetadata,
		Session: session,
		ClientId: userPoolClientId,
		UserContextData: getUserContextData({
			username,
			userPoolId,
			userPoolClientId
		})
	};
	return createRespondToAuthChallengeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmSignIn)
	}, jsonReq);
}
async function handleUserPasswordAuthFlow(username, password, clientMetadata, config, tokenOrchestrator) {
	const { userPoolClientId, userPoolId, userPoolEndpoint } = config;
	const authParameters = {
		USERNAME: username,
		PASSWORD: password
	};
	const deviceMetadata = await tokenOrchestrator.getDeviceMetadata(username);
	if (deviceMetadata && deviceMetadata.deviceKey) authParameters.DEVICE_KEY = deviceMetadata.deviceKey;
	const jsonReq = {
		AuthFlow: "USER_PASSWORD_AUTH",
		AuthParameters: authParameters,
		ClientMetadata: clientMetadata,
		ClientId: userPoolClientId,
		UserContextData: getUserContextData({
			username,
			userPoolId,
			userPoolClientId
		})
	};
	const response = await createInitiateAuthClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.SignIn)
	}, jsonReq);
	const activeUsername = response.ChallengeParameters?.USERNAME ?? response.ChallengeParameters?.USER_ID_FOR_SRP ?? username;
	setActiveSignInUsername(activeUsername);
	if (response.ChallengeName === "DEVICE_SRP_AUTH") return handleDeviceSRPAuth({
		username: activeUsername,
		config,
		clientMetadata,
		session: response.Session,
		tokenOrchestrator
	});
	return response;
}
async function handleUserSRPAuthFlow(username, password, clientMetadata, config, tokenOrchestrator) {
	return handlePasswordSRP({
		username,
		password,
		clientMetadata,
		config,
		tokenOrchestrator,
		authFlow: "USER_SRP_AUTH"
	});
}
async function handleCustomAuthFlowWithoutSRP(username, clientMetadata, config, tokenOrchestrator) {
	const { userPoolClientId, userPoolId, userPoolEndpoint } = config;
	const authParameters = { USERNAME: username };
	const deviceMetadata = await tokenOrchestrator.getDeviceMetadata(username);
	if (deviceMetadata && deviceMetadata.deviceKey) authParameters.DEVICE_KEY = deviceMetadata.deviceKey;
	const jsonReq = {
		AuthFlow: "CUSTOM_AUTH",
		AuthParameters: authParameters,
		ClientMetadata: clientMetadata,
		ClientId: userPoolClientId,
		UserContextData: getUserContextData({
			username,
			userPoolId,
			userPoolClientId
		})
	};
	const response = await createInitiateAuthClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.SignIn)
	}, jsonReq);
	const activeUsername = response.ChallengeParameters?.USERNAME ?? username;
	setActiveSignInUsername(activeUsername);
	if (response.ChallengeName === "DEVICE_SRP_AUTH") return handleDeviceSRPAuth({
		username: activeUsername,
		config,
		clientMetadata,
		session: response.Session,
		tokenOrchestrator
	});
	return response;
}
async function handleCustomSRPAuthFlow(username, password, clientMetadata, config, tokenOrchestrator) {
	assertTokenProviderConfig(config);
	const { userPoolId, userPoolClientId, userPoolEndpoint } = config;
	const authenticationHelper = await getAuthenticationHelper(userPoolId?.split("_")[1] || "");
	const jsonReq = {
		AuthFlow: "CUSTOM_AUTH",
		AuthParameters: {
			USERNAME: username,
			SRP_A: authenticationHelper.A.toString(16),
			CHALLENGE_NAME: "SRP_A"
		},
		ClientMetadata: clientMetadata,
		ClientId: userPoolClientId,
		UserContextData: getUserContextData({
			username,
			userPoolId,
			userPoolClientId
		})
	};
	const { ChallengeParameters: challengeParameters, Session: session } = await createInitiateAuthClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.SignIn)
	}, jsonReq);
	const activeUsername = challengeParameters?.USERNAME ?? username;
	setActiveSignInUsername(activeUsername);
	return retryOnResourceNotFoundException(handlePasswordVerifierChallenge, [
		password,
		challengeParameters,
		clientMetadata,
		session,
		authenticationHelper,
		config,
		tokenOrchestrator
	], activeUsername, tokenOrchestrator);
}
async function getSignInResult(ctx, params) {
	const { challengeName, challengeParameters, availableChallenges } = params;
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	switch (challengeName) {
		case "CUSTOM_CHALLENGE": return {
			isSignedIn: false,
			nextStep: {
				signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE",
				additionalInfo: challengeParameters
			}
		};
		case "MFA_SETUP": {
			const { signInSession, username } = signInStore.getState();
			const mfaSetupTypes = getMFATypes(parseMFATypes(challengeParameters.MFAS_CAN_SETUP)) || [];
			const allowedMfaSetupTypes = getAllowedMfaSetupTypes(mfaSetupTypes);
			const isTotpMfaSetupAvailable = allowedMfaSetupTypes.includes("TOTP");
			const isEmailMfaSetupAvailable = allowedMfaSetupTypes.includes("EMAIL");
			if (isTotpMfaSetupAvailable && isEmailMfaSetupAvailable) return {
				isSignedIn: false,
				nextStep: {
					signInStep: "CONTINUE_SIGN_IN_WITH_MFA_SETUP_SELECTION",
					allowedMFATypes: allowedMfaSetupTypes
				}
			};
			if (isEmailMfaSetupAvailable) return {
				isSignedIn: false,
				nextStep: { signInStep: "CONTINUE_SIGN_IN_WITH_EMAIL_SETUP" }
			};
			if (isTotpMfaSetupAvailable) {
				const { Session, SecretCode: secretCode } = await createAssociateSoftwareTokenClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: authConfig.userPoolEndpoint }) })({ region: getRegionFromUserPoolId(authConfig.userPoolId) }, { Session: signInSession });
				signInStore.dispatch({
					type: "SET_SIGN_IN_SESSION",
					value: Session
				});
				return {
					isSignedIn: false,
					nextStep: {
						signInStep: "CONTINUE_SIGN_IN_WITH_TOTP_SETUP",
						totpSetupDetails: getTOTPSetupDetails(secretCode, username)
					}
				};
			}
			throw new AuthError({
				name: AuthErrorCodes.SignInException,
				message: `Cannot initiate MFA setup from available types: ${mfaSetupTypes}`
			});
		}
		case "NEW_PASSWORD_REQUIRED": return {
			isSignedIn: false,
			nextStep: {
				signInStep: "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED",
				missingAttributes: parseAttributes(challengeParameters.requiredAttributes)
			}
		};
		case "SELECT_MFA_TYPE": return {
			isSignedIn: false,
			nextStep: {
				signInStep: "CONTINUE_SIGN_IN_WITH_MFA_SELECTION",
				allowedMFATypes: getMFATypes(parseMFATypes(challengeParameters.MFAS_CAN_CHOOSE))
			}
		};
		case "SMS_OTP":
		case "SMS_MFA": return {
			isSignedIn: false,
			nextStep: {
				signInStep: "CONFIRM_SIGN_IN_WITH_SMS_CODE",
				codeDeliveryDetails: {
					deliveryMedium: challengeParameters.CODE_DELIVERY_DELIVERY_MEDIUM,
					destination: challengeParameters.CODE_DELIVERY_DESTINATION
				}
			}
		};
		case "SOFTWARE_TOKEN_MFA": return {
			isSignedIn: false,
			nextStep: { signInStep: "CONFIRM_SIGN_IN_WITH_TOTP_CODE" }
		};
		case "EMAIL_OTP": return {
			isSignedIn: false,
			nextStep: {
				signInStep: "CONFIRM_SIGN_IN_WITH_EMAIL_CODE",
				codeDeliveryDetails: {
					deliveryMedium: challengeParameters.CODE_DELIVERY_DELIVERY_MEDIUM,
					destination: challengeParameters.CODE_DELIVERY_DESTINATION
				}
			}
		};
		case "WEB_AUTHN": {
			const result = await handleWebAuthnSignInResult(ctx, challengeParameters);
			if (isWebAuthnResultAuthSignInOutput(result)) return result;
			return getSignInResult(ctx, result);
		}
		case "PASSWORD":
		case "PASSWORD_SRP": return {
			isSignedIn: false,
			nextStep: { signInStep: "CONFIRM_SIGN_IN_WITH_PASSWORD" }
		};
		case "SELECT_CHALLENGE": return {
			isSignedIn: false,
			nextStep: {
				signInStep: "CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION",
				availableChallenges
			}
		};
	}
	throw new AuthError({
		name: AuthErrorCodes.SignInException,
		message: `An error occurred during the sign in process. ${challengeName} challengeName returned by the underlying service was not addressed.`
	});
}
function getTOTPSetupDetails(secretCode, username) {
	return {
		sharedSecret: secretCode,
		getSetupUri: (appName, accountName) => {
			return new AmplifyUrl(`otpauth://totp/${appName}:${accountName ?? username}?secret=${secretCode}&issuer=${appName}`);
		}
	};
}
function getSignInResultFromError(errorName) {
	if (errorName === InitiateAuthException.PasswordResetRequiredException) return {
		isSignedIn: false,
		nextStep: { signInStep: "RESET_PASSWORD" }
	};
	else if (errorName === InitiateAuthException.UserNotConfirmedException) return {
		isSignedIn: false,
		nextStep: { signInStep: "CONFIRM_SIGN_UP" }
	};
}
function parseAttributes(attributes) {
	if (!attributes) return [];
	return JSON.parse(attributes).map((att) => att.includes(USER_ATTRIBUTES) ? att.replace(USER_ATTRIBUTES, "") : att);
}
function createAttributes(attributes) {
	if (!attributes) return {};
	const newAttributes = {};
	Object.entries(attributes).forEach(([key, value]) => {
		if (value) newAttributes[`${USER_ATTRIBUTES}${key}`] = value;
	});
	return newAttributes;
}
async function handleChallengeName(username, challengeName, session, challengeResponse, config, tokenOrchestrator, clientMetadata, options) {
	const userAttributes = options?.userAttributes;
	const deviceName = options?.friendlyDeviceName;
	switch (challengeName) {
		case "WEB_AUTHN":
		case "SELECT_CHALLENGE":
			if (challengeResponse === "PASSWORD_SRP" || challengeResponse === "PASSWORD") return {
				ChallengeName: challengeResponse,
				Session: session,
				$metadata: {}
			};
			return initiateSelectedChallenge({
				username,
				session,
				selectedChallenge: challengeResponse,
				config,
				clientMetadata
			});
		case "SELECT_MFA_TYPE": return handleSelectMFATypeChallenge({
			challengeResponse,
			clientMetadata,
			session,
			username,
			config
		});
		case "MFA_SETUP": return handleMFASetupChallenge({
			challengeResponse,
			clientMetadata,
			session,
			username,
			deviceName,
			config
		});
		case "NEW_PASSWORD_REQUIRED": return handleCompleteNewPasswordChallenge({
			challengeResponse,
			clientMetadata,
			session,
			username,
			requiredAttributes: userAttributes,
			config
		});
		case "CUSTOM_CHALLENGE": return retryOnResourceNotFoundException(handleCustomChallenge, [{
			challengeResponse,
			clientMetadata,
			session,
			username,
			config,
			tokenOrchestrator
		}], username, tokenOrchestrator);
		case "SMS_MFA":
		case "SOFTWARE_TOKEN_MFA":
		case "SMS_OTP":
		case "EMAIL_OTP": return handleMFAChallenge({
			challengeName,
			challengeResponse,
			clientMetadata,
			session,
			username,
			config,
			tokenOrchestrator
		});
		case "PASSWORD": return handleSelectChallengeWithPassword(username, challengeResponse, clientMetadata, config, session);
		case "PASSWORD_SRP": return handleSelectChallengeWithPasswordSRP(username, challengeResponse, clientMetadata, config, session, tokenOrchestrator);
	}
	throw new AuthError({
		name: AuthErrorCodes.SignInException,
		message: `An error occurred during the sign in process.
		${challengeName} challengeName returned by the underlying service was not addressed.`
	});
}
function mapMfaType(mfa) {
	let mfaType = "SMS_MFA";
	if (mfa === "TOTP") mfaType = "SOFTWARE_TOKEN_MFA";
	if (mfa === "EMAIL") mfaType = "EMAIL_OTP";
	return mfaType;
}
function getMFAType(type) {
	if (type === "SMS_MFA") return "SMS";
	if (type === "SOFTWARE_TOKEN_MFA") return "TOTP";
	if (type === "EMAIL_OTP") return "EMAIL";
}
function getMFATypes(types) {
	if (!types) return void 0;
	return types.map(getMFAType).filter(Boolean);
}
function parseMFATypes(mfa) {
	if (!mfa) return [];
	return JSON.parse(mfa);
}
function getAllowedMfaSetupTypes(availableMfaSetupTypes) {
	return availableMfaSetupTypes.filter((authMfaType) => authMfaType === "EMAIL" || authMfaType === "TOTP");
}
async function assertUserNotAuthenticated(ctx) {
	let authUser;
	try {
		authUser = await getCurrentUser(ctx);
	} catch (error) {}
	if (authUser && authUser.userId && authUser.username) throw new AuthError({
		name: USER_ALREADY_AUTHENTICATED_EXCEPTION,
		message: "There is already a signed in user.",
		recoverySuggestion: "Call signOut before calling signIn again."
	});
}
function getActiveSignInUsername(username) {
	return signInStore.getState().username ?? username;
}
async function handleMFAChallenge({ challengeName, challengeResponse, clientMetadata, session, username, config, tokenOrchestrator }) {
	const { userPoolId, userPoolClientId, userPoolEndpoint } = config;
	const challengeResponses = { USERNAME: username };
	if (challengeName === "EMAIL_OTP") challengeResponses.EMAIL_OTP_CODE = challengeResponse;
	if (challengeName === "SMS_MFA") challengeResponses.SMS_MFA_CODE = challengeResponse;
	if (challengeName === "SMS_OTP") challengeResponses.SMS_OTP_CODE = challengeResponse;
	if (challengeName === "SOFTWARE_TOKEN_MFA") challengeResponses.SOFTWARE_TOKEN_MFA_CODE = challengeResponse;
	const deviceMetadata = await tokenOrchestrator?.getDeviceMetadata(username);
	if (deviceMetadata && deviceMetadata.deviceKey) challengeResponses.DEVICE_KEY = deviceMetadata.deviceKey;
	const jsonReq = {
		ChallengeName: challengeName,
		ChallengeResponses: challengeResponses,
		Session: session,
		ClientMetadata: clientMetadata,
		ClientId: userPoolClientId,
		UserContextData: getUserContextData({
			username,
			userPoolId,
			userPoolClientId
		})
	};
	const response = await createRespondToAuthChallengeClient({ endpointResolver: createCognitoUserPoolEndpointResolver({ endpointOverride: userPoolEndpoint }) })({
		region: getRegionFromUserPoolId(userPoolId),
		userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmSignIn)
	}, jsonReq);
	if (response.ChallengeName === "DEVICE_SRP_AUTH") return handleDeviceSRPAuth({
		username,
		config,
		clientMetadata,
		session: response.Session,
		tokenOrchestrator
	});
	return response;
}
new ConsoleLogger("AuthError");
var authErrorMessages = {
	oauthSignInError: {
		message: AuthErrorStrings.OAUTH_ERROR,
		log: "Make sure Cognito Hosted UI has been configured correctly"
	},
	noConfig: {
		message: AuthErrorStrings.DEFAULT_MSG,
		log: `
            Error: Amplify has not been configured correctly.
            This error is typically caused by one of the following scenarios:

            1. Make sure you're passing the awsconfig object to Amplify.configure() in your app's entry point
                See https://aws-amplify.github.io/docs/js/authentication#configure-your-app for more information
            
            2. There might be multiple conflicting versions of amplify packages in your node_modules.
				Refer to our docs site for help upgrading Amplify packages (https://docs.amplify.aws/lib/troubleshooting/upgrading/q/platform/js)
        `
	},
	missingAuthConfig: {
		message: AuthErrorStrings.DEFAULT_MSG,
		log: `
            Error: Amplify has not been configured correctly. 
            The configuration object is missing required auth properties.
            This error is typically caused by one of the following scenarios:

            1. Did you run \`amplify push\` after adding auth via \`amplify add auth\`?
                See https://aws-amplify.github.io/docs/js/authentication#amplify-project-setup for more information

            2. This could also be caused by multiple conflicting versions of amplify packages, see (https://docs.amplify.aws/lib/troubleshooting/upgrading/q/platform/js) for help upgrading Amplify packages.
        `
	},
	emptyUsername: { message: AuthErrorStrings.EMPTY_USERNAME },
	invalidUsername: { message: AuthErrorStrings.INVALID_USERNAME },
	emptyPassword: { message: AuthErrorStrings.EMPTY_PASSWORD },
	emptyCode: { message: AuthErrorStrings.EMPTY_CODE },
	signUpError: {
		message: AuthErrorStrings.SIGN_UP_ERROR,
		log: "The first parameter should either be non-null string or object"
	},
	noMFA: { message: AuthErrorStrings.NO_MFA },
	invalidMFA: { message: AuthErrorStrings.INVALID_MFA },
	emptyChallengeResponse: { message: AuthErrorStrings.EMPTY_CHALLENGE },
	noUserSession: { message: AuthErrorStrings.NO_USER_SESSION },
	deviceConfig: { message: AuthErrorStrings.DEVICE_CONFIG },
	networkError: { message: AuthErrorStrings.NETWORK_ERROR },
	autoSignInError: { message: AuthErrorStrings.AUTOSIGNIN_ERROR },
	default: { message: AuthErrorStrings.DEFAULT_MSG }
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/createOAuthError.mjs
var createOAuthError = (message, recoverySuggestion) => new AuthError({
	message: message ?? "An error has occurred during the oauth process.",
	name: AuthErrorCodes.OAuthSignInError,
	recoverySuggestion: recoverySuggestion ?? authErrorMessages.oauthSignInError.log
});
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/types/Auth.mjs
var AuthErrorTypes;
(function(AuthErrorTypes) {
	AuthErrorTypes["NoConfig"] = "noConfig";
	AuthErrorTypes["MissingAuthConfig"] = "missingAuthConfig";
	AuthErrorTypes["EmptyUsername"] = "emptyUsername";
	AuthErrorTypes["InvalidUsername"] = "invalidUsername";
	AuthErrorTypes["EmptyPassword"] = "emptyPassword";
	AuthErrorTypes["EmptyCode"] = "emptyCode";
	AuthErrorTypes["SignUpError"] = "signUpError";
	AuthErrorTypes["NoMFA"] = "noMFA";
	AuthErrorTypes["InvalidMFA"] = "invalidMFA";
	AuthErrorTypes["EmptyChallengeResponse"] = "emptyChallengeResponse";
	AuthErrorTypes["NoUserSession"] = "noUserSession";
	AuthErrorTypes["Default"] = "default";
	AuthErrorTypes["DeviceConfig"] = "deviceConfig";
	AuthErrorTypes["NetworkError"] = "networkError";
	AuthErrorTypes["AutoSignInError"] = "autoSignInError";
	AuthErrorTypes["OAuthSignInError"] = "oauthSignInError";
})(AuthErrorTypes || (AuthErrorTypes = {}));
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/validateState.mjs
var flowCancelledMessage = "`signInWithRedirect` has been canceled.";
var validationFailedMessage = "An error occurred while validating the state.";
var validationRecoverySuggestion = "Try to initiate an OAuth flow from Amplify";
var validateState = async (state) => {
	const savedState = await oAuthStore.loadOAuthState();
	const validatedState = state === savedState ? savedState : void 0;
	if (!validatedState) throw new AuthError({
		name: AuthErrorTypes.OAuthSignInError,
		message: state === null ? flowCancelledMessage : validationFailedMessage,
		recoverySuggestion: state === null ? void 0 : validationRecoverySuggestion
	});
	return validatedState;
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/completeOAuthFlow.mjs
var completeOAuthFlow = async ({ currentUrl, userAgentValue, clientId, redirectUri, responseType, domain, preferPrivateSession }) => {
	const urlParams = new AmplifyUrl(currentUrl);
	const error = urlParams.searchParams.get("error");
	const errorMessage = urlParams.searchParams.get("error_description");
	if (error) throw createOAuthError(errorMessage ?? error);
	if (responseType === "code") return handleCodeFlow({
		currentUrl,
		userAgentValue,
		clientId,
		redirectUri,
		domain,
		preferPrivateSession
	});
	return handleImplicitFlow({
		currentUrl,
		redirectUri,
		preferPrivateSession
	});
};
var handleCodeFlow = async ({ currentUrl, userAgentValue, clientId, redirectUri, domain, preferPrivateSession }) => {
	const url = new AmplifyUrl(currentUrl);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	if (!code || !state) throw createOAuthError("User cancelled OAuth flow.");
	const validatedState = await validateState(state);
	const oAuthTokenEndpoint = "https://" + domain + "/oauth2/token";
	const codeVerifier = await oAuthStore.loadPKCE();
	const oAuthTokenBody = {
		grant_type: "authorization_code",
		code,
		client_id: clientId,
		redirect_uri: redirectUri,
		...codeVerifier ? { code_verifier: codeVerifier } : {}
	};
	const body = Object.entries(oAuthTokenBody).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
	const { access_token, refresh_token: refreshToken, id_token, error, error_message: errorMessage, token_type, expires_in } = await (await fetch(oAuthTokenEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			[USER_AGENT_HEADER]: userAgentValue
		},
		body
	})).json();
	if (error) throw createOAuthError(errorMessage ?? error);
	await cacheCognitoTokens({
		username: (access_token && decodeJWT(access_token).payload.username) ?? "username",
		AccessToken: access_token,
		IdToken: id_token,
		RefreshToken: refreshToken
	});
	return completeFlow({
		redirectUri,
		state: validatedState,
		preferPrivateSession
	});
};
var handleImplicitFlow = async ({ currentUrl, redirectUri, preferPrivateSession }) => {
	const { id_token, access_token, state, token_type, expires_in, error_description, error } = (new AmplifyUrl(currentUrl).hash ?? "#").substring(1).split("&").map((pairings) => pairings.split("=")).reduce((accum, [k, v]) => ({
		...accum,
		[k]: v
	}), {
		id_token: void 0,
		access_token: void 0,
		state: void 0,
		token_type: void 0,
		expires_in: void 0,
		error_description: void 0,
		error: void 0
	});
	if (error) throw createOAuthError(error_description ?? error);
	if (!access_token) throw createOAuthError("No access token returned from OAuth flow.");
	const validatedState = await validateState(state);
	await cacheCognitoTokens({
		username: (access_token && decodeJWT(access_token).payload.username) ?? "username",
		AccessToken: access_token,
		IdToken: id_token
	});
	return completeFlow({
		redirectUri,
		state: validatedState,
		preferPrivateSession
	});
};
var completeFlow = async ({ redirectUri, state, preferPrivateSession }) => {
	await tokenOrchestrator.setOAuthMetadata({ oauthSignIn: true });
	await oAuthStore.clearOAuthData();
	await oAuthStore.storeOAuthSignIn(true, preferPrivateSession);
	resolveAndClearInflightPromises();
	clearHistory(redirectUri);
	if (isCustomState(state)) Hub.dispatch("auth", {
		event: "customOAuthState",
		data: urlSafeDecode(getCustomState(state))
	}, "Auth", AMPLIFY_SYMBOL);
	Hub.dispatch("auth", { event: "signInWithRedirect" }, "Auth", AMPLIFY_SYMBOL);
	await dispatchSignedInHubEvent(getGlobalContext());
};
var isCustomState = (state) => {
	return /-/.test(state);
};
var getCustomState = (state) => {
	return state.split("-").splice(1).join("-");
};
var clearHistory = (redirectUri) => {
	if (typeof window !== "undefined" && typeof window.history !== "undefined") window.history.replaceState(window.history.state, "", redirectUri);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/getRedirectUrl.mjs
/** @internal */
function getRedirectUrl(redirects, preferredRedirectUrl) {
	if (preferredRedirectUrl) {
		const redirectUrl = redirects?.find((redirect) => redirect === preferredRedirectUrl);
		if (!redirectUrl) throw invalidPreferredRedirectUrlException;
		return redirectUrl;
	} else {
		const redirectUrlFromTheSameOrigin = redirects?.find(isSameOriginAndPathName) ?? redirects?.find(isTheSameDomain);
		const redirectUrlFromDifferentOrigin = redirects?.find(isHttps) ?? redirects?.find(isHttp);
		if (redirectUrlFromTheSameOrigin) return redirectUrlFromTheSameOrigin;
		else if (redirectUrlFromDifferentOrigin) throw invalidOriginException;
		throw invalidRedirectException;
	}
}
var isSameOriginAndPathName = (redirect) => redirect.startsWith(String(window.location.origin + (window.location.pathname || "/")));
var isTheSameDomain = (redirect) => redirect.includes(String(window.location.hostname));
var isHttp = (redirect) => redirect.startsWith("http://");
var isHttps = (redirect) => redirect.startsWith("https://");
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/handleFailure.mjs
var handleFailure = async (error) => {
	resolveAndClearInflightPromises();
	await oAuthStore.clearOAuthInflightData();
	Hub.dispatch("auth", {
		event: "signInWithRedirect_failure",
		data: { error }
	}, "Auth", AMPLIFY_SYMBOL);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/attemptCompleteOAuthFlow.mjs
var attemptCompleteOAuthFlow = async (authConfig) => {
	try {
		assertTokenProviderConfig(authConfig);
		assertOAuthConfig(authConfig);
		oAuthStore.setAuthConfig(authConfig);
	} catch (_) {
		return;
	}
	if (!await oAuthStore.loadOAuthInFlight()) return;
	try {
		const currentUrl = window.location.href;
		const { loginWith, userPoolClientId } = authConfig;
		const { domain, redirectSignIn, responseType } = loginWith.oauth;
		await completeOAuthFlow({
			currentUrl,
			clientId: userPoolClientId,
			domain,
			redirectUri: getRedirectUrl(redirectSignIn),
			responseType,
			userAgentValue: getAuthUserAgentValue(AuthAction.SignInWithRedirect)
		});
	} catch (err) {
		await handleFailure(err);
	}
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/enableOAuthListener.mjs
var isHandlingOAuthFlow = false;
var attemptCompleteOAuthFlowOnce = (cognitoConfig) => {
	if (isHandlingOAuthFlow) return;
	isHandlingOAuthFlow = true;
	Promise.resolve(attemptCompleteOAuthFlow(cognitoConfig)).finally(() => {
		isHandlingOAuthFlow = false;
	});
};
if (isBrowser()) {
	Hub.listen("core", ({ payload }) => {
		if (payload.event === "configure") {
			const cognitoConfig = payload.data?.Auth?.Cognito;
			if (cognitoConfig?.loginWith?.oauth) attemptCompleteOAuthFlowOnce(cognitoConfig);
		}
	});
	defaultStorage.addListener?.(async (event) => {
		const { key, newValue } = event;
		if (!!key && key.startsWith(`CognitoIdentityServiceProvider.`) && key.endsWith(`.${OAuthStorageKeys.inflightOAuth}`) && newValue !== "true") resolveAndClearInflightPromises();
	});
	if (hasGlobalContext()) {
		const cognitoConfig = getGlobalContext().resourcesConfig?.Auth?.Cognito;
		if (cognitoConfig?.loginWith?.oauth) attemptCompleteOAuthFlowOnce(cognitoConfig);
	}
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/types/models.mjs
var cognitoHostedUIIdentityProviderMap = {
	Google: "Google",
	Facebook: "Facebook",
	Amazon: "LoginWithAmazon",
	Apple: "SignInWithApple"
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/utils/openAuthSession.mjs
var openAuthSession = async (url) => {
	if (!window?.location) return;
	window.location.href = url.replace("http://", "https://");
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/generateCodeVerifier.mjs
var CODE_VERIFIER_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
/**
*
* @param length Desired length of the code verifier.
*
* **NOTE:** According to the [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636#section-4.1)
* A code verifier must be with a length >= 43 and <= 128.
*
* @returns An object that contains the generated `codeVerifier` and a method
* `toCodeChallenge` to generate the code challenge from the `codeVerifier`
* following the spec of [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636#section-4.2).
*/
var generateCodeVerifier = (length) => {
	const randomBytes = new Uint8Array(length);
	getCrypto().getRandomValues(randomBytes);
	let value = "";
	let codeChallenge;
	for (const byte of randomBytes) value += CODE_VERIFIER_CHARSET.charAt(byte % 62);
	return {
		value,
		method: "S256",
		toCodeChallenge() {
			if (codeChallenge) return codeChallenge;
			codeChallenge = generateCodeChallenge(value);
			return codeChallenge;
		}
	};
};
function generateCodeChallenge(codeVerifier) {
	const awsCryptoHash = new Sha256();
	awsCryptoHash.update(codeVerifier);
	return removePaddingChar(base64Encoder.convert(awsCryptoHash.digestSync(), { urlSafe: true }));
}
function removePaddingChar(base64Encoded) {
	return base64Encoded.replace(/=/g, "");
}
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/generateState.mjs
var generateState = () => {
	return generateRandomString(32);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/utils/oauth/cancelOAuthFlow.mjs
var listenForOAuthFlowCancellation = (store) => {
	async function handleCancelOAuthFlow(event) {
		if (event.persisted && await store.loadOAuthInFlight()) await handleFailure(createOAuthError("User cancelled OAuth flow."));
		window.removeEventListener("pageshow", handleCancelOAuthFlow);
	}
	window.addEventListener("pageshow", handleCancelOAuthFlow);
};
//#endregion
//#region node_modules/@aws-amplify/auth/dist/esm/providers/cognito/apis/signInWithRedirect.mjs
async function signInWithRedirect(...args) {
	const [ctx, input] = resolveCtxArgs(args);
	const authConfig = ctx.resourcesConfig.Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	assertOAuthConfig(authConfig);
	oAuthStore.setAuthConfig(authConfig);
	if (!input?.options?.prompt) await assertUserNotAuthenticated(ctx);
	let provider = "COGNITO";
	let idpIdentifier;
	if (typeof input?.provider === "string") provider = cognitoHostedUIIdentityProviderMap[input.provider];
	else if (input?.provider?.custom) provider = input.provider.custom;
	else if (input?.provider?.idpIdentifier) ({idpIdentifier} = input.provider);
	else if (input?.options?.prompt === "NONE") provider = void 0;
	return oauthSignIn({
		oauthConfig: authConfig.loginWith.oauth,
		clientId: authConfig.userPoolClientId,
		provider,
		idpIdentifier,
		customState: input?.customState,
		preferPrivateSession: input?.options?.preferPrivateSession,
		options: {
			loginHint: input?.options?.loginHint,
			lang: input?.options?.lang,
			nonce: input?.options?.nonce,
			prompt: input?.options?.prompt
		},
		authSessionOpener: input?.options?.authSessionOpener
	});
}
var oauthSignIn = async ({ oauthConfig, provider, idpIdentifier, clientId, customState, preferPrivateSession, options, authSessionOpener }) => {
	const { domain, redirectSignIn, responseType, scopes } = oauthConfig;
	const { loginHint, lang, nonce, prompt } = options ?? {};
	const randomState = generateState();
	const openAuthSession$1 = authSessionOpener || openAuthSession;
	const state = customState ? `${randomState}-${urlSafeEncode(customState)}` : randomState;
	const { value, method, toCodeChallenge } = generateCodeVerifier(128);
	const redirectUri = getRedirectUrl(oauthConfig.redirectSignIn);
	if (isBrowser()) oAuthStore.storeOAuthInFlight(true);
	oAuthStore.storeOAuthState(state);
	oAuthStore.storePKCE(value);
	const params = new URLSearchParams();
	params.append("redirect_uri", redirectUri);
	params.append("response_type", responseType);
	params.append("client_id", clientId);
	if (idpIdentifier) params.append("idp_identifier", idpIdentifier);
	else if (provider) params.append("identity_provider", provider);
	params.append("scope", scopes.join(" "));
	loginHint && params.append("login_hint", loginHint);
	lang && params.append("lang", lang);
	nonce && params.append("nonce", nonce);
	prompt && params.append("prompt", prompt.toLowerCase());
	params.append("state", state);
	if (responseType === "code") {
		params.append("code_challenge", toCodeChallenge());
		params.append("code_challenge_method", method);
	}
	const oAuthUrl = `https://${domain}/oauth2/authorize?${params.toString()}`;
	listenForOAuthFlowCancellation(oAuthStore);
	const { type, error, url } = await openAuthSession$1(oAuthUrl, redirectSignIn, preferPrivateSession) ?? {};
	try {
		if (type === "error") throw createOAuthError(String(error));
		if (type === "canceled") throw createOAuthError(String(type));
		if (type === "success" && url) await completeOAuthFlow({
			currentUrl: url,
			clientId,
			domain,
			redirectUri,
			responseType,
			userAgentValue: getAuthUserAgentValue(AuthAction.SignInWithRedirect),
			preferPrivateSession
		});
	} catch (err) {
		await handleFailure(err);
		throw err;
	}
};
//#endregion
export { assertAuthTokens as $, resetActiveSignInState as A, setGlobalContext as At, getAuthStorageKeys as B, AmplifyUrl as Bt, serializePkcWithAttestationToJson as C, registerContextTokenOrchestrator as Ct, PasskeyErrorCode as D, isAmplifyContext as Dt, PasskeyError as E, AMPLIFY_CONTEXT_BRAND as Et, cacheCognitoTokens as F, AuthAction as Ft, createInitiateAuthClient as G, createCognitoUserPoolEndpointResolver as H, AmplifyError as Ht, cognitoUserPoolsTokenProvider as I, assertIdentityPoolIdConfig as It, createUserPoolDeserializer as J, DEFAULT_SERVICE_CLIENT_API_CONFIG as K, TokenOrchestrator as L, assertOAuthConfig as Lt, signInStore as M, Hub as Mt, dispatchSignedInHubEvent as N, HubInternal as Nt, assertPasskeyError as O, getGlobalContext as Ot, resolveTokenOrchestrator as P, getAmplifyUserAgent as Pt, getCurrentUser as Q, DefaultOAuthStore as R, assertTokenProviderConfig as Rt, deserializeJsonToPkcCreationOptions as S, AuthValidationErrorCode as St, handlePasskeyError as T, resolveCtxArgs as Tt, createAssociateSoftwareTokenClient as U, refreshAuthTokensWithoutDedupe as V, ConsoleLogger as Vt, createVerifySoftwareTokenClient as W, createUserPoolSerializer as X, assertServiceError as Y, getAuthUserAgentValue as Z, setActiveSignInUsername as _, getRegionFromUserPoolId as _t, getActiveSignInUsername as a, SETUP_TOTP_EXCEPTION as at, getNewDeviceMetadata as b, AuthErrorCodes as bt, getSignInResult as c, unauthenticatedHandler as ct, handleChallengeName as d, jitteredBackoff as dt, assertAuthTokensWithRefreshToken as et, handleCustomAuthFlowWithoutSRP as f, composeServiceApi as ft, handlePasswordSRP as g, getRegionFromIdentityPoolId as gt, handleUserSRPAuthFlow as h, parseMetadata as ht, assertUserNotAuthenticated as i, OAUTH_SIGNOUT_EXCEPTION as it, setActiveSignInState as j, AMPLIFY_SYMBOL as jt, passkeyErrorMap as k, hasGlobalContext as kt, getSignInResultFromError as l, composeTransferHandler as lt, handleUserPasswordAuthFlow as m, parseJsonError as mt, openAuthSession as n, assertIdTokenInAuthTokens as nt, getMFAType as o, SignUpException as ot, handleCustomSRPAuthFlow as p, parseJsonBody as pt, cognitoUserPoolTransferHandler as q, getRedirectUrl as r, AUTO_SIGN_IN_EXCEPTION as rt, getMFATypes as s, getDnsSuffix as st, signInWithRedirect as t, assertDeviceMetadata as tt, getTOTPSetupDetails as u, getRetryDecider as ut, retryOnResourceNotFoundException as v, assertValidationError as vt, getIsPasskeySupported as w, defaultStorage as wt, assertCredentialIsPkcWithAuthenticatorAttestationResponse as x, validationErrorMap as xt, getUserContextData as y, AuthError as yt, DefaultTokenStore as z, decodeJWT as zt };
