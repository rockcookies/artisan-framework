import http = require('http');
import { value } from '@artisan-framework/core';
import { htmlEscape } from 'escape-goat';
import { detectErrorMessage, detectErrorStatus, isProd } from '../utils';
import { WebContext, WebProviderConfig, WEB_PROVIDER_CONFIG_KEY } from '../web-protocol';
import { WebErrorHandler } from './error-protocol';

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

	canHandle(): boolean {
		return true;
	}

	handle(err: any, ctx: WebContext): void {
		ctx.status = detectErrorStatus(err);
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
			ctx.redirect(errorPage);
		} else {
			// setType
			ctx.type = type;

			if (type === 'html') {
				ctx.body = HTML_ERROR.replace('{{status}}', htmlEscape(`${ctx.status}`)).replace(
					'{{stack}}',
					htmlEscape(err.stack),
				);
			} else if (type === 'text') {
				// unset all headers, and set those specified
				if (typeof ctx.res.getHeaderNames === 'function') {
					for (const name of ctx.res.getHeaderNames()) {
						ctx.res.removeHeader(name);
					}
				} else {
					(ctx.res as any)._headers = {};
				}

				ctx.set(err.headers);
				ctx.body = message;
			} else {
				if (isDev) {
					ctx.body = JSON.stringify({
						message,
						error: err.stack,
					});
				} else {
					ctx.body = JSON.stringify({
						message,
					});
				}
			}
		}

		ctx.res.end(ctx.body);
	}
}
