import { Dictionary } from '@artisan-framework/core';
import { Reducer } from 'redux';
import { ArcherModel } from './archer-protocol';
import { ActionCreator, getType } from 'typesafe-actions';

const reduceFieldState = (target: string | string[], mergeState: Dictionary): Reducer => {
	const [first, ...targets] = Array.isArray(target) ? target : [target];

	return (modelState, action): any => {
		const payload = action.payload || {};

		const newModelState = {
			...modelState,
			[first]: { ...(modelState[first] || {}) },
		};
		let state = newModelState[first];

		for (const t of targets) {
			state[t] = { ...(state[t] || {}) };
			state = state[t];
		}

		Object.assign(state, mergeState);
		Object.assign(state, payload);

		return newModelState;
	};
};

const reduceState = (mergeState: Dictionary): Reducer => {
	return (state, action): any => {
		const payload = action.payload || {};

		return {
			...state,
			...mergeState,
			...payload,
		};
	};
};

const stripModelPrefix = (key: string): string => {
	const [, ...rest] = key.split('/');
	return rest.join('');
};

const splitAction = (key: string): [string, string] => {
	const [first, ...rest] = key.split('-');
	return [first, rest.join('')];
};

export class ArcherModelBuilder<State, GlobalState> {
	private model: Required<ArcherModel>;

	constructor(namespace: keyof GlobalState) {
		this.model = {
			namespace: `${namespace}`,
			state: {},
			epics: [],
			reducers: {},
		};
	}

	asyncField(ac: ActionCreator<string>, acComplete: ActionCreator<string>): this {
		const type = getType(ac);
		const completeType = getType(acComplete);

		const reducerType = stripModelPrefix(getType(ac));
		const [target, action] = splitAction(reducerType);
		const fields = target.split('.');

		return this.merge({
			reducers: {
				[type]: reduceFieldState(fields, { [action]: true }),
				[completeType]: reduceFieldState(fields, { [action]: false }),
			},
		});
	}

	asyncState(ac: ActionCreator<string>, acComplete: ActionCreator<string>): this {
		const type = getType(ac);
		const completeType = getType(acComplete);

		const reducerType = stripModelPrefix(getType(ac));
		const [target, action] = splitAction(reducerType);
		const [first, ...xxx] = action;
		const fieldKey = `${target}${(first || '').toUpperCase()}${xxx.join('')}`;

		return this.merge({
			reducers: {
				[type]: reduceState({ [fieldKey]: true }),
				[completeType]: reduceState({ [fieldKey]: false }),
			},
		});
	}

	reducer<T extends ActionCreator<string> = ActionCreator<string>>(
		actionType: T,
		reducer: Reducer<State, ReturnType<T>>,
	): this {
		const type = getType(actionType);

		return this.merge({
			reducers: {
				[type]: reducer,
			},
		});
	}

	merge(...models: Array<Partial<ArcherModel<State, GlobalState>>>): this {
		for (const model of models) {
			Object.assign(this.model.state, model.state || {});
			Object.assign(this.model.reducers, model.reducers || {});
			this.model.epics.push(...(model.epics || []));
		}

		return this;
	}

	build(): Required<ArcherModel<State, GlobalState>> {
		return this.model;
	}
}
