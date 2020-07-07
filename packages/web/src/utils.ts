import { WebContext } from './web-protocol';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import _sendToWormhole = require('stream-wormhole');

export function sendToWormhole(stream: any, throwError?: boolean): Promise<void> {
	return _sendToWormhole(stream, throwError);
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
