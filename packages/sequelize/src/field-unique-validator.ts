import { Constructable, errRes, NullablePartial, okRes, Res } from '@artisan-framework/core';
import { Op } from 'sequelize';
import { SequelizeSessionManager } from './session';

interface Rule<T, E> {
	fields: Array<keyof T>;
	message: E;
}

export class FieldUniqueValidator<T, E> {
	private constructor(private rules: Array<Rule<T, E>>, private excludes: Array<keyof T>) {}

	static build<T, E>(): FieldUniqueValidator<T, E> {
		return new FieldUniqueValidator<T, E>([], []);
	}

	unique(fields: keyof T | Array<keyof T>, message: E): FieldUniqueValidator<T, E> {
		return new FieldUniqueValidator<T, E>(
			[
				...this.rules,
				{
					fields: Array.isArray(fields) ? fields : [fields],
					message,
				},
			],
			this.excludes,
		);
	}

	exclude(fields: keyof T | Array<keyof T>): FieldUniqueValidator<T, E> {
		const excludes = Array.isArray(fields) ? fields : [fields];
		return new FieldUniqueValidator<T, E>(this.rules, [...this.excludes, ...excludes]);
	}

	async validate(
		session: SequelizeSessionManager,
		entity: Constructable<T>,
		attrs: NullablePartial<T>,
	): Promise<Res<undefined, E>> {
		const or: any[] = [];
		const attributes: string[] = [];
		const rules: Array<Rule<T, E>> = [];

		for (const rule of this.rules) {
			const criterion = this.getOrCause(rule, attrs);

			if (criterion) {
				or.push(criterion);
				attributes.push(...(rule.fields as string[]));
				rules.push(rule);
			}
		}

		if (!or.length) {
			return okRes(undefined);
		}

		const where: any = {
			[Op.or]: or,
		};

		for (const exclude of this.excludes) {
			if (where[exclude] == null && attrs[exclude] != null) {
				where[exclude] = {
					[Op.ne]: attrs[exclude],
				};
			}
		}

		const existedList = await session.findAll(entity, {
			where,
			attributes: [...new Set(attributes)],
		});

		for (const rule of rules) {
			const index = existedList.findIndex((item) => {
				for (const filed of rule.fields) {
					if ((item as any)[filed] !== attrs[filed]) {
						return false;
					}
				}

				return true;
			});

			if (index >= 0) {
				return errRes(rule.message);
			}
		}

		return okRes(undefined);
	}

	private getOrCause(rule: Rule<T, E>, attrs: NullablePartial<T>): undefined | NullablePartial<T> {
		const criterion: NullablePartial<T> = {};

		for (const filed of rule.fields) {
			const value = attrs[filed];
			if (value != null) {
				criterion[filed] = value;
			} else {
				return;
			}
		}

		return criterion;
	}
}
