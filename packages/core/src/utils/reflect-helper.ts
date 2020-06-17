import 'reflect-metadata';

const functionPrototype = Object.getPrototypeOf(Function);

// get property of an object
// https://tc39.github.io/ecma262/#sec-ordinarygetprototypeof
function ordinaryGetPrototypeOf(O: any): any {
	const proto = Object.getPrototypeOf(O);
	if (typeof O !== 'function' || O === functionPrototype) {
		return proto;
	}

	// TypeScript doesn't set __proto__ in ES5, as it's non-standard.
	// Try to determine the superclass constructor. Compatible implementations
	// must either set __proto__ on a subclass constructor to the superclass constructor,
	// or ensure each class has a valid `constructor` property on its prototype that
	// points back to the constructor.

	// If this is not the same as Function.[[Prototype]], then this is definately inherited.
	// This is the case when in ES6 or when using __proto__ in a compatible browser.
	if (proto !== functionPrototype) {
		return proto;
	}

	// If the super prototype is Object.prototype, null, or undefined, then we cannot determine the heritage.
	const prototype = O.prototype;
	const prototypeProto = prototype && Object.getPrototypeOf(prototype);
	if (prototypeProto == null || prototypeProto === Object.prototype) {
		return proto;
	}

	// If the constructor was not a function, then we cannot determine the heritage.
	const constructor = prototypeProto.constructor;
	if (typeof constructor !== 'function') {
		return proto;
	}

	// If we have some kind of self-reference, then we cannot determine the heritage.
	if (constructor === O) {
		return proto;
	}

	// we have a pretty good guess at the heritage.
	return constructor;
}

function getOwnMetadata(metadataKey: any, target: any, propertyKey?: string | symbol): any {
	if (propertyKey) {
		return Reflect.getOwnMetadata(metadataKey, target, propertyKey);
	} else {
		return Reflect.getOwnMetadata(metadataKey, target);
	}
}

function initOrGetMetadataProps(metadataKey: any, target: any): any {
	const result = Reflect.hasOwnMetadata(metadataKey, target);

	if (!result) {
		Reflect.defineMetadata(metadataKey, {}, target);
	}

	return Reflect.getMetadata(metadataKey, target);
}

/**
 * 以数组形式返回对象所有 property, 数组第一个元素是距离 o 最近的原型
 * @param target 对象，class 或者 function
 */
export function recursiveGetPrototypeOf(target: any): any[] {
	const properties = [];
	let parent = ordinaryGetPrototypeOf(target);
	while (parent !== null) {
		properties.push(parent);
		parent = ordinaryGetPrototypeOf(parent);
	}
	return properties;
}

/**
 * get metadata value of a metadata key on the prototype chain of an object and property
 * @param metadataKey metadata's key
 * @param target the target of metadataKey
 */
export function recursiveGetMetadata<T = any>(metadataKey: any, target: any, propertyKey?: string | symbol): T[] {
	const metadatas: T[] = [];

	// get metadata value of a metadata key on the prototype
	let metadata = getOwnMetadata(metadataKey, target, propertyKey);
	if (metadata) {
		metadatas.push(metadata);
	}

	// get metadata value of a metadata key on the prototype chain
	let parent = ordinaryGetPrototypeOf(target);
	while (parent !== null) {
		metadata = getOwnMetadata(metadataKey, parent, propertyKey);
		if (metadata) {
			metadatas.push(metadata);
		}
		parent = ordinaryGetPrototypeOf(parent);
	}
	return metadatas;
}

export function reduceMetadataProps<T>(metadataKey: any, target: any, reducer: (data: T) => T): any {
	const data = initOrGetMetadataProps(metadataKey, target);

	Reflect.defineMetadata(metadataKey, reducer(data), target);

	return target;
}

export function attachMetadataProps<T>(metadataKey: any, target: any, options: T): any {
	return reduceMetadataProps(metadataKey, target, (data) => ({
		...(data as any),
		...options,
	}));
}
