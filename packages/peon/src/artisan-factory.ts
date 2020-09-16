import {
	ApplicationContext,
	ArtisanApplicationContext,
	ConsoleLoggerProvider,
	Constructor,
	LoggerProvider,
} from '@artisan-framework/core';
import { SHUTDOWN_SIGNALS } from './constants';
import { ApplicationCreateOptions } from './peon-protocol';

export class ArtisanFactoryStatic {
	private _exited = false;
	private _shutdownCleanupRefs: Array<() => void> = [];

	async create(provider: Constructor<any>, options: ApplicationCreateOptions = {}): Promise<void> {
		const { shutdownSignals, ...restOptions } = options;
		const context = new ArtisanApplicationContext(restOptions);
		const container = context.container;

		context.useProvider(provider);

		const logger = options?.logger || new ConsoleLoggerProvider();

		if (!container.isRegistered(LoggerProvider)) {
			container.registerConstant(LoggerProvider, logger);
		}

		try {
			logger.info('[peon] staring application...');
			await context.init();
			logger.info('[peon] application successfully started');
		} catch (err) {
			logger.error(`[peon] application start error, abort the process: ${err}`, { err });
			process.abort();
		}

		if (shutdownSignals !== false) {
			let signals = SHUTDOWN_SIGNALS;

			if (Array.isArray(shutdownSignals) && shutdownSignals.length > 0) {
				signals = shutdownSignals;
			}

			const cleanup = async (signal: string) => {
				this.cleanupShutdownRefs();

				try {
					logger.info(`[peon] received shutdown signal, commencing graceful closing...`, { signal });
					await context.close();
					logger.info('[peon] application successfully closed');
					process.kill(process.pid, signal);
				} catch (err) {
					logger.info(`[peon] application close error, exit it now: ${err}`, { err });
					this._exit(1);
				}
			};

			signals.forEach((signal) => {
				const cb = () => cleanup(signal);
				process.on(signal, cb);
				this._shutdownCleanupRefs.push(() => {
					process.off(signal, cb);
				});
			});
		}
	}

	protected async _initialize(context: ApplicationContext): Promise<void> {
		const logger = context.container.resolve<LoggerProvider>(LoggerProvider);

		// https://github.com/node-modules/graceful
		let throwCount = 0;

		process.on('uncaughtException', (err: any) => {
			throwCount++;

			logger.error(`[peon] received uncaughtException${throwCount > 1 ? ', exit it now' : ''}: ${err}`, {
				err,
				throw_count: throwCount,
			});

			this._exit(1);
		});

		process.on('unhandledRejection', (err: any) => {
			logger.error(`[peon] received unhandledRejection: ${err}`, { err });
		});

		await context.init();
	}

	protected cleanupShutdownRefs() {
		for (const unSubscribe of this._shutdownCleanupRefs) {
			unSubscribe();
		}

		this._shutdownCleanupRefs = [];
	}

	protected _exit(code: number): void {
		if (this._exited) {
			return;
		} else {
			this._exited = true;
		}

		this.cleanupShutdownRefs();

		process.exit(code);
	}
}

export const ArtisanFactory = new ArtisanFactoryStatic();
