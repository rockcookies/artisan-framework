import { ArrayCriterion } from './types/array';
import { BooleanCriterion } from './types/boolean';
import { LiteralCriterion, NullCriterion, UndefinedCriterion, VoidCriterion } from './types/literal';
import { NumberCriterion } from './types/number';
import { ObjectCriterion } from './types/object';
import { StringCriterion } from './types/string';
import { TupleCriterion } from './types/tuple';
import { UnionCriterion } from './types/union';

export const Validator = {
	array: ArrayCriterion.create,
	boolean: BooleanCriterion.create,
	literal: LiteralCriterion.create,
	null: NullCriterion.create,
	undefined: UndefinedCriterion.create,
	void: VoidCriterion.create,
	number: NumberCriterion.create,
	object: ObjectCriterion.create,
	string: StringCriterion.create,
	tuple: TupleCriterion.create,
	union: UnionCriterion.create,
};

export { formatValidateError } from './validate-helper';
export * as locale from './locale';
export {
	ValidateOptions,
	ValidateErrorEntry,
	ValidateContext,
	ValidateResult,
	ValidateCheck,
	ValidateDecoder,
} from './interfaces';
export { Criterion, CriterionStatic, CriterionMixed, CriterionShape, CriterionShapeStatic } from './criterion';
