import { globalContainer, ProviderLifecycle } from '@artisan-framework/core';
import { HttpClientProvider } from './http-client-protocol';
import { ArtisanHttpClientProvider } from './artisan-http-client-provider';

function init() {
	globalContainer.registerClass(HttpClientProvider, ArtisanHttpClientProvider);
	globalContainer.registerClass(ProviderLifecycle, ArtisanHttpClientProvider);
}

init();
