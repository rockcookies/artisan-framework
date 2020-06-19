import { okRes } from '@artisan-framework/core';
import { Criterion, CriterionMixed, CriterionStatic } from '../criterion';
import { ValidateErrorEntry, ValidateResult } from '../interfaces';
import { union as unionLocale } from '../locale';
import { errorEntryCreator } from '../validate-helper';

type UnionStatic<T extends [CriterionMixed, ...CriterionMixed[]] | []> = CriterionStatic<T[number]>;

interface TupleCriterionOptions {
	locale?: Partial<typeof unionLocale>;
}

const TAG = 'union';
const err = errorEntryCreator(TAG);

export class UnionCriterion<
	T extends [CriterionMixed, ...CriterionMixed[]] | [] = [CriterionMixed, ...CriterionMixed[]]
> extends Criterion<UnionStatic<T>> {
	constructor(protected _alternatives: T, protected _options: TupleCriterionOptions = {}) {
		super(
			TAG,
			(value, context): ValidateResult<UnionStatic<T>> => {
				const path = context.path || 'object';

				const locale: typeof unionLocale = {
					...unionLocale,
					..._options.locale,
				};

				const errors: ValidateErrorEntry[] = [];

				for (let i = 0; i < _alternatives.length; i++) {
					const result = _alternatives[i].check(value, {
						...context,
						path,
					});

					if (result.isError) {
						errors.push(result.error);
					} else {
						return okRes(result.value);
					}
				}

				return err(locale.type, { path }, value, errors);
			},
		);
	}

	locale(locale: Partial<typeof unionLocale>): UnionCriterion<T> {
		return new UnionCriterion<T>(this._alternatives, {
			...this._options,
			locale: { ...this._options.locale, ...locale },
		});
	}

	static create<C extends [CriterionMixed, ...CriterionMixed[]] | [] = [CriterionMixed, ...CriterionMixed[]]>(
		alternatives: C,
		message?: string,
	): UnionCriterion<C> {
		return new UnionCriterion<C>(alternatives, {
			locale: { ...(message ? { type: message } : {}) },
		});
	}
}
