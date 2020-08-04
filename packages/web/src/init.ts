import { globalContainer, ProviderLifecycle } from '@artisan-framework/core';
import { WebProvider } from './web-protocol';
import { ArtisanWebProvider } from './artisan-web-provider';
import { ArtisanWebSessionProvider, WebSessionProvider } from './session';
import { WebErrorHandler, ArtisanWebErrorHandler } from './error';
import { WebTraceProvider, ArtisanWebTraceProvider } from './trace';
import { WebMultipartProvider, ArtisanCleanMultipartTempDirTask } from './multipart';
import { ArtisanMultipartProvider } from './multipart/artisan-multipart-provider';
import { ScheduleTask } from '@artisan-framework/schedule';

function init() {
	// web
	globalContainer.registerClass(WebProvider, ArtisanWebProvider);
	globalContainer.registerClass(ProviderLifecycle, ArtisanWebProvider);

	// session
	globalContainer.registerClass(WebSessionProvider, ArtisanWebSessionProvider);

	// trace
	globalContainer.registerClass(WebTraceProvider, ArtisanWebTraceProvider);

	// multipart
	globalContainer.registerClass(WebMultipartProvider, ArtisanMultipartProvider);
	globalContainer.registerClass(ScheduleTask, ArtisanCleanMultipartTempDirTask);

	// onError
	globalContainer.registerClass(WebErrorHandler, ArtisanWebErrorHandler);
}

init();
