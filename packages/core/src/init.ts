import { globalContainer } from './container';
import { LoggerProvider, NoopLoggerProvider } from './logger';

function init() {
	globalContainer.registerClass(LoggerProvider, NoopLoggerProvider);
}

init();
