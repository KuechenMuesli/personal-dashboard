<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    isConfigured = true,
    padding = true,
    transparent = false, // <-- NEW: Added transparent toggle
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
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
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
