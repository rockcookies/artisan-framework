import { AbstractConfigProvider, ConfigProvider, globalContainer } from '@artisan-framework/core';
import { ArtisanEncryptionProvider, EncryptionProviderConfig, EncryptionProvider } from '../src';

export function getEncryptionProvider(config: EncryptionProviderConfig): ArtisanEncryptionProvider {
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

	return container.resolve<ArtisanEncryptionProvider>(EncryptionProvider);
}
