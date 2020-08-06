import { Dictionary } from '@artisan-framework/core';
import { ReducersMapObject, StoreEnhancer, Middleware, Store } from 'redux';
import { Epic, createEpicMiddleware } from 'redux-observable';
import { ArcherModel, ArcherReducers, ArcherEpics, ArcherErrorHandler, ArcherOptions } from './archer-protocol';
import { createModelReducer, updateReducers, createReduxStore } from './redux';
import { createModelEpic, updateEpics, createRootEpic } from './observable';
import { Subject } from 'rxjs';

type Enhancer<T> = (s: T) => T;

export class Archer {
	private _cache?: [Subject<Epic>, Store];

	private _initialState: Dictionary = {};
	private _rootReducers: ReducersMapObject = {};
	private _rootEpics: Epic[] = [];
	private _models: ArcherModel[] = [];
	private _storeEnhancers: Array<StoreEnhancer<any>> = [];
	private _middlewares: Middleware[] = [];
	private _reducersEnhancer: Enhancer<ArcherReducers> = (e) => e;
	private _epicsEnhancer: Enhancer<ArcherEpics> = (e) => e;
	private _onErrors: ArcherErrorHandler[] = [];

	constructor({ plugins = [], ...options }: ArcherOptions & { plugins?: ArcherOptions[] } = {}) {
		const reducers: Array<Enhancer<ArcherReducers>> = [];
		const epics: Array<Enhancer<ArcherEpics>> = [];

		[...plugins, options].forEach((opt) => {
			this._initialState = { ...this._initialState, ...opt.initialState };
			this._rootReducers = { ...this._rootReducers, ...opt.rootReducers };
			this._rootEpics.push(...(opt.rootEpics || []));
			reducers.push(...(opt.modelReducerMapEnhancers || []));
			epics.push(...(opt.modelEpicMapEnhancers || []));
			this._storeEnhancers.push(...(opt.storeEnhancers || []));
			this._middlewares.push(...(opt.middlewares || []));
			this._onErrors.push(...(opt.onErrors || []));

			for (const model of opt.models || []) {
				this._checkModel(this._models, model);
				this._models.push(model);
			}
		});

		this._reducersEnhancer = reducers.reduce((p, c) => {
			return (source): ArcherReducers => c(p(source));
		}, this._reducersEnhancer);

		this._epicsEnhancer = epics.reduce((p, c) => {
			return (source): Epic[] => c(p(source));
		}, this._epicsEnhancer);
	}

	injectModel(model: ArcherModel): void {
		this._checkModel(this._models, model);
		this._models = [...this._models, model];
		this.reload();
	}

	ejectModel(namespace: string): void {
		const newModels = this._models.filter((m) => m.namespace !== namespace);

		// eject success
		if (newModels.length !== this._models.length) {
			this._models = newModels;
			this.reload();
		}
	}

	replaceModel(namespace: string, model: ArcherModel): void {
		const newModels = this._models.filter((m) => m.namespace !== namespace);

		this._checkModel(newModels, model);
		this._models = [...newModels, model];
		this.reload();
	}

	createStore(): Store {
		return this.reload();
	}

	reload(): Store {
		const initialState = { ...this._initialState };
		const reducers = { ...this._rootReducers };
		const epics = [...this._rootEpics];

		for (const model of this._models) {
			reducers[model.namespace] = createModelReducer(model, this._reducersEnhancer);
			epics.push(...createModelEpic(model, this._epicsEnhancer));
		}

		// 更新
		if (this._cache) {
			const [epic$, store] = this._cache;

			updateReducers(store, reducers);
			updateEpics(store, epic$, epics);

			return store;
		} else {
			const epicMiddleware = createEpicMiddleware();

			const store = createReduxStore({
				reducers,
				initialState,
				middlewares: [epicMiddleware, ...this._middlewares],
				enhancers: this._storeEnhancers,
			});

			const [epic$, rootEpic] = createRootEpic(store, epics, this._onErrors);
			epicMiddleware.run(rootEpic);

			this._cache = [epic$, store];

			return store;
		}
	}

	protected _checkModel(models: ArcherModel[], model: ArcherModel): void {
		if (models.some(({ namespace }) => model.namespace === namespace)) {
			throw new Error(`[archer] namespace should be unique`);
		}
	}
}
