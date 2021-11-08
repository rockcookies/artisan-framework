import { CustomError } from 'ts-custom-error';

const TYPE: symbol = Symbol.for('ArtisanError#type');

enum ErrorType {
	BUILTIN = 'BUILTIN',
	ERROR = 'ERROR',
	EXCEPTION = 'EXCEPTION',
}

export interface ErrorOptions {
	code?: string;
	message: string;
	[key: string]: any;
}

export class ArtisanThrowable<T extends ErrorOptions> extends CustomError {
	[key: string]: any;

	public static getType(err: Error): string {
		return (err as any)[TYPE] || ErrorType.BUILTIN;
	}

	public static from<
		S extends new (...args: any) => InstanceType<typeof ArtisanThrowable>,
		P extends ConstructorParameters<S>,
	>(this: S, err: Error, ...args: P | undefined[]): InstanceType<S> {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const ErrorClass = this;
		const newErr = new ErrorClass(...(args as any[]));
		newErr.message = err.message;
		newErr.stack = err.stack;
		for (const key of Object.keys(err)) {
			newErr[key] = (err as any)[key];
		}
		return newErr as InstanceType<S>;
	}

	public code: string;
	protected options?: T;

	constructor(options?: T) {
		super(options?.message || '');
		this.options = options || ({} as T);
		this.code = this.options.code || '';
	}
}

export class ArtisanBaseException<T extends ErrorOptions> extends ArtisanThrowable<T> {
	constructor(options?: T) {
		super(options);

		(this as any)[TYPE] = ErrorType.EXCEPTION;
	}
}

/** ArtisanException is system error. */
export class ArtisanException extends ArtisanBaseException<ErrorOptions> {
	constructor(message?: string) {
		super({
			code: 'ARTISAN_EXCEPTION',
			message: message || '',
		});
	}
}

export class ArtisanBaseError<T extends ErrorOptions> extends ArtisanThrowable<T> {
	constructor(options?: T) {
		super(options);

		(this as any)[TYPE] = ErrorType.ERROR;
	}
}

/** ArtisanError is business error. */
export class ArtisanError extends ArtisanBaseError<ErrorOptions> {
	constructor(message?: string) {
		super({
			code: 'ARTISAN_ERROR',
			message: message || '',
		});
	}
}
