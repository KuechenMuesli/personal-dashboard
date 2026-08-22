/**
 * Erzeugt `src/lib/icons/iconData.ts` aus dem installierten `lucide-svelte`.
 *
 * Grund: `import * as icons from "lucide-svelte"` ist nicht tree-shakebar,
 * sobald der Namespace dynamisch indiziert wird — 843 KB in einem Chunk.
 *
 * Nach jedem Update von `lucide-svelte` neu laufen lassen: npm run icons:generate
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(root, 'node_modules', 'lucide-svelte', 'dist', 'icons');
const OUT_DIR = join(root, 'src', 'lib', 'icons');
const OUT_FILE = join(OUT_DIR, 'iconData.ts');

/** `a-arrow-down` -> `AArrowDown`, wie lucide-svelte exportiert. */
function toPascalCase(kebab) {
	return kebab
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('');
}

const files = readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.svelte'));
if (files.length === 0) {
	throw new Error(`Keine Icons unter ${SOURCE_DIR} gefunden — ist lucide-svelte installiert?`);
}

const entries = [];
let skipped = 0;

for (const file of files) {
	const source = readFileSync(join(SOURCE_DIR, file), 'utf8');
	const match = source.match(/^const iconNode = (\[.*\]);$/m);
	if (!match) {
		skipped += 1;
		continue;
	}

	try {
		JSON.parse(match[1]);
	} catch {
		skipped += 1;
		continue;
	}

	entries.push([toPascalCase(file.replace(/\.svelte$/, '')), match[1]]);
}

entries.sort((a, b) => a[0].localeCompare(b[0]));

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
	OUT_FILE,
	[
		'// GENERIERT — nicht von Hand bearbeiten.',
		'// Quelle: node_modules/lucide-svelte (ISC). Neu erzeugen mit `npm run icons:generate`.',
		"import type { IconNode } from './types';",
		'',
		'const iconData: Record<string, IconNode> = {',
		entries.map(([name, node]) => `\t${JSON.stringify(name)}: ${node}`).join(',\n'),
		'};',
		'',
		'export default iconData;',
		''
	].join('\n'),
	'utf8'
);

console.log(`${entries.length} Icons nach ${OUT_FILE} geschrieben (${skipped} uebersprungen).`);
