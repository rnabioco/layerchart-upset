// Compiles every .svelte file under the given directory (client and server output, runes mode) with
// whichever `svelte` resolves next to this script. CI copies it beside an isolated svelte install to
// prove the components compile on the minimum supported Svelte.
import { compile, VERSION } from 'svelte/compiler';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
let n = 0;
for (const f of readdirSync(dir, { recursive: true })) {
	if (!f.endsWith('.svelte')) continue;
	const src = readFileSync(join(dir, f), 'utf8');
	for (const generate of ['client', 'server']) compile(src, { filename: f, generate, runes: true });
	n++;
}
console.log(`compiled ${n} components with svelte ${VERSION}`);
