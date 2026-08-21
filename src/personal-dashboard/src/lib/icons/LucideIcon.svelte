<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { IconNode } from './types';

	let {
		node,
		size = 24,
		strokeWidth = 2,
		class: className = '',
		fallback
	}: {
		/** Pfaddaten des Icons. Fehlen sie, wird `fallback` gerendert. */
		node?: IconNode | null;
		size?: number;
		strokeWidth?: number;
		class?: string;
		fallback?: Snippet;
	} = $props();
</script>

{#if node && node.length > 0}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		class="lucide {className}"
		aria-hidden="true"
	>
		{#each node as [tag, attrs]}
			<svelte:element this={tag} {...attrs} />
		{/each}
	</svg>
{:else}
	{@render fallback?.()}
{/if}
