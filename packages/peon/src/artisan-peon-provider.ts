import {
	autowired,
	DependencyContainer,
	InjectionToken,
	LoggerProvider,
	ProviderLifecycle,
	sleep,
	value,
} from '@artisan-framework/core';
import { PeonProvider, PeonProviderConfig, PEON_PROVIDER_CONFIG_KEY } from './peon-protocol';

export class ArtisanPeonProvider implements PeonProvider {
	private _started = false;
	private _exited = false;
	private _unSubscribeProcessListeners: Array<() => void> = [];
	private _throwUncaughtExceptionCount = 0;
	private _activeProviders: Array<[string, ProviderLifecycle]> = [];

	@autowired(LoggerProvider)
	_logger: LoggerProvider;

	@value(PEON_PROVIDER_CONFIG_KEY)
	_config?: PeonProviderConfig;

	@autowired(DependencyContainer)
	_container: DependencyContainer;

	setup(tokens: InjectionToken[]): void {
		if (this._started) {
			return;
		} else {
			this._started = true;
		}

		for (const [signal, code] of Array.from<[string, number]>([
			['exit', 0],
			['beforeExit', 0],
			['SIGHUP', 128 + 1],
			// SIGINT 代表 ctr+c 退出，标准 exit code 是 130
			// 但使用 npm script 启动服务时，如果 exit code 不是 0，会报错
			['SIGINT', 0],
			// ['SIGINT', 128 + 2],
			['SIGTERM', 128 + 15],
			['SIGBREAK', 128 + 21],
		])) {
			const listener = () => {
				this._logger.info(`[peon] received shutdown signal '${signal}', exit it now`);
				this._exit(code);
			};

			process.on(signal as any, listener);
			this._unSubscribeProcessListeners.push(() => process.off(signal, listener));
		}

		process.on('uncaughtException', (err) => {
			this._uncaughtExceptionHandler(err);
		});

		process.on('unhandledRejection', (err) => {
			this._unhandledRejectionHandler(err);
		});

		const startTime = Date.now();
		const startTimeout = this._config?.startTimeout || 10 * 1000;

		this._logger.info('[peon] application staring...', {
			process_env: process.env.NODE_ENV,
			start_timeout: startTimeout,
		});

		// 启动模块
		Promise.race([this._setupProviders(tokens).then(() => true), sleep(startTimeout).then(() => false)]).then(
			(success) => {
				if (success) {
					this._logger.info('[peon] application started', {
						process_env: process.env.NODE_ENV,
						elapsed_time: Date.now() - startTime,
					});
				} else {
					this._logger.error('[peon] application start timeout', {
						start_timeout: startTimeout,
						elapsed_time: Date.now() - startTime,
					});

					this._exit(1);
				}
			},
		);
	}

	protected async _setupProviders(tokens: InjectionToken[]): Promise<void> {
		let providers: Array<[string, ProviderLifecycle]> = [];

		for (const token of [...new Set(tokens)]) {
			for (const provider of this._container.resolveAll<ProviderLifecycle>(token)) {
				providers.push([
					typeof (provider as any).name === 'function'
						? `provider<${(provider as any).name()}>`
						: 'provider<undefined>',
					provider,
				]);
			}
		}

		providers = providers.sort(([, a], [, b]) => {
			const oA = typeof a.order === 'function' ? a.order() : 0;
			const oB = typeof b.order === 'function' ? b.order() : 0;
			return oA - oB;
		});

		for (const _provider of providers) {
			if (this._exited) {
				return;
			}

			const [providerName, provider] = _provider;

			this._logger.debug(`[peon] staring ${providerName}...`);

			if (typeof provider.start !== 'function') {
				this._logger.info(`[peon] ${providerName} start !== 'function', skip it`);
				continue;
			}

			const startTime = Date.now();

			try {
				await provider.start();
				this._logger.info(`[peon] ${providerName} started`, { elapsed_time: Date.now() - startTime });
				this._activeProviders.push(_provider);
			} catch (err) {
				this._logger.error(`[peon] start ${providerName} error: ${err}`, {
					elapsed_time: Date.now() - startTime,
					err,
				});

				this._exit(1);
			}
		}
	}

	protected async _stopProviders(): Promise<void> {
		for (let i = this._activeProviders.length - 1; i >= 0; i--) {
			const [providerName, provider] = this._activeProviders[i];

			this._logger.debug(`[peon] stopping ${providerName}...`);

			if (typeof provider.stop !== 'function') {
				this._logger.info(`[peon] ${providerName} stop !== 'function', skip it`);
				continue;
			}

			const startTime = Date.now();

			try {
				await provider.stop();
				this._logger.debug(`[peon] ${providerName} stopped`, { elapsed_time: Date.now() - startTime });
			} catch (err) {
				this._logger.error(`[peon] ${providerName} stop error: ${err}`, {
					elapsed_time: Date.now() - startTime,
					err,
				});
			}
		}
	}

	protected _uncaughtExceptionHandler(err: any): void {
		// https://github.com/node-modules/graceful
		this._throwUncaughtExceptionCount++;

		if (this._throwUncaughtExceptionCount > 1) {
			this._logger.error(`[peon] received uncaughtException: ${err}`, {
				err,
				throw_count: this._throwUncaughtExceptionCount,
			});
		} else {
			this._logger.error(`[peon] received uncaughtException, exit it now: ${err}`, { err });
		}

		this._exit(1);
	}

	protected _unhandledRejectionHandler(err: any): void {
		this._logger.error(`[peon] received unhandledRejection: ${err}`, { err });
	}

	protected _exit(code: number) {
		for (const unSubscribe of this._unSubscribeProcessListeners) {
			unSubscribe();
		}

		this._unSubscribeProcessListeners = [];

		if (this._exited) {
			return;
		} else {
			this._exited = true;
		}

		const startTime = Date.now();
		const stopTimeout = this._config?.stopTimeout || 10 * 1000;

		this._logger.info(`[peon] commencing application graceful shutdown with exit code: ${code}`, {
			stop_timeout: stopTimeout,
		});

		Promise.race([this._stopProviders().then(() => true), sleep(stopTimeout).then(() => false)]).then((success) => {
			if (success) {
				this._logger.info('[peon] application exited', { elapsed_time: Date.now() - startTime });
			} else {
				this._logger.error('[peon] application exit timeout', {
					stop_timeout: stopTimeout,
					elapsed_time: Date.now() - startTime,
				});
			}

			process.exit(code);
		});
	}
}
