<script lang="ts">
  let { id, isEditing, height, width, showSettings = $bindable(false) } = $props<{
    id: string;
    isEditing: boolean;
    height: number;
    width: number;
    showSettings: boolean;
  }>();

  interface Favorite {
    name: string;
    url: string;
    color: string;
  }

  const DEFAULT_FAVORITES: Favorite[] = [
    { name: "Reddit", url: "https://reddit.com", color: "rgb(35, 35, 35)" },
    { name: "GitHub", url: "https://github.com", color: "rgb(35, 35, 35)" },
    { name: "YouTube", url: "https://youtube.com", color: "rgb(35, 35, 35)" }
  ];

  let favorites = $state<Favorite[]>([]);
  let displayMode = $state<"grid" | "list" | "auto">("auto");
  let dialogEl: HTMLDialogElement;
  let failedImages = $state(new Set<string>());

  const isAutoCompact = $derived(height === 1 || (favorites.length > width * 1.5 && width < 4));
  const effectiveMode = $derived(displayMode === "auto" ? (isAutoCompact ? "list" : "grid") : displayMode);

  const listColumns = $derived(width >= 5 ? 3 : width >= 2 ? 2 : 1);

  $effect(() => {
    if (!favorites.length) {
      const saved = localStorage.getItem(`favorites-settings-${id}`);
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed) {
        favorites = parsed.favorites || [...DEFAULT_FAVORITES];
        displayMode = parsed.displayMode || "auto";
      } else {
        favorites = [...DEFAULT_FAVORITES];
      }
    }
  });

  $effect(() => {
    if (showSettings) dialogEl?.showModal();
    else dialogEl?.close();
  });

  function saveSettings() {
    localStorage.setItem(`favorites-settings-${id}`, JSON.stringify({ favorites, displayMode }));
    showSettings = false;
  }

  function getIcon(url: string) {
    try {
      const domain = new URL(url).hostname;
      return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    } catch { return ""; }
  }

  function handleImageError(url: string) {
    failedImages.add(url);
  }

  function move(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= favorites.length) return;
    const item = favorites[index];
    favorites.splice(index, 1);
    favorites.splice(newIndex, 0, item);
  }
</script>

<div class="h-full w-full box-border overflow-y-auto overflow-x-hidden p-2 scrollbar-hide">
	<div
			class="grid gap-x-3 gap-y-2 w-full"
			style="
      grid-template-columns: {effectiveMode === 'list' ? `repeat(${listColumns}, minmax(0, 1fr))` : `repeat(auto-fill, minmax(64px, 1fr))`};
      align-content: start;
    "
	>
		{#each favorites as fav}
			<a
					href={fav.url}
					class="group flex items-center no-underline transition-all active:scale-95 w-full overflow-hidden
              {effectiveMode === 'list' ? 'gap-2.5 bg-white/5 p-1 rounded-lg' : 'flex-col gap-1.5 p-1'}"
					title={fav.name}
			>
				<div
						class="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-lg"
						style="
          background-color: {fav.color};
          width: {effectiveMode === 'list' ? '24px' : '44px'};
          height: {effectiveMode === 'list' ? '24px' : '44px'};
        "
				>
					{#if failedImages.has(fav.url) || !fav.url}
          <span class="{effectiveMode === 'list' ? 'text-[10px]' : 'text-lg'} font-bold uppercase text-white">
            {fav.name.charAt(0)}
          </span>
					{:else}
						<img
								src={getIcon(fav.url)}
								alt=""
								class="h-full w-full object-contain p-1.5"
								onerror={() => handleImageError(fav.url)}
						/>
					{/if}
				</div>

				<span class="truncate text-slate-400 group-hover:text-white transition-colors
                  {effectiveMode === 'list' ? 'flex-1 text-[11px] text-left' : 'w-full text-center text-[10px]'}">
          {fav.name}
      </span>
			</a>
		{/each}
	</div>
</div>

<dialog
		bind:this={dialogEl}
		class="fixed left-1/2 top-1/2 m-0 w-[95vw] max-w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-none bg-neutral-900 p-0 text-white outline-none backdrop:bg-black/85 backdrop:backdrop-blur-sm"
		onclose={() => showSettings = false}
>
	<div class="p-6">
		<header class="mb-5 flex items-center justify-between">
			<div class="flex flex-col gap-2">
				<h3 class="text-xs font-black uppercase tracking-widest text-neutral-500">Edit Favorites</h3>
				<div class="flex bg-neutral-800 p-1 rounded-lg">
					{#each ["auto", "grid", "list"] as mode}
						<button
								onclick={() => displayMode = mode as any}
								class="px-3 py-1 text-[9px] font-black rounded uppercase transition-all
                  {displayMode === mode ? 'bg-neutral-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}"
						>
							{mode}
						</button>
					{/each}
				</div>
			</div>
			<button
					class="rounded-lg bg-neutral-800 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-700 transition-colors"
					onclick={() => favorites.push({name: '', url: '', color: 'rgb(35, 35, 35)'})}
			>
				+ ADD SITE
			</button>
		</header>

		<div class="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-2 custom-scroll">
			{#each favorites as fav, i}
				<div class="flex items-center gap-2 bg-neutral-800/30 p-2 rounded-xl">
					<div class="flex flex-col gap-0.5">
						<button disabled={i === 0} onclick={() => move(i, 'up')} class="text-[10px] disabled:opacity-20 hover:text-blue-400">▲</button>
						<button disabled={i === favorites.length - 1} onclick={() => move(i, 'down')} class="text-[10px] disabled:opacity-20 hover:text-blue-400">▼</button>
					</div>

					<input type="color" bind:value={fav.color} class="h-8 w-8 shrink-0 cursor-pointer rounded border-none bg-transparent" />
					<input type="text" bind:value={fav.name} placeholder="Name" class="w-20 rounded bg-neutral-900 p-2 text-xs text-white outline-none" />
					<input type="text" bind:value={fav.url} placeholder="https://..." class="flex-1 rounded bg-neutral-900 p-2 text-xs text-white outline-none" />
					<button class="px-2 text-neutral-600 hover:text-red-500 transition-colors" onclick={() => favorites.splice(i, 1)}>×</button>
				</div>
			{/each}
		</div>

		<footer class="mt-6 flex justify-end gap-3 pt-4 border-t border-neutral-800">
			<button class="px-4 py-2 text-sm text-neutral-500 hover:text-white" onclick={() => showSettings = false}>Cancel</button>
			<button class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-500" onclick={saveSettings}>Save</button>
		</footer>
	</div>
</dialog>

<style>
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .custom-scroll::-webkit-scrollbar { width: 4px; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
</style>
