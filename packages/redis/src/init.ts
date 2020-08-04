import { globalContainer, ProviderLifecycle } from '@artisan-framework/core';
import { ArtisanRedisProvider } from './artisan-redis-provider';
import { RedisProvider } from './redis-protocol';

function init() {
	// sequelize
	globalContainer.registerClass(RedisProvider, ArtisanRedisProvider);
	globalContainer.registerClass(ProviderLifecycle, ArtisanRedisProvider);
}

init();
