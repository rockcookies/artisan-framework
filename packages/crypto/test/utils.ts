import { AbstractConfigProvider, ConfigProvider, globalContainer } from '@artisan-framework/core';
import { ArtisanEncryptionProvider, EncryptionProviderConfig, EncryptionProvider } from '../src';

export async function getEncryptionProvider(config: EncryptionProviderConfig): Promise<ArtisanEncryptionProvider> {
	const container = globalContainer.clone();

	container.registerClass(
		ConfigProvider,
		class CP extends AbstractConfigProvider {
			config() {
				return {
					artisan: {
						encryption: config,
					},
				};
			}
		},
	);

	const provider = container.resolve<ArtisanEncryptionProvider>(EncryptionProvider);

	await provider.start();

	return provider;
}
