import { okRes } from '@artisan-framework/core';
import { Criterion, CriterionMixed, CriterionStatic } from '../criterion';
import { ValidateErrorEntry, ValidateResult } from '../interfaces';
import { array as arrayLocale } from '../locale';
import { errorEntryCreator } from '../validate-helper';

interface ArrayCriterionOptions {
	locale?: Partial<typeof arrayLocale>;
	min?: number;
	max?: number;
	length?: number;
	items?: CriterionMixed;
}

const TAG = 'array';
const err = errorEntryCreator(TAG);

export class ArrayCriterion<T extends CriterionMixed = CriterionMixed> extends Criterion<Array<CriterionStatic<T>>> {
	protected constructor(protected _options: ArrayCriterionOptions = {}) {
		super(TAG, (value: any, context): ValidateResult<Array<CriterionStatic<T>>> => {
			const path = context.path || 'object';
			const { abortEarly } = context.options;

			const locale: typeof arrayLocale = {
				...arrayLocale,
				..._options.locale,
			};

			if (!Array.isArray(value)) {
				return err(locale.type, { path }, value);
			}

			const len = value.length;

			if (_options.length != null && len !== _options.length) {
				return err(locale.length, { path, length: _options.length }, value);
			}

			if (_options.min != null && len < _options.min) {
				return err(locale.min, { path, min: _options.min }, value);
			}

			if (_options.max != null && len > _options.max) {
				return err(locale.max, { path, max: _options.max }, value);
			}

			if (!_options.items) {
				return okRes(value);
			}

			let changed = false;
			const newValue: any[] = [];
			const errors: ValidateErrorEntry[] = [];

			for (let i = 0; i < len; i++) {
				const itemValue = value[i];
				const itemResult = _options.items.check(itemValue, {
					...context,
					path: `${path}[${i}]`,
				});

				if (itemResult.isError) {
					errors.push(itemResult.error);

					if (abortEarly) {
						break;
					}
				} else if (errors.length <= 0) {
					newValue.push(itemResult.value);

					if (!changed && itemResult.value !== itemValue) {
						changed = true;
					}
				}
			}

			if (errors.length > 0) {
				return err(locale.items, { path }, value, errors);
			} else {
				return okRes(changed ? newValue : value);
			}
		});
	}

	static create(message?: string): ArrayCriterion {
		return new ArrayCriterion({
			locale: { ...(message ? { type: message } : {}) },
		});
	}

	locale(locale: Partial<typeof arrayLocale>): ArrayCriterion<T> {
		return new ArrayCriterion<T>({
			...this._options,
			locale: { ...this._options.locale, ...locale },
		});
	}

	items<P extends CriterionMixed>(items: P, message?: string): ArrayCriterion<P> {
		return new ArrayCriterion<P>({
			...this._options,
			items,
			locale: { ...this._options.locale, ...(message ? { items: message } : {}) },
		});
	}

	min(min: number, message?: string): ArrayCriterion<T> {
		return new ArrayCriterion<T>({
			...this._options,
			min,
			locale: { ...this._options.locale, ...(message ? { min: message } : {}) },
		});
	}

	max(max: number, message?: string): ArrayCriterion<T> {
		return new ArrayCriterion<T>({
			...this._options,
			max,
			locale: { ...this._options.locale, ...(message ? { max: message } : {}) },
		});
	}

	length(length: number, message?: string): ArrayCriterion<T> {
		return new ArrayCriterion<T>({
			...this._options,
			length,
			locale: { ...this._options.locale, ...(message ? { length: message } : {}) },
		});
	}
}
