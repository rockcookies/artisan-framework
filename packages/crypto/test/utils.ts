import {
	AbstractConfigHolder,
	ArtisanApplicationContext,
	ConfigHolder,
	NoopLoggerProvider,
} from '@artisan-framework/core';
import { ArtisanEncryptionProvider, EncryptionProvider, EncryptionProviderConfig } from '../src';

export async function getEncryptionProvider(config: EncryptionProviderConfig): Promise<ArtisanEncryptionProvider> {
	const context = new ArtisanApplicationContext({ logger: new NoopLoggerProvider() });

	context.container.registerClass(
		ConfigHolder,
		class Ch extends AbstractConfigHolder {
			config() {
				return {
					artisan: {
						encryption: config,
					},
				};
			}
		},
	);

	context.useProvider(ArtisanEncryptionProvider);

	await context.init();

	return context.container.resolve<ArtisanEncryptionProvider>(EncryptionProvider);
}
