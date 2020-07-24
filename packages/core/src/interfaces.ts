export type Dictionary<T = any> = { [key: string]: T };

export type NullablePartial<T> = {
	[U in keyof T]?: T[U] | null;
};

export type Constructor<T> = new (...args: any[]) => T;

// https://medium.com/@dhruvrajvanshi/making-exceptions-type-safe-in-typescript-c4d200ee78e9
export interface OkRes<R> {
	isError: false;
	value: R;
}

export interface ErrRes<E> {
	isError: true;
	error: E;
}

export type Res<R, E> = OkRes<R> | ErrRes<E>;
