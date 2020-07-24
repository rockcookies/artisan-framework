import { AbstractConfigProvider, ConfigProvider, globalContainer } from '@artisan-framework/core';
import { EncryptionAlgorithm, EncryptionProviderConfig } from '@artisan-framework/crypto';
import { ArtisanWebProvider, WebProvider, WebProviderConfig } from '../src';

const algFoo: EncryptionAlgorithm = { key: 'b934174808e19adf0c98d5acca1b8e9f', iv: 'c64283fecba3b901' };
const algBar: EncryptionAlgorithm = { key: '7e159a579c2887c61df1339c8fe80c93', iv: 'f4d0d64b3208ff79' };

export function getWebProvider(config?: Partial<WebProviderConfig & EncryptionProviderConfig>): ArtisanWebProvider {
	const container = globalContainer.clone();

	const { algorithms = [algFoo, algBar], ...rest } = config || {};

	container.registerClass(
		ConfigProvider,
		class CP extends AbstractConfigProvider {
			config() {
				return {
					artisan: {
						web: rest,
						encryption: {
							algorithms: algorithms,
						},
					},
				};
			}
		},
	);

	return container.resolve<ArtisanWebProvider>(WebProvider);
}
