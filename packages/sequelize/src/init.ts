import { globalContainer, ServiceProvider } from '@artisan-framework/core';
import { ArtisanSequelizeProvider } from './artisan-sequelize-provider';
import { SequelizeProvider } from './sequelize-protocol';

function init() {
	// sequelize
	globalContainer.registerClass(SequelizeProvider, ArtisanSequelizeProvider);
	globalContainer.registerClass(ServiceProvider, ArtisanSequelizeProvider);
}

init();
