import { Res } from '@artisan-framework/core';

export interface ValidateOptions {
	/** when true, attempts to cast values to the required types. Defaults to false. */
	convert?: boolean;
	/** Return from validation methods on the first error rather than after all validations run. Default - true */
	abortEarly?: boolean;
}

export interface ValidateErrorEntry {
	readonly tag: string;
	readonly input: any;
	readonly message: string;
	readonly children?: ValidateErrorEntry[];
}

export interface ValidateContext {
	path?: string;
	options: ValidateOptions;
}

export type ValidateResult<T> = Res<T, ValidateErrorEntry>;

export type ValidateCheck<I, T> = (i: I, context: ValidateContext) => ValidateResult<T>;

export interface ValidateDecoder<I, T> {
	readonly tag: string;
	readonly check: ValidateCheck<I, T>;
	readonly decode: (i: I, options?: ValidateOptions) => ValidateResult<T>;
}
