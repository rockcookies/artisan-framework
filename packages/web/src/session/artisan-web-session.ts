import { Dictionary } from '@artisan-framework/core';
import { WebSession } from './session-protocol';
import crypto = require('crypto');
import { v4 } from 'uuid';

function hash(object: Dictionary): string {
	return crypto.createHash('sha1').update(JSON.stringify(object), 'utf8').digest('hex');
}

export class ArtisanWebSession implements WebSession {
	id: string;
	exp: number;
	iat: number;
	readonly isNew: boolean;
	protected readonly _hash: string;

	constructor(options: { expiresAt: number; issuedAt: number; object?: Dictionary }) {
		this.id = v4();
		this.exp = options.expiresAt;
		this.iat = options.issuedAt;

		for (const [key, value] of Object.entries(options.object || {})) {
			(this as any)[key] = value;
		}

		this.isNew = options.object == null;
		this._hash = hash(this.toJSON());
	}

	toJSON(): Dictionary {
		const obj: Dictionary = {};

		for (const key of Object.keys(this)) {
			if (key === 'isNew' || key[0] === '_') continue;
			obj[key] = (this as any)[key];
		}

		return obj;
	}

	changed() {
		return this._hash !== hash(this.toJSON());
	}
}
