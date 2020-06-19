import { okRes } from '@artisan-framework/core';
import { Criterion } from '../criterion';
import { ValidateResult } from '../interfaces';
import { string as stringLocale } from '../locale';
import { errorEntryCreator } from '../validate-helper';

interface StringCriterionOptions {
	trim?: boolean;
	min?: number;
	max?: number;
	length?: number;
	matches?: RegExp;
	email?: boolean;
	url?: boolean;
	locale?: Partial<typeof stringLocale>;
}

// http://www.regular-expressions.info/email.html
export const EMAIL_RE = /^[a-z0-9\!\#\$\%\&\'\*\+\/\=\?\^\_\`\{\|\}\~\-]+(?:\.[a-z0-9\!\#\$\%\&\'\*\+\/\=\?\^\_\`\{\|\}\~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?$/i;

// https://gist.github.com/dperini/729294
export const URL_RE = /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?$/i;

const TAG = 'string';
const err = errorEntryCreator(TAG);

export class StringCriterion extends Criterion<string> {
	constructor(protected _options: StringCriterionOptions = {}) {
		super(
			'string',
			(value: any, context): ValidateResult<string> => {
				let str: string | undefined;

				if (typeof value === 'string') {
					str = value;
				} else if (context.options.convert) {
					str = String(value);
				}

				const locale: typeof stringLocale = {
					...stringLocale,
					..._options.locale,
				};

				const path = context.path || 'object';

				if (str == null) {
					return err(locale.type, { path }, value);
				}

				if (_options.trim) {
					str = str.trim();
				}

				const len = str.length;

				if (_options.length != null && len !== _options.length) {
					return err(locale.length, { path, length: _options.length }, value);
				}

				if (_options.min != null && len < _options.min) {
					return err(locale.min, { path, min: _options.min }, value);
				}

				if (_options.max != null && len > _options.max) {
					return err(locale.max, { path, max: _options.max }, value);
				}

				if (_options.matches != null && !_options.matches.test(str)) {
					return err(locale.matches, { path, regex: _options.matches }, value);
				}

				if (_options.email && !EMAIL_RE.test(str)) {
					return err(locale.email, { path }, value);
				}

				if (_options.url && !URL_RE.test(str)) {
					return err(locale.url, { path }, value);
				}

				return okRes(str);
			},
		);
	}

	static create(message?: string): StringCriterion {
		return new StringCriterion({
			locale: { ...(message ? { type: message } : {}) },
		});
	}

	locale(locale: Partial<typeof stringLocale>): StringCriterion {
		return new StringCriterion({
			...this._options,
			locale: { ...this._options.locale, ...locale },
		});
	}

	trim(): StringCriterion {
		return new StringCriterion({
			...this._options,
			trim: true,
		});
	}

	min(min: number, message?: string): StringCriterion {
		return new StringCriterion({
			...this._options,
			min,
			locale: { ...this._options.locale, ...(message ? { min: message } : {}) },
		});
	}

	max(max: number, message?: string): StringCriterion {
		return new StringCriterion({
			...this._options,
			max,
			locale: { ...this._options.locale, ...(message ? { max: message } : {}) },
		});
	}

	length(length: number, message?: string): StringCriterion {
		return new StringCriterion({
			...this._options,
			length,
			locale: { ...this._options.locale, ...(message ? { length: message } : {}) },
		});
	}

	matches(matches: RegExp, message?: string): StringCriterion {
		return new StringCriterion({
			...this._options,
			matches,
			locale: { ...this._options.locale, ...(message ? { matches: message } : {}) },
		});
	}

	url(message?: string): StringCriterion {
		return new StringCriterion({
			...this._options,
			url: true,
			locale: { ...this._options.locale, ...(message ? { url: message } : {}) },
		});
	}

	email(message?: string): StringCriterion {
		return new StringCriterion({
			...this._options,
			email: true,
			locale: { ...this._options.locale, ...(message ? { email: message } : {}) },
		});
	}
}
