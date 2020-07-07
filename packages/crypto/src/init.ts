import { globalContainer } from '@artisan-framework/core';
import { ArtisanEncryptionProvider } from './artisan-encryption-provider';
import { EncryptionProvider } from './crypto-protocol';

function init() {
	globalContainer.registerClass(EncryptionProvider, ArtisanEncryptionProvider);
}

init();
