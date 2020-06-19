import { Dictionary, ErrRes, errRes } from '@artisan-framework/core';
import { ValidateErrorEntry } from './interfaces';

const objectToString = Object.prototype.toString;
const errorToString = Error.prototype.toString;
const regExpToString = RegExp.prototype.toString;
const symbolToString = typeof Symbol !== 'undefined' ? Symbol.prototype.toString : (): string => '';

const strReg = /\$\{\s*(\w+)\s*\}/g;
const SYMBOL_REGEXP = /^Symbol\((.*)\)(.*)$/;

function printNumber(val: any): string {
	if (val != +val) return 'NaN';
	const isNegativeZero = val === 0 && 1 / val < 0;
	return isNegativeZero ? '-0' : '' + val;
}

function printSimpleValue(val: any, quoteStrings: boolean): string | null {
	if (val == null || val === true || val === false) return '' + val;

	const typeOf = typeof val;
	if (typeOf === 'number') return printNumber(val);
	if (typeOf === 'string') return quoteStrings ? `"${val}"` : val;
	if (typeOf === 'function') return '[Function ' + (val.name || 'anonymous') + ']';
	if (typeOf === 'symbol') return symbolToString.call(val).replace(SYMBOL_REGEXP, 'Symbol($1)');

	const tag = objectToString.call(val).slice(8, -1);
	if (tag === 'Date') return isNaN(val.getTime()) ? '' + val : val.toISOString(val);
	if (tag === 'Error' || val instanceof Error) return '[' + errorToString.call(val) + ']';
	if (tag === 'RegExp') return regExpToString.call(val);

	return null;
}

export function errorEntryCreator(
	tag: string,
): (message: string, params: Dictionary, input: any, children?: ValidateErrorEntry[]) => ErrRes<ValidateErrorEntry> {
	return (message, params, input, children) =>
		errRes({
			tag,
			message: message.replace(strReg, (_, key) => params[key]),
			input,
			children,
		});
}

export function formatValidateError(err: ValidateErrorEntry, indent = 0): string {
	const prefix = indent > 0 ? `${'| '.repeat(indent - 1)}|-- ` : '';

	let message = `${prefix}[${err.tag}] ${printSimpleValue(err.input, true)} ${err.message}`;

	if (err.children && err.children.length > 0) {
		message = '\n' + err.children.map((e) => formatValidateError(e, indent + 1)).join('\n');
	}

	return message;
}
