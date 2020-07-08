import { globalContainer, ConfigProvider, AbstractConfigProvider } from '@artisan-framework/core';
import { WebProviderConfig, WebProvider } from '../src';
import { EncryptionProviderConfig, EncryptionAlgorithm } from '@artisan-framework/crypto';

const algFoo: EncryptionAlgorithm = { key: 'b934174808e19adf0c98d5acca1b8e9f', iv: 'c64283fecba3b901' };
const algBar: EncryptionAlgorithm = { key: '7e159a579c2887c61df1339c8fe80c93', iv: 'f4d0d64b3208ff79' };

export function getWebProvider(config?: Partial<WebProviderConfig & EncryptionProviderConfig>): WebProvider {
	globalContainer.clear();

	const { algorithms = [algFoo, algBar], ...rest } = config || {};

	globalContainer.registerClass(
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

	return globalContainer.resolve<WebProvider>(WebProvider);
}
