import { ConfigHolder } from './container-protocol';

export abstract class AbstractConfigHolder implements ConfigHolder {
	get<T>(key: string, defaultValue?: T): T {
		let config = this.config();

		for (const step of key.replace(/\[/g, '.').replace(/]/g, '').split('.').filter(Boolean)) {
			config = config[step];

			if (config === undefined) {
				return defaultValue as any;
			}
		}

		return config;
	}

	protected abstract config(): any;
}
