import { ArtisanErrorOptions, ArtisanException } from '@artisan-framework/core';
import { Dispatcher } from 'undici';
import { HttpFetchRequest } from './http-client-protocol';

export class HttpFetchException extends ArtisanException {
	request: HttpFetchRequest;
	response: Dispatcher.ResponseData;
	data: any;

	constructor(
		message: string,
		options: {
			request: HttpFetchRequest;
			response: Dispatcher.ResponseData;
			data: any;
		} & ArtisanErrorOptions,
	) {
		super(message, options);
		this.request = options.request;
		this.response = options.response;
		this.data = options.data;
	}
}
