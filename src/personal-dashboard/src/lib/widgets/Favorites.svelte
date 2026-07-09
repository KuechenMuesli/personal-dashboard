<script lang="ts">
  import { ChevronUp, ChevronDown, Plus, X, GripVertical, Search, Pencil } from "lucide-svelte";
  import * as icons from "lucide-svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import WidgetTabs from "$lib/components/WidgetTabs.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import DraggableList from "$lib/components/DraggableList.svelte";

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
    lucideIcon?: string;
  }

  const DEFAULT_FAVORITES: Favorite[] = [
    { name: "Reddit", url: "https://reddit.com", color: "#232323" },
    { name: "GitHub", url: "https://github.com", color: "#232323", lucideIcon: "Github" },
    { name: "YouTube", url: "https://youtube.com", color: "#232323", lucideIcon: "Youtube" }
  ];

  let favorites = $state<Favorite[]>([]);
  let displayMode = $state<"grid" | "list" | "auto">("auto");
  let failedImages = $state(new Set<string>());
  let draggedIndex = $state<number | null>(null);

  let showIconBrowser = $state(false);
  let iconBrowserSearch = $state("");
  let editingFavIndex = $state<number | null>(null);
  let iconBrowserDialog = $state<HTMLDialogElement | null>(null);

  $effect(() => {
    if (showIconBrowser && iconBrowserDialog && !iconBrowserDialog.open) {
      iconBrowserDialog.showModal();
    } else if (!showIconBrowser && iconBrowserDialog?.open) {
      iconBrowserDialog.close();
    }
  });

  const availableIcons = Object.keys(icons).filter(k => k !== 'createLucideIcon' && k !== 'default' && k !== 'Icon');
  const filteredIcons = $derived(
     availableIcons
        .filter(k => !iconBrowserSearch || k.toLowerCase().includes(iconBrowserSearch.toLowerCase()))
        .slice(0, 150)
  );

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

  // move is replaced by drag and drop
</script>

