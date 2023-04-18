import { WebContext } from './web-protocol';
import { Writable as WritableStream, Readable as ReadableStream, pipeline as _pipeline } from 'node:stream';
import util = require('util');

const pipeline = util.promisify(_pipeline);

export async function sendToWormhole(stream: ReadableStream): Promise<void> {
	if (!stream) {
		return;
	}

	try {
		await pipeline(
			stream,
			new WritableStream({
				write(chunk, encoding, callback) {
					setImmediate(callback);
				},
			}),
		);
	} catch (e) {}
}

export function isProd(): boolean {
	const env = process.env.NODE_ENV;
	return env != 'development' && env != 'test';
}

export function detectErrorStatus(err: any): number {
	const status = err.status;

	// invalid status consider as 500, like urllib will return -1 status
	if (status == null || status < 200) {
		if (err.code === 'ENOENT') {
			return 404;
		}

		return 500;
	}

	return status;
}

export function detectErrorMessage(ctx: WebContext, err: any): string {
	// detect json parse error
	if (
		err.status === 400 &&
		err.name === 'SyntaxError' &&
		ctx.request.is('application/json', 'application/vnd.api+json', 'application/csp-report')
	) {
		return 'Problems parsing JSON';
	}

	return err.message;
}
