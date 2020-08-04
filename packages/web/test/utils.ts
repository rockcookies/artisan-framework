import { AbstractConfigProvider, ConfigProvider, globalContainer } from '@artisan-framework/core';
import {
	EncryptionAlgorithm,
	EncryptionProviderConfig,
	EncryptionProvider,
	ArtisanEncryptionProvider,
} from '@artisan-framework/crypto';
import { ArtisanWebProvider, WebProvider, WebProviderConfig, WebInitializationProvider } from '../src';

const algFoo: EncryptionAlgorithm = { key: 'b934174808e19adf0c98d5acca1b8e9f', iv: 'c64283fecba3b901' };
const algBar: EncryptionAlgorithm = { key: '7e159a579c2887c61df1339c8fe80c93', iv: 'f4d0d64b3208ff79' };

export async function getWebProvider(
	config: WebProviderConfig & { algorithms?: EncryptionAlgorithm[] | false },
	initializer?: (webProvider: WebProvider) => Promise<void>,
): Promise<ArtisanWebProvider> {
	const container = globalContainer.clone();

	const { algorithms, ...webConfig } = config || {};

	const encryptionConfig: EncryptionProviderConfig | undefined =
		algorithms === false ? undefined : { algorithms: algorithms || [algFoo, algBar] };

	container.registerClass(
		ConfigProvider,
		class CP extends AbstractConfigProvider {
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

	container.registerClass(
		WebInitializationProvider,
		class WIP implements WebInitializationProvider {
			async initWebProvider(webProvider: WebProvider): Promise<void> {
				if (initializer != null) {
					await initializer(webProvider);
				}
			}
		},
	);

	const encryption = container.resolve<ArtisanEncryptionProvider>(EncryptionProvider);

	await encryption.start();

	const provider = container.resolve<ArtisanWebProvider>(WebProvider);
	await provider.setup();
	return provider;
}
