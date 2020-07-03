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
	if (err.code === 'ENOENT') {
		return 404;
	}

	// detect status
	let status = err.status || 500;
	if (status < 200) {
		// invalid status consider as 500, like urllib will return -1 status
		status = 500;
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
