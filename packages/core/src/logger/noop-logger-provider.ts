/* eslint-disable @typescript-eslint/no-empty-function */
import { LoggerProvider } from './logger-protocol';

export class NoopLoggerProvider implements LoggerProvider {
	error() {}
	warn() {}
	info() {}
	debug() {}
	with() {
		return this;
	}
}
