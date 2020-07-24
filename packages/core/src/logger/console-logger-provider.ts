/* eslint-disable @typescript-eslint/no-empty-function */
import { LoggerProvider } from './logger-protocol';
import { Dictionary } from '../interfaces';

export class ConsoleLoggerProvider implements LoggerProvider {
	constructor(private _meta?: Dictionary) {}

	error(message: string, meta?: Dictionary) {
		console.error(message, ...this._merge(meta));
	}

	warn(message: string, meta?: Dictionary) {
		console.warn(message, ...this._merge(meta));
	}

	info(message: string, meta?: Dictionary) {
		console.info(message, ...this._merge(meta));
	}

	debug(message: string, meta?: Dictionary) {
		console.debug(message, ...this._merge(meta));
	}

	protected _merge(meta?: Dictionary): Dictionary[] {
		if (this._meta || meta) {
			return [{ ...this._meta, ...meta }];
		}

		return [];
	}

	with(meta: Dictionary): LoggerProvider {
		return new ConsoleLoggerProvider({ ...this._meta, ...meta });
	}
}
