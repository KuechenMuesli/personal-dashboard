<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { beforeNavigate, invalidate } from '$app/navigation';
	import { updated } from '$app/state';
	import { onMount } from 'svelte';

	let { children, data } = $props();
	let { supabase, session } = $derived(data);

	/**
	 * Nach einem Deployment gibt es die JS-Chunks der alten Version nicht mehr.
	 * Eine Seite, die noch laeuft, wuerde beim Navigieren einen Chunk nachladen
	 * wollen, den es nicht mehr gibt — der Import scheitert dann mit
	 * "Importing a module script failed".
	 *
	 * Sobald SvelteKit eine neue Version bemerkt hat (Polling, siehe
	 * `kit.version.pollInterval`), navigieren wir deshalb mit einem vollen
	 * Seitenwechsel statt clientseitig.
	 */
	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) {
			location.href = to.url.href;
		}
	});

	/**
	 * Zweite Absicherung fuer die Faelle, die das Polling nicht rechtzeitig
	 * erwischt — etwa das Nachladen eines Widgets. Einmal neu laden holt die
	 * aktuelle Version; die Sperre verhindert eine Endlosschleife, wenn das
	 * Problem woanders liegt.
	 */
	const RELOAD_MARKER = 'dashboard-chunk-reload';
	const RELOAD_COOLDOWN_MS = 60_000;

	function isStaleChunkError(reason: unknown): boolean {
		const message = reason instanceof Error ? reason.message : String(reason ?? '');
		return /importing a module script failed|(failed to fetch|error loading) dynamically imported module/i.test(
			message
		);
	}

	function recoverFromStaleChunk() {
		try {
			const last = Number(sessionStorage.getItem(RELOAD_MARKER) ?? '0');
			if (Date.now() - last < RELOAD_COOLDOWN_MS) return;
			sessionStorage.setItem(RELOAD_MARKER, Date.now().toString());
		} catch {
			// Privater Modus ohne sessionStorage: lieber gar nicht neu laden,
			// als eine Schleife zu riskieren.
			return;
		}
		location.reload();
	}

	onMount(() => {
		const handleRejection = (event: PromiseRejectionEvent) => {
			if (isStaleChunkError(event.reason)) recoverFromStaleChunk();
		};
		window.addEventListener('unhandledrejection', handleRejection);

		const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => {
			window.removeEventListener('unhandledrejection', handleRejection);
			authListener.subscription.unsubscribe();
		};
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
