export type Dictionary<T = any> = { [key: string]: T };

export type NullablePartial<T> = {
	[U in keyof T]?: T[U] | null;
};

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

export type Constructable<T = unknown> = new (...args: any[]) => T;

export type AbstractConstructable<T = unknown> = NewableFunction & { prototype: T };

// eslint-disable-next-line @typescript-eslint/ban-types
export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

export type SetOptional<BaseType, Keys extends keyof BaseType> = Simplify<
	// Pick just the keys that are readonly from the base type.
	Omit<BaseType, Keys> &
		// Pick the keys that should be mutable from the base type and make them mutable.
		Partial<Pick<BaseType, Keys>>
>;
