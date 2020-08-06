import { Store } from 'redux';
import { combineEpics, Epic, ofType } from 'redux-observable';
import { BehaviorSubject, empty, Subject, Observable } from 'rxjs';
import { catchError, mergeMap, takeUntil } from 'rxjs/operators';
import { ArcherEpics, ArcherErrorHandler, ArcherModel, ArcherErrorContext } from './archer-protocol';

export function createModelEpic(model: ArcherModel, enhancer: (epics: ArcherEpics) => ArcherEpics): Epic[] {
	return enhancer(model.epics || []);
}

export function createRootEpic(store: Store, epics: Epic[], _onErrors: ArcherErrorHandler[]): [Subject<Epic>, Epic] {
	const epic$ = new BehaviorSubject(combineEpics<Epic>(...epics));

	const onErrors: ArcherErrorHandler[] = [
		...[..._onErrors].sort((a: any, b: any) => {
			const oA = typeof a.order === 'function' ? a.order() : 0;
			const oB = typeof b.order === 'function' ? b.order() : 0;
			return oA - oB;
		}),
		// default error handler
		{
			canHandle() {
				return true;
			},
			handle(err) {
				console.error(err);
			},
		},
	];

	// Since we're using mergeMap, by default any new
	// epic that comes in will be merged into the previous
	// one, unless an @@ARCHER_EPIC_UPDATE@@ action is dispatched first,
	// which would cause the old one(s) to be unsubscribed

	return [
		epic$,
		(action$, ...rest): Observable<any> => {
			return epic$.pipe(
				mergeMap((epic) => {
					return epic(action$, ...rest).pipe(
						catchError((err, caught$) => {
							const ctx: ArcherErrorContext = {
								store,
								caught$,
							};

							for (const onError of onErrors) {
								if (onError.canHandle(err, ctx)) {
									onError.handle(err, ctx);
									break;
								}
							}

							return empty();
						}),
						takeUntil(action$.pipe(ofType('@@ARCHER_EPIC_UPDATE@@'))),
					);
				}),
			);
		},
	];
}

export function updateEpics(store: Store, subject: Subject<Epic>, nextEpics: Epic[]): void {
	// First kill any running epics
	store.dispatch({
		type: '@@ARCHER_EPIC_UPDATE@@',
	});

	// Now setup the new one
	subject.next(combineEpics<Epic>(...nextEpics));
}
