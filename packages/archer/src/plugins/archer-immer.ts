import produce from 'immer';
import { ArcherOptions, ArcherReducers } from '../archer-protocol';

export function archerImmer(): ArcherOptions {
	return {
		modelReducerMapEnhancers: [
			(reducers): ArcherReducers => {
				const newReducers: typeof reducers = {};

				for (const key of Object.keys(reducers)) {
					const reducer = reducers[key];

					newReducers[key] = (state, ...args): any => {
						if (typeof state === 'object') {
							return produce(state, (draft: any) => {
								const next = reducer(draft, ...args);

								if (typeof next !== undefined) {
									return next;
								}
							});
						} else {
							return reducer(state, ...args);
						}
					};
				}

				return newReducers;
			},
		],
	};
}
