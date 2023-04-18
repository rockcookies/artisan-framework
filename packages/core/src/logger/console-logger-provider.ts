import { Dictionary } from '../interfaces';
import { LoggerProvider } from './logger-protocol';

export class ConsoleLoggerProvider implements LoggerProvider {
	constructor(private _tag?: string, private _meta?: Dictionary) {}

	error(message: string, meta?: Dictionary) {
		console.error(`[${this._tag}] ${message}`, ...this._merge(meta));
	}

	warn(message: string, meta?: Dictionary) {
		console.warn(`[${this._tag}] ${message}`, ...this._merge(meta));
	}

	info(message: string, meta?: Dictionary) {
		console.info(`[${this._tag}] ${message}`, ...this._merge(meta));
	}

	debug(message: string, meta?: Dictionary) {
		console.debug(`[${this._tag}] ${message}`, ...this._merge(meta));
	}

	protected _merge(meta?: Dictionary): Dictionary[] {
		if (this._meta || meta) {
			return [{ ...this._meta, ...meta }];
		}

		return [];
	}

	tag(tag: string): LoggerProvider {
		return new ConsoleLoggerProvider(this._tag ? `${this._tag}.${tag}` : tag, this._meta || {});
	}

	with(meta: Dictionary): LoggerProvider {
		return new ConsoleLoggerProvider(this._tag, { ...this._meta, ...meta });
	}
}
