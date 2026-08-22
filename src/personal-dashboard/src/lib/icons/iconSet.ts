import type { IconNode } from './types';

/**
 * Nur fuer den Icon-Browser und die Migration alter Favoriten. Beim Rendern des
 * Dashboards wird hier nichts geladen — die Pfaddaten liegen im Favoriten selbst.
 */
let cache: Record<string, IconNode> | null = null;
let inFlight: Promise<Record<string, IconNode>> | null = null;

export function peekIconSet(): Record<string, IconNode> | null {
	return cache;
}

/** ~76 KB gzip. */
export function loadIconSet(): Promise<Record<string, IconNode>> {
	if (cache) return Promise.resolve(cache);
	if (inFlight) return inFlight;

	inFlight = import('./iconData')
		.then((module) => {
			cache = module.default;
			inFlight = null;
			return cache;
		})
		.catch((error) => {
			inFlight = null;
			console.error('Icon-Sammlung konnte nicht geladen werden', error);
			return {};
		});

	return inFlight;
}

/** Loest auch die Alias-Schreibweisen aus alten Layouts auf (`LucideHouse`, `HouseIcon`). */
export function findIconNode(
	set: Record<string, IconNode>,
	name: string
): IconNode | null {
	if (!name) return null;

	const candidates = [name];
	if (name.startsWith('Lucide') && name.length > 6) candidates.push(name.slice(6));
	if (name.endsWith('Icon') && name.length > 4) candidates.push(name.slice(0, -4));

	for (const candidate of candidates) {
		if (set[candidate]) return set[candidate];
	}
	return null;
}
