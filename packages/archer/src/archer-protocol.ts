import { Dictionary } from '@artisan-framework/core';
import { Middleware, ReducersMapObject, StoreEnhancer, AnyAction, Store } from 'redux';
import { Epic } from 'redux-observable';
import { Observable } from 'rxjs';

export interface ArcherOptions {
	initialState?: Dictionary;
	rootReducers?: ReducersMapObject;
	rootEpics?: Epic[];
	models?: ArcherModel[];
	modelReducerMapEnhancers?: Array<(reducers: ArcherReducers) => ArcherReducers>;
	modelEpicMapEnhancers?: Array<(epics: ArcherEpics) => ArcherEpics>;
	storeEnhancers?: Array<StoreEnhancer<any>>;
	middlewares?: Middleware[];
	onErrors?: ArcherErrorHandler[];
}

export interface ArcherAction<Payload> {
	type: string;
	payload: Payload;
	error?: boolean;
}

export interface ArcherErrorContext {
	caught$: Observable<any>;
	store: Store;
}

export interface ArcherErrorHandler {
	canHandle(err: any, ctx: ArcherErrorContext): boolean;
	handle(err: any, ctx: ArcherErrorContext): void;
}

export type ArcherReducers<State = any> = Dictionary<(state: State, action: AnyAction) => State>;

export type ArcherEpics<GlobalState = any> = Array<Epic<AnyAction, AnyAction, GlobalState>>;

export interface ArcherModel<ModelState = any, GlobalState = any> {
	namespace: string;
	state?: ModelState;
	epics?: ArcherEpics<GlobalState>;
	reducers?: ArcherReducers<ModelState>;
}
