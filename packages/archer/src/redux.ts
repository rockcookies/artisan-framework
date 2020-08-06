import {
	applyMiddleware,
	combineReducers,
	compose,
	createStore,
	Middleware,
	Reducer,
	ReducersMapObject,
	Store,
	StoreEnhancer,
} from 'redux';
import { ArcherModel, ArcherReducers } from './archer-protocol';

const ROOT: any =
	(typeof self === 'object' && self.self === self && self) ||
	(typeof global === 'object' && global.global === global && global) ||
	this;

export function createModelReducer(
	model: ArcherModel,
	enhancer: (reducers: ArcherReducers) => ArcherReducers,
): Reducer {
	const reducersMap: ArcherReducers = enhancer(model.reducers || {});

	const reducers: ArcherReducers = {};

	Object.keys(reducersMap).forEach((key) => {
		// reducers[`${model.namespace}/${key}`] = reducersMap[key];
		reducers[key] = reducersMap[key];
	});

	const defaultState = model.state;

	return (state = defaultState, action): any => {
		const { type } = action;

		if (typeof reducers[type] === 'function') {
			return reducers[type](state, action);
		}

		return state;
	};
}

export function createReduxStore(options: {
	reducers: ReducersMapObject;
	initialState?: any;
	middlewares?: Middleware[];
	enhancers?: Array<StoreEnhancer<any>>;
}): Store {
	const mergedReducers = combineReducers(options.reducers);

	const reduxDevTools = ROOT.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
	const composeEnhancers: typeof compose =
		process.env.NODE_ENV !== 'production' && reduxDevTools ? reduxDevTools({ trace: true, maxAge: 30 }) : compose;
	const mergedEnhancers = [applyMiddleware(...(options.middlewares || [])), ...(options.enhancers || [])];

	return createStore(mergedReducers, options.initialState || {}, composeEnhancers(...mergedEnhancers));
}

export function updateReducers(store: Store, reducers: ReducersMapObject): void {
	const mergedReducers = combineReducers(reducers);
	store.replaceReducer(mergedReducers);
}
