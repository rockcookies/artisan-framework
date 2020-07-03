import { globalContainer, ServiceProvider } from '@artisan-framework/core';
import { WebProvider } from './web-protocol';
import { ArtisanWebProvider } from './artisan-web-provider';
import { ArtisanWebSessionProvider, WebSessionProvider } from './session';
import { WebErrorHandler, ArtisanWebErrorHandler } from './error';

function init() {
	// web
	globalContainer.registerClass(WebProvider, ArtisanWebProvider);
	globalContainer.registerClass(ServiceProvider, ArtisanWebProvider);

	// session
	globalContainer.registerClass(WebSessionProvider, ArtisanWebSessionProvider);

	// console.error
	globalContainer.registerClass(WebErrorHandler, ArtisanWebErrorHandler);
}

init();
