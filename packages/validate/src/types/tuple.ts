import { okRes } from '@artisan-framework/core';
import { Criterion, CriterionMixed } from '../criterion';
import { ValidateErrorEntry, ValidateResult } from '../interfaces';
import { tuple as tupleLocale } from '../locale';
import { errorEntryCreator } from '../validate-helper';

type TupleStatic<T extends [CriterionMixed, ...CriterionMixed[]] | []> = {
	[k in keyof T]: T[k] extends Criterion<infer U> ? U : never;
};

interface TupleCriterionOptions {
	locale?: Partial<typeof tupleLocale>;
	items?: CriterionMixed[];
}

const TAG = 'tuple';
const err = errorEntryCreator(TAG);

export class TupleCriterion<
	T extends [CriterionMixed, ...CriterionMixed[]] | [] = [CriterionMixed, ...CriterionMixed[]]
> extends Criterion<TupleStatic<T>> {
	constructor(protected _options: TupleCriterionOptions = {}) {
		super(
			TAG,
			(value: any, context): ValidateResult<TupleStatic<T>> => {
				const path = context.path || 'object';
				const { abortEarly } = context.options;

				const locale: typeof tupleLocale = {
					...tupleLocale,
					..._options.locale,
				};

				const items = _options.items || [];

				if (!Array.isArray(value) || value.length !== items.length) {
					return err(locale.type, { path, length: items.length }, value);
				}

				let changed = false;
				const newValue: any = [];
				const errors: ValidateErrorEntry[] = [];

				for (let i = 0; i < items.length; i++) {
					const itemValue = value[i];
					const itemResult = items[i].check(itemValue, {
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
			},
		);
	}

	locale(locale: Partial<typeof tupleLocale>): TupleCriterion<T> {
		return new TupleCriterion<T>({
			...this._options,
			locale: { ...this._options.locale, ...locale },
		});
	}

	items<P extends [CriterionMixed, ...CriterionMixed[]] | [] = [CriterionMixed, ...CriterionMixed[]]>(
		items: P,
		message?: string,
	): TupleCriterion<P> {
		return new TupleCriterion<P>({
			...this._options,
			items,
			locale: { ...this._options.locale, ...(message ? { items: message } : {}) },
		});
	}

	static create(message?: string): TupleCriterion {
		return new TupleCriterion({
			locale: { ...(message ? { type: message } : {}) },
		});
	}
}
