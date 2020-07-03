import { ArtisanEncryptionProvider } from '../src/artisan-encryption-provider';

describe('crypto-encrypter.test.ts', () => {
	function decrypt(digest: Buffer | false): string | false {
		return digest === false ? digest : digest.toString('utf8');
	}

	it('should throw without keys', async () => {
		expect(() => {
			new ArtisanEncryptionProvider({ keys: [] });
		}).toThrowError('keys must be provided');
	});

	it('should encrypt and decrypt success', () => {
		const kgA = new ArtisanEncryptionProvider({ keys: ['foo', 'bar'] });
		const kgB = new ArtisanEncryptionProvider({ keys: ['another', 'foo'] });

		const encrypted = kgA.encrypt(Buffer.from('hello'));

		expect(decrypt(kgA.decrypt(encrypted))).toBe('hello');
		expect(decrypt(kgB.decrypt(encrypted))).toBe('hello');
	});

	it('should decrypt error return false', () => {
		const kgA = new ArtisanEncryptionProvider({ keys: ['foo', 'bar'] });
		const kgB = new ArtisanEncryptionProvider({ keys: ['another'] });

		const encrypted = kgA.encrypt(Buffer.from('hello'));

		expect(decrypt(kgA.decrypt(encrypted))).toBe('hello');
		expect(decrypt(kgB.decrypt(encrypted))).toBe(false);
	});

	it('should signed and verify success', () => {
		const kgA = new ArtisanEncryptionProvider({ keys: ['foo', 'bar'] });
		const kgB = new ArtisanEncryptionProvider({ keys: ['another', 'foo'] });

		const buf = Buffer.from('hello', 'utf8');
		const signed = kgA.sign(buf);

		expect(kgA.verify(buf, signed)).toBe(true);
		expect(kgB.verify(buf, signed)).toBe(true);
	});

	it('should signed and verify failed return false', () => {
		const kgA = new ArtisanEncryptionProvider({ keys: ['foo', 'bar'] });
		const kgB = new ArtisanEncryptionProvider({ keys: ['another'] });

		const buf = Buffer.from('hello', 'utf8');
		const signed = kgA.sign(buf);

		expect(kgA.verify(buf, signed)).toBe(true);
		expect(kgB.verify(buf, signed)).toBe(false);
	});
});