<WidgetCard bind:showSettings={showSettings} isConfigured={true} padding={false} transparent={true}>
	<div class="h-full w-full box-border overflow-y-auto overflow-x-hidden p-2 sm:p-2 scrollbar-hide">
		<div
				class="{effectiveMode === 'list' ? 'grid' : 'flex flex-wrap justify-center'} gap-x-3 gap-y-2 w-full"
				style="
       {effectiveMode === 'list' ? `grid-template-columns: repeat(${listColumns}, minmax(0, 1fr))` : ''};
       align-content: start;
     "
		>
			{#each favorites as fav}
				<a
						href={fav.url}
						class="group flex items-center no-underline transition-all active:scale-95 overflow-hidden
               {effectiveMode === 'list' ? 'w-full gap-2.5 bg-neutral-800 hover:bg-neutral-900 border border-transparent hover:border-black/40 p-1.5 rounded-lg' : 'w-[64px] flex-col gap-1'}"
						title={fav.name}
				>
					<div
							class="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-lg border border-black/20 bg-neutral-900 text-widget-text"
							style="
           {fav.color && fav.color !== '#232323' ? `background-color: ${fav.color};` : ''}
           width: {effectiveMode === 'list' ? '24px' : '44px'};
           height: {effectiveMode === 'list' ? '24px' : '44px'};
         "
					>
						{#if fav.lucideIcon && (icons as any)[fav.lucideIcon]}
							<svelte:component this={(icons as any)[fav.lucideIcon]} size={effectiveMode === 'list' ? 14 : 24} strokeWidth={2} />
						{:else if failedImages.has(fav.url) || !fav.url}
                           <span class="{effectiveMode === 'list' ? 'text-[10px]' : 'text-lg'} font-bold uppercase">
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

<SettingsDialog 
	title="Edit Favorites" 
	bind:show={showSettings} 
	data={[favorites, displayMode]} 
	onRevert={(r: any) => { favorites = r[0]; displayMode = r[1]; }} 
	onSave={saveSettings}
>
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

		<DraggableList 
			bind:items={favorites} 
			handleClass="drag-handle"
			listClass="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent"
			itemClass="flex items-center gap-2 bg-neutral-900 p-2 rounded-xl border border-black/40"
		>
			{#snippet children(fav, i)}
					<div class="drag-handle cursor-grab active:cursor-grabbing text-neutral-500 hover:text-white transition-colors shrink-0 px-1">
						<GripVertical size={16} strokeWidth={2.5} />
					</div>

					<div class="relative flex items-center shrink-0 group">
						<input type="color" bind:value={fav.color} class="h-8 w-8 cursor-pointer rounded border border-black/40 bg-neutral-900" />
						{#if fav.color !== '#232323'}
							<button 
								class="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
								onclick={() => fav.color = '#232323'}
								title="Reset color"
							>
								<X size={10} strokeWidth={3} />
							</button>
						{/if}
					</div>

					<button 
						class="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-black/40 bg-neutral-900 flex items-center justify-center group text-widget-text"
						onclick={() => { editingFavIndex = i; iconBrowserSearch = ''; showIconBrowser = true; }}
					>
						{#if fav.lucideIcon && (icons as any)[fav.lucideIcon]}
							<svelte:component this={(icons as any)[fav.lucideIcon]} size={16} strokeWidth={2} />
						{:else if failedImages.has(fav.url) || !fav.url}
							<span class="text-[10px] font-bold uppercase">{fav.name.charAt(0)}</span>
						{:else}
							<img src={getIcon(fav.url)} alt="" class="h-5 w-5 object-contain" onerror={() => handleImageError(fav.url)} />
						{/if}

						<div class="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
							<Pencil size={12} strokeWidth={2.5} class="text-white" />
						</div>
					</button>

					<input type="text" bind:value={fav.name} placeholder="Name" class="w-20 rounded-lg border border-black/40 bg-black/30 p-2 text-xs text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" />
					<input type="text" bind:value={fav.url} placeholder="https://..." class="flex-1 rounded-lg border border-black/40 bg-black/30 p-2 text-xs text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" />

					<button class="p-1 text-neutral-600 hover:text-red-500 transition-colors" onclick={() => favorites.splice(i, 1)}>
						<X size={16} strokeWidth={2.5} />
					</button>
			{/snippet}
		</DraggableList>

	</div>
</SettingsDialog>

<dialog 
  bind:this={iconBrowserDialog}
  class="m-auto w-[90vw] max-w-lg rounded-xl bg-neutral-900 border border-black/40 p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-in open:fade-in-0 open:zoom-in-95"
  onclose={() => showIconBrowser = false}
  onclick={(e) => { if (e.target === iconBrowserDialog) showIconBrowser = false; }}
>
  <div class="flex flex-col w-full h-[65vh] overflow-hidden">
	<div class="p-3 border-b border-black/20 flex items-center gap-3 bg-black/20 shrink-0">
	   <Search size={16} class="text-neutral-500 shrink-0" />
	   <input type="text" bind:value={iconBrowserSearch} placeholder="Search icons..." class="flex-1 bg-transparent text-sm font-medium text-white outline-none min-w-0" autofocus />
	   <button class="p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0" onclick={() => showIconBrowser = false}><X size={16}/></button>
	</div>
	<div class="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
	   <button 
		 class="w-full mb-4 py-2.5 px-3 bg-black/20 hover:bg-black/40 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-colors border border-black/20 flex items-center justify-center gap-2"
		 onclick={() => { 
			if (editingFavIndex !== null) {
			   favorites[editingFavIndex].lucideIcon = '';
			}
			showIconBrowser = false; 
		 }}
	   >
		 Auto-Fetch Website Favicon
	   </button>
	   <div class="grid grid-cols-6 sm:grid-cols-8 gap-3 content-start">
		   {#each filteredIcons as iconName}
			 <button class="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg hover:bg-white/10 transition-colors group border border-transparent hover:border-white/10"
				onclick={() => {
				   if (editingFavIndex !== null) {
					   favorites[editingFavIndex].lucideIcon = iconName;
				   }
				   showIconBrowser = false;
				}}
				title={iconName}
			 >
				<svelte:component this={(icons as any)[iconName]} size={20} class="text-neutral-400 group-hover:text-white transition-colors" />
			 </button>
		   {/each}
	   </div>
	   {#if filteredIcons.length === 0}
		 <div class="w-full py-10 text-center text-sm font-medium text-neutral-500">No icons found.</div>
	   {/if}
	</div>
  </div>
</dialog>

<style>
  .scrollbar-hide::-webkit-scrollbar { display: none; }
</style>
