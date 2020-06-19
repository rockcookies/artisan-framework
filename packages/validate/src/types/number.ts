import { okRes } from '@artisan-framework/core';
import { Criterion } from '../criterion';
import { ValidateResult } from '../interfaces';
import { number as numberLocale } from '../locale';
import { errorEntryCreator } from '../validate-helper';

interface NumberCriterionOptions {
	locale?: Partial<typeof numberLocale>;
	integer?: boolean;
	min?: number;
	max?: number;
}

const TAG = 'number';
const err = errorEntryCreator(TAG);

export class NumberCriterion extends Criterion<number> {
	constructor(protected _options: NumberCriterionOptions = {}) {
		super(
			TAG,
			(value: any, context): ValidateResult<number> => {
				let num: number | undefined;

				if (typeof value === 'number') {
					num = value;
				} else if (context.options.convert) {
					num = Number(value);
				}

				const locale: typeof numberLocale = {
					...numberLocale,
					..._options.locale,
				};

				const path = context.path || 'object';

				if (num == null || isNaN(num)) {
					return err(locale.type, { path }, value);
				}

				if (_options.integer && num % 1 !== 0) {
					return err(locale.integer, { path }, value);
				}

				if (_options.min != null && num < _options.min) {
					return err(locale.min, { path, min: _options.min }, value);
				}

				if (_options.max != null && num > _options.max) {
					return err(locale.max, { path, max: _options.max }, value);
				}

				return okRes(num);
			},
		);
	}

	static create(message?: string): NumberCriterion {
		return new NumberCriterion({
			locale: { ...(message ? { type: message } : {}) },
		});
	}

	locale(locale: Partial<typeof numberLocale>): NumberCriterion {
		return new NumberCriterion({
			...this._options,
			locale: { ...this._options.locale, ...locale },
		});
	}

	integer(message?: string): NumberCriterion {
		return new NumberCriterion({
			...this._options,
			integer: true,
			locale: { ...this._options.locale, ...(message ? { integer: message } : {}) },
		});
	}

	min(min: number, message?: string): NumberCriterion {
		return new NumberCriterion({
			...this._options,
			min,
			locale: { ...this._options.locale, ...(message ? { min: message } : {}) },
		});
	}

	max(max: number, message?: string): NumberCriterion {
		return new NumberCriterion({
			...this._options,
			max,
			locale: { ...this._options.locale, ...(message ? { max: message } : {}) },
		});
	}
}
