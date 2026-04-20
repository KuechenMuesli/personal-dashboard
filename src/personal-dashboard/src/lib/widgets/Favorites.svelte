<script lang="ts">
  import { ChevronUp, ChevronDown, Plus, X } from "lucide-svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";

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
    { name: "Reddit", url: "https://reddit.com", color: "#232323" },
    { name: "GitHub", url: "https://github.com", color: "#232323" },
    { name: "YouTube", url: "https://youtube.com", color: "#232323" }
  ];

  let favorites = $state<Favorite[]>([]);
  let displayMode = $state<"grid" | "list" | "auto">("auto");
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

<WidgetCard bind:showSettings={showSettings} isConfigured={true} padding={false} transparent={true}>
	<div class="h-full w-full box-border overflow-y-auto overflow-x-hidden p-2 sm:p-2 scrollbar-hide">
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
               {effectiveMode === 'list' ? 'gap-2.5 bg-[#262626] hover:bg-[#1c1c1c] border border-transparent hover:border-black/40 p-1.5 rounded-lg' : 'flex-col gap-1'}"
						title={fav.name}
				>
					<div
							class="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-lg border border-black/20"
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

					<span class="truncate text-slate-400 group-hover:text-slate-200 transition-colors
                   {effectiveMode === 'list' ? 'flex-1 text-[11px] text-left' : 'w-full text-center text-[10px]'}">
           {fav.name}
       </span>
				</a>
			{/each}
		</div>
	</div>
</WidgetCard>

<SettingsDialog title="Edit Favorites" bind:show={showSettings} onSave={saveSettings}>
	<div class="flex flex-col gap-5">

		<div class="flex items-center justify-between">
			<div class="flex bg-black/40 p-0.5 rounded-lg border border-black/20">
				{#each ["auto", "grid", "list"] as mode}
					<button
							onclick={() => displayMode = mode as any}
							class="px-3 py-1.5 text-[9px] font-black rounded uppercase transition-all
                 {displayMode === mode ? 'bg-white/10 text-slate-200 shadow-sm' : 'text-neutral-500 hover:text-white'}"
					>
						{mode}
					</button>
				{/each}
			</div>
			<button
					class="flex items-center gap-1.5 rounded-lg bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-black/60 transition-colors border border-black/20"
					onclick={() => favorites.push({name: '', url: '', color: '#232323'})}
			>
				<Plus size={12} strokeWidth={2.5} /> ADD
			</button>
		</div>

		<div class="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
			{#each favorites as fav, i}
				<div class="flex items-center gap-2 bg-neutral-900 p-2 rounded-xl border border-black/40">

					<div class="flex flex-col gap-1">
						<button disabled={i === 0} onclick={() => move(i, 'up')} class="text-neutral-500 disabled:opacity-20 hover:text-blue-400 transition-colors">
							<ChevronUp size={14} strokeWidth={2.5} />
						</button>
						<button disabled={i === favorites.length - 1} onclick={() => move(i, 'down')} class="text-neutral-500 disabled:opacity-20 hover:text-blue-400 transition-colors">
							<ChevronDown size={14} strokeWidth={2.5} />
						</button>
					</div>

					<input type="color" bind:value={fav.color} class="h-8 w-8 shrink-0 cursor-pointer rounded border border-black/40 bg-neutral-900" />
					<input type="text" bind:value={fav.name} placeholder="Name" class="w-20 rounded-lg border border-black/40 bg-black/30 p-2 text-xs text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" />
					<input type="text" bind:value={fav.url} placeholder="https://..." class="flex-1 rounded-lg border border-black/40 bg-black/30 p-2 text-xs text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" />

					<button class="p-1 text-neutral-600 hover:text-red-500 transition-colors" onclick={() => favorites.splice(i, 1)}>
						<X size={16} strokeWidth={2.5} />
					</button>

				</div>
			{/each}
		</div>

	</div>
</SettingsDialog>

<style>
  .scrollbar-hide::-webkit-scrollbar { display: none; }
</style>
