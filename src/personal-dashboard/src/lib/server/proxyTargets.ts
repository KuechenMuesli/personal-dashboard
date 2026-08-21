/**
 * Zielpruefung fuer `/api/proxy`.
 *
 * Bewusst als eigenes Modul mit reinen Funktionen: die Regeln hier entscheiden,
 * ob eine fremde URL abgerufen werden darf und ob dabei Zugangsdaten des
 * Nutzers mitgehen. Das ist testbar zu halten ist wichtiger als es kurz zu halten.
 *
 * Zwei Klassen von Zielen:
 *
 *   `api`  — bekannte Dienste aus der Liste unten. Nur diese duerfen die
 *            Zugangsdaten des Clients (Authorization, api-key, …) sehen.
 *
 *   `feed` — beliebige Kalender-URLs, die Nutzer selbst eintragen. Erlaubt,
 *            aber stark eingeschraenkt: nur GET, niemals Zugangsdaten, keine
 *            internen Adressen, Groessenlimit, und die Antwort muss wirklich
 *            ein iCalendar-Dokument sein.
 */

export type TargetKind = 'api' | 'feed';

export interface TargetDecision {
	kind: TargetKind;
	url: URL;
	/** Darf der Proxy Zugangsdaten des Clients an dieses Ziel weiterreichen? */
	forwardCredentials: boolean;
}

export class TargetRejected extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'TargetRejected';
	}
}

interface ApiTarget {
	/**
	 * Exakter Hostname, oder ein Suffix beginnend mit `.` (alle Subdomains)
	 * bzw. `-` (Praefix-Schema von Google Vertex AI).
	 * Geprueft wird immer der geparste Hostname — nie die URL als Zeichenkette.
	 */
	host: string;
	forwardCredentials: boolean;
}

const API_TARGETS: readonly ApiTarget[] = [
	{ host: 'api.duckduckgo.com', forwardCredentials: false },
	{ host: 'query1.finance.yahoo.com', forwardCredentials: false },
	{ host: 'query2.finance.yahoo.com', forwardCredentials: false },
	{ host: 'translate.googleapis.com', forwardCredentials: false },
	{ host: '.wikipedia.org', forwardCredentials: false },
	{ host: 'usetrmnl.com', forwardCredentials: false },
	{ host: 'trmnl.com', forwardCredentials: false },
	{ host: 'generativelanguage.googleapis.com', forwardCredentials: true },
	{ host: '-aiplatform.googleapis.com', forwardCredentials: true },
	{ host: 'api.parcel.app', forwardCredentials: true },
	{ host: 'api.17track.net', forwardCredentials: true }
];

const BLOCKED_HOST_SUFFIXES = ['.local', '.internal', '.home.arpa', '.localhost'];

/**
 * Adressen, die niemals von aussen angesprochen werden sollen — privates
 * Netz, Loopback und vor allem 169.254.169.254 (Cloud-Metadata).
 *
 * Achtung: Namen, die erst per DNS auf eine interne Adresse zeigen, lassen
 * sich hier nicht abfangen (Workers koennen nicht aufloesen). Cloudflare
 * leitet `fetch` ueber das oeffentliche Netz, wodurch dieser Rest abgedeckt
 * ist — die Pruefung hier schuetzt zusaetzlich beim lokalen Entwickeln.
 */
export function isPrivateAddress(hostname: string): boolean {
	const host = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
	if (!host) return true;

	// Bare Namen ohne Punkt: localhost, router, metadata, …
	if (!host.includes('.') && !host.includes(':')) return true;
	if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;

	const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (ipv4) {
		const a = Number(ipv4[1]);
		const b = Number(ipv4[2]);
		if (a === 0 || a === 10 || a === 127) return true;
		if (a === 169 && b === 254) return true; // Link-local inkl. Cloud-Metadata
		if (a === 172 && b >= 16 && b <= 31) return true;
		if (a === 192 && b === 168) return true;
		if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
		if (a >= 224) return true; // Multicast und reserviert
		return false;
	}

	if (host.includes(':')) {
		if (host === '::1' || host === '::') return true;
		if (host.startsWith('::ffff:')) return isPrivateAddress(host.slice(7));
		if (/^f[cd]/.test(host)) return true; // Unique local, fc00::/7
		if (/^fe[89ab]/.test(host)) return true; // Link-local, fe80::/10
		return true; // Unbekanntes IPv6-Literal: im Zweifel ablehnen
	}

	return false;
}

function matchApiTarget(hostname: string): ApiTarget | null {
	const host = hostname.toLowerCase();
	for (const target of API_TARGETS) {
		if (target.host.startsWith('.') || target.host.startsWith('-')) {
			if (host.endsWith(target.host)) return target;
		} else if (host === target.host) {
			return target;
		}
	}
	return null;
}

/**
 * Prueft eine Ziel-URL und entscheidet, wie sie behandelt wird.
 * Wirft `TargetRejected`, wenn sie gar nicht abgerufen werden darf.
 */
export function classifyTarget(rawTarget: string, method: string): TargetDecision {
	if (!rawTarget) throw new TargetRejected(400, 'Missing target URL');

	// webcal:// ist das uebliche Schema fuer Kalender-Abos und meint https.
	const normalized = rawTarget.replace(/^webcal:\/\//i, 'https://');

	let url: URL;
	try {
		url = new URL(normalized);
	} catch {
		throw new TargetRejected(400, 'Target URL is malformed');
	}

	if (url.protocol !== 'https:') {
		throw new TargetRejected(400, 'Only https targets are supported');
	}

	if (isPrivateAddress(url.hostname)) {
		throw new TargetRejected(403, 'Target address is not routable through this proxy');
	}

	const apiTarget = matchApiTarget(url.hostname);
	if (apiTarget) {
		return { kind: 'api', url, forwardCredentials: apiTarget.forwardCredentials };
	}

	// Unbekannter Host: nur als Kalender-Feed, nur lesend, nie mit Zugangsdaten.
	if (method !== 'GET') {
		throw new TargetRejected(403, 'Target URL is not permitted by proxy rules');
	}

	return { kind: 'feed', url, forwardCredentials: false };
}

/** Sieht die Antwort wie ein iCalendar-Dokument aus? */
export function looksLikeCalendar(body: string): boolean {
	return /^﻿?\s*BEGIN:VCALENDAR/i.test(body.slice(0, 512));
}
