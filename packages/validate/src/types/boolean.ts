import { okRes } from '@artisan-framework/core';
import { Criterion } from '../criterion';
import { ValidateResult } from '../interfaces';
import { boolean as booleanLocale } from '../locale';
import { errorEntryCreator } from '../validate-helper';

interface BooleanCriterionOptions {
	locale?: Partial<typeof booleanLocale>;
}

const TAG = 'boolean';
const err = errorEntryCreator(TAG);

export class BooleanCriterion extends Criterion<boolean> {
	constructor(protected _options: BooleanCriterionOptions = {}) {
		super(
			TAG,
			(value: any, context): ValidateResult<boolean> => {
				let bool: boolean | undefined;

				const locale: typeof booleanLocale = {
					...booleanLocale,
					..._options.locale,
				};

				if (typeof value === 'boolean') {
					bool = value;
				} else if (context.options.convert) {
					bool = !!value;
				}

				const path = context.path || 'object';
				return bool != null ? okRes(bool) : err(locale.type, { path }, value);
			},
		);
	}

	static create(message?: string): BooleanCriterion {
		return new BooleanCriterion({
			locale: { ...(message ? { type: message } : {}) },
		});
	}

	locale(locale: Partial<typeof booleanLocale>): BooleanCriterion {
		return new BooleanCriterion({
			...this._options,
			locale: { ...this._options.locale, ...locale },
		});
	}
}
