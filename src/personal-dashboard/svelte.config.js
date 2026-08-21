import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter(),
		prerender: {
			handleUnseenRoutes: 'ignore',
			handleHttpError: 'warn'
		},
		csrf: {
			checkOrigin: false
		},
		version: {
			// Laesst SvelteKit im Hintergrund nach neuen Deployments schauen (wenige
			// Bytes alle 5 Minuten). Ohne das merkt eine offene Seite erst beim
			// fehlgeschlagenen Chunk-Import, dass sie veraltet ist.
			pollInterval: 5 * 60 * 1000
		}
	}
};

export default config;
