const VALID_HEADER_TOKEN = new Set(
	"!#$%&'*+-./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ^_`abcdefghijklmnopqrstuvwxyz|~".split(''),
);

export function canonicalMIMEHeaderKey(key: string): string {
	for (let i = 0; i < key.length; i++) {
		const c = key.charAt(i);

		if (VALID_HEADER_TOKEN.has(c)) {
			continue;
		}

		return key;
	}

	let upper = true;
	const sb: string[] = [];

	for (let i = 0; i < key.length; i++) {
		let c = key.charAt(i);

		if (upper && c >= 'a' && c <= 'z') {
			c = c.toUpperCase();
		} else if (!upper && c >= 'A' && c <= 'Z') {
			c = c.toLowerCase();
		}

		sb.push(c);
		upper = c === '-';
	}

	return sb.join('');
}
