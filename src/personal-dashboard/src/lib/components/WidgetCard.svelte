<script lang="ts">
  import type { Snippet } from 'svelte';
  import {Settings} from "lucide-svelte";
  import { i18n } from '$lib/i18n/i18n.svelte';

  let {
    title,
    isConfigured = true,
    padding = true,
    transparent = false,
    showSettings = $bindable(false),
    headerActions,
    children
  }: {
    title?: string;
    isConfigured?: boolean;
    padding?: boolean;
    transparent?: boolean;
    showSettings?: boolean;
    headerActions?: Snippet;
    children: Snippet;
  } = $props();
</script>

<div class="flex h-full w-full flex-col text-primary
  {transparent ? 'overflow-visible' : 'ds-card overflow-hidden'}
  {padding ? 'p-3 sm:p-4' : ''}">

	{#if !isConfigured && !showSettings}
		<button
				onclick={() => showSettings = true}
				class="ds-focus flex h-full w-full items-center justify-center gap-2 rounded-lg text-muted transition-colors hover:text-accent"
		>
			<Settings size={14} />
			<span class="ds-label text-inherit">{i18n.t.w.common.configureWidget.replace('{widget}', title || 'Widget')}</span>
		</button>
	{:else}

		{#if title}
			<div class="mb-3 flex shrink-0 items-center justify-between border-b border-line pb-2">
				<h2 class="ds-label flex items-center gap-2 truncate">
					{title}
				</h2>

				{#if headerActions}
					<div class="ds-segment shrink-0">
						{@render headerActions()}
					</div>
				{/if}
			</div>
		{/if}

		<div class="ds-scroll flex-grow overflow-y-auto">
			{@render children()}
		</div>

	{/if}
</div>
