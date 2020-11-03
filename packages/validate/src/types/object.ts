import { okRes } from '@artisan-framework/core';
import { Criterion, CriterionShape, CriterionShapeStatic } from '../criterion';
import { ValidateErrorEntry, ValidateResult } from '../interfaces';
import { object as objectLocale } from '../locale';
import { errorEntryCreator } from '../validate-helper';

interface ObjectCriterionOptions {
	locale?: Partial<typeof objectLocale>;
	strict?: boolean;
	shape?: CriterionShape;
}

const TAG = 'object';
const err = errorEntryCreator(TAG);

export class ObjectCriterion<T extends CriterionShape = CriterionShape> extends Criterion<CriterionShapeStatic<T>> {
	constructor(protected _options: ObjectCriterionOptions = {}) {
		super(
			TAG,
			(value: any, context): ValidateResult<CriterionShapeStatic<T>> => {
				const path = context.path || 'object';
				const { abortEarly } = context.options;

				const locale: typeof objectLocale = {
					...objectLocale,
					..._options.locale,
				};

				if (typeof value !== 'object' || !value) {
					return err(locale.type, { path }, value);
				}

				const shape = _options.shape;
				if (!shape) {
					return okRes(value);
				}

				const convert = context.options.convert;
				const strict = _options.strict === undefined ? true : _options.strict;
				const shapeKeys = Object.keys(shape);
				const valueKeys = Object.keys(value);
				const unknownKeys = valueKeys.filter((key) => !shapeKeys.includes(key));

				if (!convert && strict && unknownKeys.length > 0) {
					return err(locale.strict, { path }, value);
				}

				let changed = false;
				const newValue: any = {};
				const errors: ValidateErrorEntry[] = [];

				for (const key of shapeKeys) {
					const fieldValue = value[key];
					const fieldResult = shape[key].check(fieldValue, {
						...context,
						path: `${path}[${key}]`,
					});

					if (fieldResult.isError) {
						errors.push(fieldResult.error);

						if (abortEarly) {
							break;
						}
					} else if (errors.length <= 0) {
						newValue[key] = fieldResult.value;

						if (!changed && fieldResult.value !== fieldValue) {
							changed = true;
						}
					}
				}

				// error
				if (errors.length > 0) {
					return err(locale.shape, { path }, value, errors);
				}

				// convert
				if (convert) {
					return okRes(changed ? newValue : value);
				}

				// unknown keys
				if (!strict && unknownKeys.length > 0 && changed) {
					for (const key of unknownKeys) {
						newValue[key] = value[key];
					}
				}

				return okRes(changed ? newValue : value);
			},
		);
	}

	static create<P extends CriterionShape>(message?: string): ObjectCriterion<P> {
		return new ObjectCriterion({
			locale: { ...(message ? { type: message } : {}) },
		});
	}

	shape<P extends CriterionShape>(shape: P, message?: string): ObjectCriterion<P> {
		return new ObjectCriterion({
			...this._options,
			shape,
			locale: { ...this._options.locale, ...(message ? { shape: message } : {}) },
		});
	}

	locale(locale: Partial<typeof objectLocale>): ObjectCriterion<T> {
		return new ObjectCriterion<T>({
			...this._options,
			locale: { ...this._options.locale, ...locale },
		});
	}

	nonStrict(): ObjectCriterion<T> {
		return new ObjectCriterion<T>({
			...this._options,
			strict: false,
		});
	}

	strict(message?: string) {
		return new ObjectCriterion<T>({
			...this._options,
			strict: true,
			locale: { ...this._options.locale, ...(message ? { strict: message } : {}) },
		});
	}
}
