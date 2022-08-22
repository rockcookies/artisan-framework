/* eslint-disable @typescript-eslint/ban-types */

export interface ArtisanErrorOptions {
	cause?: any;
}

// thanks for: https://github.com/adriengibrat/ts-custom-error

/**
 * Fix the prototype chain of the error
 *
 * Use Object.setPrototypeOf
 * Support ES6 environments
 *
 * Fallback setting __proto__
 * Support IE11+, see https://docs.microsoft.com/en-us/scripting/javascript/reference/javascript-version-information
 */
function fixProto(target: Error, prototype: {}) {
	const setPrototypeOf: Function = (Object as any).setPrototypeOf;
	setPrototypeOf ? setPrototypeOf(target, prototype) : ((target as any).__proto__ = prototype);
}

/**
 * Capture and fix the error stack when available
 *
 * Use Error.captureStackTrace
 * Support v8 environments
 */
function fixStack(target: Error, fn: Function = target.constructor) {
	const captureStackTrace: Function = (Error as any).captureStackTrace;
	captureStackTrace && captureStackTrace(target, fn);
}

export class ArtisanThrowable extends Error {
	cause: any;

	constructor(message: string, options?: ArtisanErrorOptions) {
		super(message);
		this.cause = options?.cause;

		// set error name as constructor name, make it not enumerable to keep native Error behavior
		// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new.target#new.target_in_constructors
		// see https://github.com/adriengibrat/ts-custom-error/issues/30
		Object.defineProperty(this, 'name', {
			value: new.target.name,
			enumerable: false,
			configurable: true,
		});

		// fix the extended error prototype chain
		// because typescript __extends implementation can't
		// see https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
		fixProto(this, new.target.prototype);
		// try to remove contructor from stack trace
		fixStack(this);
	}
}

/** ArtisanException is system error. */
export class ArtisanException extends ArtisanThrowable {
	constructor(message: string, options?: ArtisanErrorOptions) {
		super(message, options);
	}
}

/** ArtisanError is business error. */
export class ArtisanError extends ArtisanThrowable {
	constructor(message: string, options?: ArtisanErrorOptions) {
		super(message, options);
	}
}
