import { globalContainer } from '@artisan-framework/core';
import { ArtisanPeonProvider } from './artisan-peon-provider';
import { PeonProvider } from './peon-protocol';

function init() {
	// peon
	globalContainer.registerClass(PeonProvider, ArtisanPeonProvider);
}

init();
