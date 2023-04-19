import {
	AbstractConfigHolder,
	ApplicationContext,
	ArtisanApplicationContext,
	ConfigHolder,
	NoopLoggerProvider,
} from '@artisan-framework/core';
import { EncryptionAlgorithm, EncryptionProviderConfig } from '@artisan-framework/crypto';
import { ArtisanWebProvider, WebInitializationProvider, WebProvider, WebProviderConfig } from '../src';

const algFoo: EncryptionAlgorithm = { key: 'b934174808e19adf0c98d5acca1b8e9f' };
const algBar: EncryptionAlgorithm = { key: '7e159a579c2887c61df1339c8fe80c93' };

interface Options extends WebProviderConfig {
	algorithms?: EncryptionAlgorithm[] | false;
}

export function createWebProviderFactory(): {
	getWebProvider: (o: Options, initializer?: (w: WebProvider) => Promise<void>) => Promise<ArtisanWebProvider>;
	clean: () => Promise<void>;
} {
	const contexts: ApplicationContext[] = [];

	return {
		getWebProvider: async (config, initializer) => {
			const context = new ArtisanApplicationContext({ logger: new NoopLoggerProvider() });

			const { algorithms, ..._webConfig } = config || {};

			const webConfig: WebProviderConfig = {
				..._webConfig,
				server: {
					..._webConfig.server,
					manual: true,
				},
			};

			const encryptionConfig: EncryptionProviderConfig | undefined =
				algorithms === false ? undefined : { algorithms: algorithms || [algFoo, algBar] };

			context.container.registerClass(
				ConfigHolder,
				class CP extends AbstractConfigHolder {
					config() {
						return {
							artisan: {
								web: webConfig,
								encryption: encryptionConfig,
							},
						};
					}
				},
			);

			context.container.registerConstant(WebInitializationProvider, {
				initWebProvider: async (web) => {
					if (initializer) {
						await initializer(web);
					}
				},
			} as WebInitializationProvider);

			context.useProvider(ArtisanWebProvider);

			await context.init();

			contexts.push(context);

			return context.container.resolve(WebProvider);
		},
		clean: async () => {
			await Promise.all(contexts.map((c) => c.close()));
		},
	};
}
