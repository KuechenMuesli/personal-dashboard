import fs from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const keyPath = new URL('./certs/localhost-key.pem', import.meta.url);
const certPath = new URL('./certs/localhost.pem', import.meta.url);

const https =
	fs.existsSync(keyPath) && fs.existsSync(certPath)
		? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
		: undefined;

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: { https }
});
