<script lang="ts">
  import type { Snippet } from 'svelte';
  import {Settings} from "lucide-svelte";

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

<div class="flex h-full w-full flex-col font-sans text-slate-200 overflow-hidden transition-all
  {transparent ? '' : 'rounded-xl border border-black/40 bg-neutral-800 shadow-xl'}
  {padding ? 'p-3 sm:p-4' : ''}">

	{#if !isConfigured}
		<button
				onclick={() => showSettings = true}
				class="flex h-full w-full items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-blue-400 transition-colors"
		>
			<Settings size={14} />
			Configure {title || 'Widget'}
		</button>
	{:else}

		{#if title}
			<div class="flex shrink-0 items-center justify-between mb-3 border-b border-black/20 pb-2">
				<h2 class="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
					{title}
				</h2>

				{#if headerActions}
					<div class="flex items-center gap-1 bg-black/20 rounded p-0.5 border border-black/40">
						{@render headerActions()}
					</div>
				{/if}
			</div>
		{/if}

		<div class="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
			{@render children()}
		</div>

	{/if}
</div>
