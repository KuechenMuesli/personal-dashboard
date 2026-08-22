import { Marked, Renderer, Tokenizer, type Tokens } from 'marked';

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

// SVG ist bewusst nicht dabei: ein data:image/svg+xml führt Skripte aus, sobald es nicht in
// einem <img> landet.
const SAFE_IMAGE_DATA = /^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=]*$/i;

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	colon: ':',
	tab: '\t',
	newline: '\n',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'"
};

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// Der Browser dekodiert Entities und wirft Steuerzeichen weg, bevor er das Schema einer URL
// auswertet: `&#106;avascript:` und `java&Tab;script:` sind für ihn ausführbar. Die Prüfung
// läuft deshalb auf der dekodierten Fassung, ausgeliefert wird das Original.
function decodeForProtocolCheck(url: string): string {
	return url
		.replace(/&#(x[0-9a-f]+|\d+);?/gi, (match, code: string) => {
			const value =
				code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : parseInt(code, 10);
			if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return match;
			return String.fromCodePoint(value);
		})
		.replace(/&([a-z]+);?/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
		.replace(/[\u0000-\u0020\u007F\u00A0\u200B-\u200F\uFEFF]/g, '');
}

function safeUrl(href: string | null | undefined, allowImageData = false): string | null {
	const raw = (href ?? '').trim();
	if (!raw) return null;

	const decoded = decodeForProtocolCheck(raw);
	const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(decoded);
	if (!scheme) return raw;

	const protocol = `${scheme[1].toLowerCase()}:`;
	if (SAFE_PROTOCOLS.has(protocol)) return raw;
	if (allowImageData && protocol === 'data:' && SAFE_IMAGE_DATA.test(decoded)) return raw;
	return null;
}

// Ohne diese beiden Tokenizer entstehen HTML-Tokens und mit ihnen der inRawBlock-Zustand, in
// dem marked nachfolgenden Text ungeprüft durchreicht. Das hier abzuschalten ist wirksamer,
// als das Ergebnis hinterher zu escapen.
class SafeTokenizer extends Tokenizer {
	override html(): undefined {
		return undefined;
	}
	override tag(): undefined {
		return undefined;
	}
}

class SafeRenderer extends Renderer {
	override link({ href, title, tokens }: Tokens.Link): string {
		const text = this.parser.parseInline(tokens);
		const url = safeUrl(href);
		if (!url) return text;

		const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
		return `<a href="${escapeHtml(url)}"${titleAttr} target="_blank" rel="noopener noreferrer nofollow">${text}</a>`;
	}

	override image({ href, title, text }: Tokens.Image): string {
		const url = safeUrl(href, true);
		if (!url) return escapeHtml(text ?? '');

		const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
		return `<img src="${escapeHtml(url)}" alt="${escapeHtml(text ?? '')}"${titleAttr} loading="lazy">`;
	}

	override html(token: Tokens.HTML | Tokens.Tag): string {
		return escapeHtml(token.text);
	}
}

// setOptions statt `new Marked(...)` oder `.use(...)`: beide kopieren nur eigene
// Objekt-Eigenschaften, die Methoden einer Klasse liegen aber auf dem Prototyp und kommen
// dabei nie an. Mit dem Konstruktor rendert marked still weiter mit den Standardklassen.
const parser = new Marked();
parser.setOptions({
	gfm: true,
	breaks: false,
	async: false,
	renderer: new SafeRenderer(),
	tokenizer: new SafeTokenizer()
});

/**
 * Einziger erlaubter Weg, Markdown für `{@html}` zu rendern: direktes `marked.parse` auf
 * fremden Inhalten (Quickshares, Assistant-Antworten) war gespeichertes XSS.
 */
export function renderMarkdown(source: string | null | undefined): string {
	if (!source) return '';
	return parser.parse(source, { async: false }) as string;
}
