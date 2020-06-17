import { CustomError } from 'ts-custom-error';
import { ArtisanErrorType } from '../constants';

const TYPE: symbol = Symbol.for('ArtisanError#type');

interface ErrorOptions {
	code?: string;
	message: string;
	[key: string]: any;
}

export class ArtisanThrowable<T extends ErrorOptions> extends CustomError {
	[key: string]: any;

	public code: string;
	protected options?: T;

	constructor(options?: T) {
		super(options?.message || '');
		this.options = options || ({} as T);
		this.code = this.options.code || '';
	}

	public static getType(err: Error): ArtisanErrorType {
		return (err as any)[TYPE] || ArtisanErrorType.BUILTIN;
	}

	public static from<
		S extends new (...args: any) => InstanceType<typeof ArtisanThrowable>,
		P extends ConstructorParameters<S>
	>(this: S, err: Error, ...args: P | undefined[]): InstanceType<S> {
		const ErrorClass = this as any;
		const newErr = new ErrorClass(...(args as any[]));
		newErr.message = err.message;
		newErr.stack = err.stack;
		for (const key of Object.keys(err)) {
			newErr[key] = (err as any)[key];
		}
		return newErr as InstanceType<S>;
	}
}

export class ArtisanError<T extends ErrorOptions = ErrorOptions> extends ArtisanThrowable<T> {
	constructor(options?: T) {
		super(options);

		(this as any)[TYPE] = ArtisanErrorType.ERROR;
	}
}

export class ArtisanException<T extends ErrorOptions = ErrorOptions> extends ArtisanThrowable<T> {
	constructor(options?: T) {
		super(options);

		(this as any)[TYPE] = ArtisanErrorType.EXCEPTION;
	}
}
