import type { IconNode } from './types';

/**
 * Zugriff auf die vollstaendige Icon-Sammlung.
 *
 * Bewusst nur fuer zwei Faelle gedacht:
 *   1. den Icon-Browser in den Favoriten-Einstellungen,
 *   2. die einmalige Migration von Favoriten, die noch keinen `iconNode` haben.
 *
 * Beim normalen Rendern des Dashboards wird hier nichts geladen — die Pfaddaten
 * eines gewaehlten Icons liegen direkt im Favoriten.
 */
let cache: Record<string, IconNode> | null = null;
let inFlight: Promise<Record<string, IconNode>> | null = null;

/** Die Sammlung, falls sie schon im Speicher liegt — sonst `null`. */
export function peekIconSet(): Record<string, IconNode> | null {
	return cache;
}

/** Laedt die Sammlung (~76 KB gzip) einmalig nach. */
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

/**
 * Sucht die Pfaddaten zu einem gespeicherten Icon-Namen.
 * Aeltere Layouts koennen Alias-Schreibweisen aus dem lucide-svelte-Barrel
 * enthalten (`LucideHouse`, `HouseIcon`) — die loesen wir mit auf.
 */
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
