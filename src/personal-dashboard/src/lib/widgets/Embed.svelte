<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { onMount, getContext } from "svelte";
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

  const getSecrets = getContext<() => Record<string, any>>('secrets');

  let url = $state("");
  let title = $state(i18n.t.w.embed.webView);

  $effect(() => {
    const secrets = getSecrets();
    if (secrets[id]) {
      const parsed = secrets[id];
      url = parsed.url || "";
      title = parsed.title || i18n.t.w.embed.webView;
    }
  });

  onMount(() => {
    const saved = localStorage.getItem(`webview-settings-${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        url = parsed.url || "";
        title = parsed.title || i18n.t.w.embed.webView;
      } catch (e) { console.error(e); }
    }
  });

  async function saveSettings() {
    localStorage.setItem(`webview-settings-${id}`, JSON.stringify({ url, title }));
    showSettings = false;
    
    try {
      await fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: id, key: { url, title } })
      });
    } catch (e) {}
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
				<p class="mb-2 text-xs text-neutral-500">{i18n.t.w.embed.noUrl}</p>
				<button
						onclick={() => showSettings = true}
						class="text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:text-blue-400"
				>
					{i18n.t.w.embed.setUrl}
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
	title="{i18n.t.w.embed.settings}" 
	bind:show={showSettings} 
	data={[url, title]} 
	onRevert={(r: any) => { url = r[0]; title = r[1]; }} 
	onSave={saveSettings}
>
	<div class="space-y-4">
		<div class="space-y-1.5">
			<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="wv-title">{i18n.t.w.embed.label}</label>
			<input
					id="wv-title"
					bind:value={title}
					placeholder="{i18n.t.w.embed.labelPlaceholder}"
					class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
					onkeydown={(e) => e.stopPropagation()}
			/>
		</div>

		<div class="space-y-1.5">
			<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="wv-url">{i18n.t.w.embed.sourceUrl}</label>
			<input
					id="wv-url"
					bind:value={url}
					placeholder={i18n.t.w.embed.urlPlaceholder}
					class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
					onkeydown={(e) => e.stopPropagation()}
			/>
			<p class="text-[10px] text-neutral-500">{i18n.t.w.embed.note}</p>
		</div>
	</div>
</SettingsDialog>
