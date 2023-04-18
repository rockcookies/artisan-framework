/* eslint-disable @typescript-eslint/no-empty-function */
import { LoggerProvider } from './logger-protocol';

export class NoopLoggerProvider implements LoggerProvider {
	error() {}
	warn() {}
	info() {}
	debug() {}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	tag(_: string) {
		return this;
	}
	with() {
		return this;
	}
}
