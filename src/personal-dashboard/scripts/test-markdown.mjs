import { renderMarkdown } from '../src/lib/markdown.ts';

const ALLOWED_TAGS = new Set([
	'p',
	'br',
	'hr',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'strong',
	'em',
	'del',
	'code',
	'pre',
	'blockquote',
	'ul',
	'ol',
	'li',
	'a',
	'img',
	'input',
	'table',
	'thead',
	'tbody',
	'tr',
	'th',
	'td'
]);
const ALLOWED_ATTRS = new Set([
	'href',
	'src',
	'alt',
	'title',
	'class',
	'target',
	'rel',
	'loading',
	'type',
	'checked',
	'disabled',
	'align',
	'start'
]);

const TAG = /<\/?([a-zA-Z][^\s/>]*)((?:"[^"]*"|'[^']*'|[^>"'])*)\/?>/g;
const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

function schemeOk(value) {
	const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value.trim());
	if (!scheme) return true;
	const protocol = scheme[1].toLowerCase();
	if (protocol === 'http' || protocol === 'https' || protocol === 'mailto') return true;
	return /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(value.trim());
}

function violations(html) {
	const found = [];
	for (const tag of html.matchAll(TAG)) {
		const name = tag[1].toLowerCase();
		if (!ALLOWED_TAGS.has(name)) {
			found.push(`Tag <${name}>`);
			continue;
		}
		for (const attr of (tag[2] ?? '').matchAll(ATTR)) {
			const key = attr[1].toLowerCase();
			const value = attr[2] ?? attr[3] ?? attr[4] ?? '';
			if (!ALLOWED_ATTRS.has(key)) {
				found.push(`Attribut ${key} an <${name}>`);
			} else if ((key === 'href' || key === 'src') && !schemeOk(value)) {
				found.push(`Schema in ${key}="${value}"`);
			}
		}
	}
	return found;
}

const attacks = [
	'<script>alert(1)</script>',
	'<img src=x onerror=alert(1)>',
	'<script>\n<div onclick=alert(1)',
	'<SCRIPT>alert(1)</SCRIPT>',
	'<iframe src="javascript:alert(1)"></iframe>',
	'<svg/onload=alert(1)>',
	'<a href="javascript:alert(1)">t</a>',
	'<a href="#" onmouseover="alert(1)">t</a>',
	'[x](javascript:alert(1))',
	'[x](JaVaScRiPt:alert(1))',
	'[x](&#106;avascript:alert(1))',
	'[x](&#x6a;avascript:alert(1))',
	'[x](java&Tab;script:alert(1))',
	'[x](&#0000106;avascript:alert(1))',
	'![a](javascript:alert(1))',
	'![a](data:image/svg+xml;base64,PHN2Zy8+)',
	'![a]("onerror="alert(1))',
	'![a](x" onerror="alert(1))',
	'[x](vbscript:msgbox(1))',
	'[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
	'[click](" onmouseover="alert(1))',
	'> <img src=x onerror=alert(1)>',
	'- <script>alert(1)</script>',
	'| a |\n|---|\n| <img src=x onerror=alert(1)> |',
	'```js"><img src=x onerror=alert(1)>\ncode\n```',
	'[ref][1]\n\n[1]: javascript:alert(1)',
	'<div>\n\n<script>alert(1)</script>\n\n</div>',
	'<pre><script>alert(1)</script></pre>',
	'<textarea></textarea><script>alert(1)</script>',
	'\\<script>alert(1)</script>',
	'<style>body{background:url(javascript:alert(1))}</style>',
	'<base href="https://evil.example/">',
	'<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>'
];

let failed = 0;
for (const input of attacks) {
	const out = renderMarkdown(input);
	const found = violations(out);
	if (found.length) {
		failed++;
		console.log('FAIL  ' + JSON.stringify(input));
		console.log('  ' + found.join(', '));
		console.log('  ->  ' + JSON.stringify(out));
	}
}

const benign = [
	['# Titel', '<h1>Titel</h1>'],
	['**fett** und *kursiv*', '<strong>fett</strong>'],
	['[Link](https://example.com)', 'href="https://example.com"'],
	['[Mail](mailto:a@b.de)', 'href="mailto:a@b.de"'],
	['[Anker](#abschnitt)', 'href="#abschnitt"'],
	['[Relativ](/impressum)', 'href="/impressum"'],
	['![Bild](https://example.com/a.png)', '<img src="https://example.com/a.png"'],
	['![Bild](data:image/png;base64,iVBORw0KGgo=)', 'src="data:image/png;base64,iVBORw0KGgo="'],
	['```js\nconst a = 1;\n```', 'language-js'],
	['- a\n- b', '<li>a</li>'],
	['| a | b |\n|---|---|\n| 1 | 2 |', '<table>'],
	['~~weg~~', '<del>weg</del>'],
	['- [ ] offen', 'type="checkbox"'],
	['Text mit a > b & c', 'a &gt; b &amp; c'],
	['`<script>`', '<code>&lt;script&gt;</code>'],
	['[extern](https://example.com)', 'rel="noopener noreferrer nofollow"']
];

for (const [input, expected] of benign) {
	const out = renderMarkdown(input);
	if (!out.includes(expected)) {
		failed++;
		console.log('REGRESSION ' + JSON.stringify(input) + ' erwartet ' + JSON.stringify(expected));
		console.log('  ->  ' + JSON.stringify(out));
	}
}

console.log(
	`\n${attacks.length} Angriffsvektoren, ${benign.length} Regressionsfaelle, ${failed} Fehler`
);
process.exit(failed ? 1 : 0);
