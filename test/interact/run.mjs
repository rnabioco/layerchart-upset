// Runs every test/interact/*.mjs (except this file) against the same dev server, one after another.
// Usage: node test/interact/run.mjs [baseUrl]
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const base = process.argv[2] ?? 'http://localhost:5173';
const files = readdirSync(dir).filter((f) => f.endsWith('.mjs') && f !== 'run.mjs').sort();
let failed = 0;
for (const f of files) {
	console.log(`\n# ${f}`);
	const r = spawnSync(process.execPath, [join(dir, f), base], { stdio: 'inherit' });
	if (r.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
