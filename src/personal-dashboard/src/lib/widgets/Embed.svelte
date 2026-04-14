<script lang="ts">
  import { onMount } from "svelte";

  let {
    id,
    showSettings = $bindable(false)
  } = $props<{
    id: string;
    showSettings: boolean;
  }>();

  let url = $state("");
  let title = $state("Web View");
  let dialogEl = $state<HTMLDialogElement | null>(null);

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

  $effect(() => {
    if (showSettings && dialogEl) dialogEl.showModal();
    else if (dialogEl?.open) dialogEl.close();
  });
</script>

<div class="flex h-full w-full flex-col overflow-hidden rounded-xl bg-neutral-900 font-sans text-white">
	{#if !url}
		<div class="flex h-full flex-col items-center justify-center p-4 text-center">
			<p class="mb-2 text-xs text-neutral-500">No URL Configured</p>
			<button
					onclick={() => showSettings = true}
					class="text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:text-blue-400"
			>
				Set Source URL
			</button>
		</div>
	{:else}
		<div class="flex h-full w-full flex-col">
			<iframe
					src={url}
					{title}
					class="h-full w-full border-none bg-white"
					sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
					loading="lazy"
			></iframe>
		</div>
	{/if}
</div>

<dialog
		bind:this={dialogEl}
		class="fixed left-1/2 top-1/2 m-0 w-[90vw] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-800 bg-neutral-900 p-0 text-white shadow-2xl outline-none backdrop:bg-black/80 backdrop:backdrop-blur-sm"
		onclose={() => (showSettings = false)}
>
	<div class="flex flex-col gap-5 p-6">
		<header class="flex items-center justify-between">
			<h3 class="text-lg font-bold">Webview Settings</h3>
			<button class="text-2xl text-neutral-500 hover:text-white" onclick={() => (showSettings = false)}>&times;</button>
		</header>

		<div class="space-y-4">
			<div class="space-y-1.5">
				<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="wv-title">Widget Label</label>
				<input
						id="wv-title"
						bind:value={title}
						placeholder="e.g. My Calendar"
						class="w-full rounded-lg border border-neutral-800 bg-neutral-800 p-3 text-sm text-white outline-none focus:border-blue-500"
						onkeydown={(e) => e.stopPropagation()}
				/>
			</div>

			<div class="space-y-1.5">
				<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="wv-url">Source URL</label>
				<input
						id="wv-url"
						bind:value={url}
						placeholder="https://..."
						class="w-full rounded-lg border border-neutral-800 bg-neutral-800 p-3 text-sm text-white outline-none focus:border-blue-500"
						onkeydown={(e) => e.stopPropagation()}
				/>
				<p class="text-[10px] text-neutral-500">Note: Some sites block being embedded (X-Frame-Options). Use "Embed" links where available.</p>
			</div>
		</div>

		<footer class="mt-2 flex justify-end gap-2">
			<button class="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-800" onclick={() => (showSettings = false)}>Cancel</button>
			<button class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-500" onclick={saveSettings}>Save</button>
		</footer>
	</div>
</dialog>
