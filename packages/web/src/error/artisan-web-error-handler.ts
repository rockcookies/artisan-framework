import http = require('http');
import { WebContext, WEB_PROVIDER_CONFIG_KEY, WebProviderConfig } from '../web-protocol';
import { sendToWormhole, detectErrorStatus, isProd, detectErrorMessage } from '../utils';
import { ArtisanException, value } from '@artisan-framework/core';
import { htmlEscape } from 'escape-goat';
import { WebErrorHandler, DEFAULT_WEB_ERROR_HANDLER_ORDER } from './error-protocol';

const isDev = !isProd();

const HTML_ERROR = isDev
	? `<!DOCTYPE html>
<html>
  <head>
    <title>Error - {{status}}</title>
    <meta name="viewport" content="user-scalable=no, width=device-width, initial-scale=1.0, maximum-scale=1.0">

    <style>
      body {
        padding: 50px 80px;
        font: 14px "Helvetica Neue", Helvetica, sans-serif;
      }

      h1 {
        font-size: 2em;
        margin-bottom: 5px;
      }

      pre {
        font-size: .8em;
      }
    </style>
  </head>
  <body>
    <div id="error">
      <h1>Error</h1>
      <p>Looks like something broke!</p>
      <pre>
        <code>
{{stack}}
        </code>
      </pre>
    </div>
  </body>
</html>`
	: `<!DOCTYPE html>
<html>
  <head>
    <title>Error - {{status}}</title>
    <meta name="viewport" content="user-scalable=no, width=device-width, initial-scale=1.0, maximum-scale=1.0">

    <style>
      body {
        padding: 50px 80px;
        font: 14px "Helvetica Neue", Helvetica, sans-serif;
      }

      h1 {
        font-size: 2em;
        margin-bottom: 5px;
      }

      pre {
        font-size: .8em;
      }
    </style>
  </head>
  <body>
    <div id="error">
      <h1>Error</h1>
      <p>Looks like something broke!</p>
    </div>
  </body>
</html>`;

export class ArtisanWebErrorHandler implements WebErrorHandler {
	@value({ el: WEB_PROVIDER_CONFIG_KEY, default: {} })
	private _config: WebProviderConfig;

	order() {
		return DEFAULT_WEB_ERROR_HANDLER_ORDER;
	}

	canHandle(): boolean {
		return true;
	}

	handle(ctx: WebContext, err: any): void {
		if (err == null) return;

		// ignore all pending request stream
		if (ctx.req) {
			sendToWormhole(ctx.req);
		}

		// wrap non-error object
		if (!(err instanceof Error)) {
			const newError = new ArtisanException('non-error thrown: ' + err);

			// err maybe an object, try to copy the name, message and stack to the new error instance
			if (err) {
				if (err.name) newError.name = err.name;
				if (err.message) newError.message = err.message;
				if (err.stack) newError.stack = err.stack;
				if (err.status) (newError as any).status = err.status;
				if (err.headers) (newError as any).headers = err.headers;
			}

			err = newError;
		}

		const headerSent = ctx.headerSent || !ctx.writable;

		// emit
		ctx.app.emit('error', err, ctx);

		// nothing we can do here other
		// than delegate to the app-level
		// handler and log.
		if (headerSent) return;

		err.status = ctx.status = detectErrorStatus(err);
		ctx.set(err.headers);

		const _accepts = ctx.accepts('html', 'text', 'json');
		const type = typeof _accepts === 'string' ? _accepts : 'text';

		let message = http.STATUS_CODES[ctx.status];
		if (isDev || err.expose) {
			const msg = detectErrorMessage(ctx, err);
			message = msg || message;
		}

		// redirect
		if (['html', 'text'].includes(type) && this._config.onError?.errorPage) {
			const _errorPage = this._config.onError?.errorPage;
			const errorPage = typeof _errorPage === 'function' ? _errorPage(err, ctx) : _errorPage;
			return ctx.redirect(errorPage);
		}

		if (type === 'html') {
			ctx.body = HTML_ERROR.replace('{{status}}', htmlEscape(`${ctx.status}`)).replace(
				'{{stack}}',
				htmlEscape(err.stack),
			);
			ctx.type = 'html';
		} else if (type === 'text') {
			// unset all headers, and set those specified
			(ctx.res as any)._headers = {};
			ctx.set(err.headers);
			ctx.body = message;
		} else {
			if (isDev) {
				ctx.body = {
					code: err.code || err.type,
					message,
					error_stack: err.stack,
				};
			} else {
				ctx.body = {
					code: err.code || err.type,
					message,
				};
			}
		}

		ctx.res.end(ctx.body);
	}
}
