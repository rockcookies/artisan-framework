import {
	autowired,
	DependencyContainer,
	LoggerProvider,
	ServiceProvider,
	value,
	sleep,
	InjectionToken,
	formatInjectionToken,
} from '@artisan-framework/core';
import { PeonProviderConfig, PEON_PROVIDER_CONFIG_KEY, PeonProvider } from './peon-protocol';

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop(): void {}

export class ArtisanPeonProvider implements PeonProvider {
	private _started = false;
	private _exited = false;
	private _unSubscribeProcessMessage = noop;
	private _throwUncaughtExceptionCount = 0;
	private _activeProviders: Array<[InjectionToken, ServiceProvider]> = [];

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

		const unsubscribeList = Array.from<[any, number]>([
			['exit', 0],
			['beforeExit', 0],
			['SIGHUP', 128 + 1],
			// SIGINT 代表 ctr+c 退出，标准 exit code 是 130
			// 但使用 npm script 启动服务时，如果 exit code 不是 0，会报错
			['SIGINT', 0],
			// ['SIGINT', 128 + 2],
			['SIGTERM', 128 + 15],
			['SIGBREAK', 128 + 21],
		]).map(([signal, code]): (() => void) => {
			const listener = () => this._exit(code, `signal ${signal}`);

			process.on(signal, listener);

			return () => {
				process.off(signal, listener);
			};
		});

		this._unSubscribeProcessMessage = () => {
			for (const unsubscribe of unsubscribeList) {
				unsubscribe();
			}

			this._unSubscribeProcessMessage = noop;
		};

		process.on('uncaughtException', (err) => {
			this._uncaughtExceptionHandler(err);
		});

		process.on('unhandledRejection', (err) => {
			this._unhandledRejectionHandler(err);
		});

		const startTime = Date.now();
		const startTimeout = this._config?.startTimeout || 10 * 1000;

		this._logger.info('[peon] application staring...', { start_timeout: startTimeout });

		// 启动模块
		Promise.race([this._setupProviders(tokens).then(() => true), sleep(startTimeout).then(() => false)]).then(
			(success) => {
				if (success) {
					this._logger.info(`[peon] application started in ${Date.now() - startTime}ms`);
				} else {
					this._logger.error('[peon] application start timeout');
					this._exit(1, 'application start timeout');
				}
			},
		);
	}

	protected async _setupProviders(tokens: InjectionToken[]): Promise<void> {
		const providers = [...new Set(tokens)]
			.map((token): [InjectionToken, ServiceProvider] => [token, this._container.resolve<ServiceProvider>(token)])
			.sort(([, a], [, b]) => a.order() - b.order());

		for (const _provider of providers) {
			if (this._exited) {
				return;
			}

			const startTime = Date.now();
			const [_token, provider] = _provider;
			const token = `provider(${formatInjectionToken(_token)})`;

			this._logger.debug(`[peon] ${token} staring...`);

			try {
				await provider.start();
				this._logger.debug(`[peon] ${token} started in ${Date.now() - startTime}ms`);
				this._activeProviders.push(_provider);
			} catch (err) {
				this._logger.error(`[peon] ${token} start error`, { err });
				this._exit(1, `${token} start error`);
			}
		}
	}

	protected async _stopProviders(): Promise<void> {
		for (let i = this._activeProviders.length - 1; i >= 0; i--) {
			const stopTime = Date.now();
			const [_token, provider] = this._activeProviders[i];
			const token = `provider(${formatInjectionToken(_token)})`;

			this._logger.debug(`[peon] ${token} closing...`);

			try {
				await provider.stop();
				this._logger.debug(`[peon] ${token} closed in ${Date.now() - stopTime}ms`);
			} catch (err) {
				this._logger.error(`[peon] ${token} close error`, { err });
			}
		}
	}

	protected _uncaughtExceptionHandler(err: any): void {
		this._throwUncaughtExceptionCount++;

		this._logger.error('[peon] received uncaughtException', {
			err,
			throw_count: this._throwUncaughtExceptionCount,
		});

		if (this._throwUncaughtExceptionCount > 1) {
			return;
		}

		this._exit(1, 'uncaughtException');
	}

	protected _unhandledRejectionHandler(err: any): void {
		this._logger.error('[peon] received unhandledRejection', { err });
	}

	protected _exit(code: number, reason: string) {
		if (this._exited) {
			return;
		} else {
			this._unSubscribeProcessMessage();
			this._exited = true;
		}

		const stopTime = Date.now();
		const stopTimeout = this._config?.stopTimeout || 10 * 1000;
		this._logger.info(`[peon] exit with ${code}, commencing graceful shutdown: ${reason}`, {
			stop_timeout: stopTimeout,
		});

		Promise.race([this._stopProviders().then(() => true), sleep(stopTimeout).then(() => false)]).then((success) => {
			if (success) {
				this._logger.info(`[peon] application exited in ${Date.now() - stopTime}ms`);
			} else {
				this._logger.error('[peon] application exit timeout');
			}

			process.exit(code);
		});
	}
}
