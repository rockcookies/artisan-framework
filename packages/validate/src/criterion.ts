import { okRes } from '@artisan-framework/core';
import { ValidateCheck, ValidateDecoder, ValidateOptions, ValidateResult } from './interfaces';

export type CriterionStatic<C extends Criterion<any>> = C['_T'];

export type CriterionMixed = Criterion<any, unknown>;

export type CriterionShape = { [k: string]: CriterionMixed };

export type CriterionShapeStatic<P extends CriterionShape> = { [K in keyof P]: CriterionStatic<P[K]> };

export class Criterion<To, Input = any> implements ValidateDecoder<Input, To> {
	readonly _T: To;
	readonly _I: Input;

	constructor(readonly tag: string, readonly check: ValidateCheck<Input, To>) {}

	decode(input: Input, options?: ValidateOptions): ValidateResult<To> {
		return this.check(input, {
			options: {
				convert: false,
				abortEarly: true,
				...options,
			},
		});
	}

	pipe<T2>(criterion: Criterion<T2, To>): Criterion<T2, Input> {
		return this.pipeWith(criterion.tag, criterion.check);
	}

	pipeWith<T2>(nextTag: string, nextCheck: ValidateCheck<To, T2>): Criterion<T2, Input> {
		return new Criterion<T2, Input>(`pipe(${this.tag}, ${nextTag})`, (input, context) => {
			const result = this.check(input, context);

			if (result.isError) {
				return result;
			}

			return result.isError ? result : nextCheck(result.value, context);
		});
	}

	default<D>(value: D): Criterion<To | D, Input> {
		return new Criterion<To | D, Input>(this.tag, (input, context) => {
			if (input == null) {
				return okRes(value);
			}

			return this.check(input, context);
		});
	}
}
