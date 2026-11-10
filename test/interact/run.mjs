// Runs every test/interact/*.mjs (except this file) against the same server, one after another.
// Usage: node test/interact/run.mjs [baseUrl]
//   With a baseUrl, that server is used as is. Without one, an already running dev server on :5173 is reused;
//   if there is none, `vite dev` is started for the run and stopped afterwards.
import { readdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, '..', '..');
const DEFAULT_BASE = 'http://localhost:5173';
const base = process.argv[2] ?? DEFAULT_BASE;

const isUp = async (url) => {
	try {
		await fetch(url, { signal: AbortSignal.timeout(2000) });
		return true;
	} catch {
		return false;
	}
};

let server;
const stop = () => server?.kill();
process.on('exit', stop);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));

if (!process.argv[2] && !(await isUp(base))) {
	console.log('# starting vite dev on :5173');
	let log = '';
	server = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'dev', '--port', '5173', '--strictPort'], {
		cwd: root,
		stdio: ['ignore', 'pipe', 'pipe']
	});
	server.stdout.on('data', (d) => (log += d));
	server.stderr.on('data', (d) => (log += d));
	let exited = false;
	server.on('exit', () => (exited = true));
	const deadline = Date.now() + 60_000;
	while (!(await isUp(base))) {
		if (exited || Date.now() > deadline) {
			console.error(`could not start vite dev:\n${log}`);
			process.exit(1);
		}
		await new Promise((r) => setTimeout(r, 300));
	}
}

const files = readdirSync(dir).filter((f) => f.endsWith('.mjs') && f !== 'run.mjs').sort();
let failed = 0;
for (const f of files) {
	console.log(`\n# ${f}`);
	const r = spawnSync(process.execPath, [join(dir, f), base], { stdio: 'inherit' });
	if (r.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
