import { getRedisProvider } from './utils';

async function test() {
	const provider = await getRedisProvider();
	await provider.start();
}

test()
	.then(() => {
		process.exit(0);
	})
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
