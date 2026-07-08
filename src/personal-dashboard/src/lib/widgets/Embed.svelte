<script lang="ts">
  import { onMount } from "svelte";
  import { Settings } from "lucide-svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";

  let {
    id,
    showSettings = $bindable(false)
  } = $props<{
    id: string;
    showSettings: boolean;
  }>();

  let url = $state("");
  let title = $state("Web View");

  onMount(() => {
    const saved = localStorage.getItem(`webview-settings-${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        url = parsed.url || "";
        title = parsed.title || "Web View";
      } catch (e) { console.error(e); }
    }
  });

  function saveSettings() {
    localStorage.setItem(`webview-settings-${id}`, JSON.stringify({ url, title }));
    showSettings = false;
  }
</script>

{#snippet headerButtons()}
	<button
			onclick={(e) => { e.stopPropagation(); showSettings = true; }}
			class="h-5 w-5 flex items-center justify-center rounded text-neutral-500 hover:text-white hover:bg-black/40 transition-colors z-20"
			title="Settings"
	>
		<Settings size={12} strokeWidth={2.5} />
	</button>
{/snippet}

<WidgetCard
		title={title}
		bind:showSettings={showSettings}
		isConfigured={!!url}
		headerActions={headerButtons}
		padding={false}
>
	<div class="flex h-full w-full flex-col bg-white">
		{#if !url}
			<div class="flex h-full flex-col items-center justify-center p-4 text-center bg-neutral-900">
				<p class="mb-2 text-xs text-neutral-500">No URL Configured</p>
				<button
						onclick={() => showSettings = true}
						class="text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:text-blue-400"
				>
					Set Source URL
				</button>
			</div>
		{:else}
			<iframe
					src={url}
					{title}
					class="h-full w-full border-none bg-white"
					sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
					loading="lazy"
			></iframe>
		{/if}
	</div>
</WidgetCard>

<SettingsDialog 
	title="Webview Settings" 
	bind:show={showSettings} 
	data={[url, title]} 
	onRevert={(r: any) => { url = r[0]; title = r[1]; }} 
	onSave={saveSettings}
>
	<div class="space-y-4">
		<div class="space-y-1.5">
			<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="wv-title">Widget Label</label>
			<input
					id="wv-title"
					bind:value={title}
					placeholder="e.g. My Calendar"
					class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
					onkeydown={(e) => e.stopPropagation()}
			/>
		</div>

		<div class="space-y-1.5">
			<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="wv-url">Source URL</label>
			<input
					id="wv-url"
					bind:value={url}
					placeholder="https://..."
					class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
					onkeydown={(e) => e.stopPropagation()}
			/>
			<p class="text-[10px] text-neutral-500">Note: Some sites block being embedded (X-Frame-Options). Use "Embed" links where available.</p>
		</div>
	</div>
</SettingsDialog>
