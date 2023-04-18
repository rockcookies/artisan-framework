import { Readable } from 'stream';

// https://github.com/octet-stream/form-data
export class HttpBlobFromStream {
	private _stream: Readable;
	private _type: string;
	constructor(stream: Readable, type: string) {
		this._stream = stream;
		this._type = type;
	}

	stream() {
		return this._stream;
	}

	get type(): string {
		return this._type;
	}

	get [Symbol.toStringTag]() {
		return 'Blob';
	}
}
