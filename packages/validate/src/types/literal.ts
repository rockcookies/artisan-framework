import { okRes } from '@artisan-framework/core';
import { Criterion } from '../criterion';
import { ValidateResult } from '../interfaces';
import { literal as literalLocale } from '../locale';
import { errorEntryCreator } from '../validate-helper';

interface LiteralCriterionOptions {
	locale?: Partial<typeof literalLocale>;
}

const literalTag = 'literal';
const literalErr = errorEntryCreator(literalTag);

export class LiteralCriterion<T extends boolean | number | string | null | undefined> extends Criterion<T> {
	constructor(protected _literal: T, protected _options: LiteralCriterionOptions = {}) {
		super(
			literalTag,
			(value, context): ValidateResult<T> => {
				if (value === _literal) {
					return okRes(value);
				}

				const locale: typeof literalLocale = {
					...literalLocale,
					..._options.locale,
				};

				return literalErr(
					locale.type,
					{
						path: context.path || 'object',
						target: typeof _literal === 'string' ? `'${_literal}'` : String(_literal),
					},
					value,
				);
			},
		);
	}

	static create<T extends boolean | number | string | null | undefined>(
		literal: T,
		message?: string,
	): LiteralCriterion<T> {
		return new LiteralCriterion(literal, {
			locale: { ...(message ? { type: message } : {}) },
		});
	}

	locale(locale: Partial<typeof literalLocale>): LiteralCriterion<T> {
		return new LiteralCriterion<T>(this._literal, {
			...this._options,
			locale: { ...this._options.locale, ...locale },
		});
	}
}

const nullTag = 'null';
const nullErr = errorEntryCreator(nullTag);

export class NullCriterion extends Criterion<null> {
	constructor(protected _options: LiteralCriterionOptions = {}) {
		super(
			nullTag,
			(value, context): ValidateResult<null> => {
				if (value === null) {
					return okRes(value);
				}

				const locale: typeof literalLocale = {
					...literalLocale,
					..._options.locale,
				};

				return nullErr(locale.type, { path: context.path || 'object', target: 'null' }, value);
			},
		);
	}

	static create(message?: string): NullCriterion {
		return new NullCriterion({
			locale: { ...(message ? { type: message } : {}) },
		});
	}

	locale(locale: Partial<typeof literalLocale>): NullCriterion {
		return new NullCriterion({
			...this._options,
			locale: { ...this._options.locale, ...locale },
		});
	}
}

const undefinedTag = 'undefined';
const undefinedErr = errorEntryCreator(undefinedTag);

export class UndefinedCriterion extends Criterion<undefined> {
	constructor(protected _options: LiteralCriterionOptions = {}) {
		super(
			undefinedTag,
			(value, context): ValidateResult<undefined> => {
				if (value === undefined) {
					return okRes(value);
				}

				const locale: typeof literalLocale = {
					...literalLocale,
					..._options.locale,
				};

				return undefinedErr(locale.type, { path: context.path || 'object', target: 'undefined' }, value);
			},
		);
	}

	static create(message?: string): UndefinedCriterion {
		return new UndefinedCriterion({
			locale: { ...(message ? { type: message } : {}) },
		});
	}

	locale(locale: Partial<typeof literalLocale>): UndefinedCriterion {
		return new UndefinedCriterion({
			...this._options,
			locale: { ...this._options.locale, ...locale },
		});
	}
}

const voidTag = 'void';
const voidErr = errorEntryCreator(voidTag);

export class VoidCriterion extends Criterion<null | undefined> {
	constructor(protected _options: LiteralCriterionOptions = {}) {
		super(
			voidTag,
			(value: any, context): ValidateResult<null | undefined> => {
				if (value === null || value === undefined) {
					return okRes(value);
				}

				const locale: typeof literalLocale = {
					...literalLocale,
					..._options.locale,
				};

				return voidErr(
					locale.type,
					{
						path: context.path || 'object',
						target: 'null | undefined',
					},
					value,
				);
			},
		);
	}

	static create(message?: string): VoidCriterion {
		return new VoidCriterion({
			locale: { ...(message ? { type: message } : {}) },
		});
	}

	locale(locale: Partial<typeof literalLocale>): VoidCriterion {
		return new VoidCriterion({
			...this._options,
			locale: { ...this._options.locale, ...locale },
		});
	}
}
