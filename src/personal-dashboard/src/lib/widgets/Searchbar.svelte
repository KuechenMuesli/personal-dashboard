<script lang="ts">
  import { onMount, tick } from "svelte";

  let { id, isEditing, showSettings = $bindable(false) } = $props<{
    id: string; isEditing: boolean; showSettings: boolean;
  }>();

  interface Engine {
    key: string;
    name: string;
    url: string;
    isDefault?: boolean;
  }

  interface Favorite {
    name: string;
    url: string;
  }

  const INITIAL_ENGINES: Engine[] = [
    { key: "DEFAULT", name: "Google", url: "https://www.google.com/search?q={query}", isDefault: true },
    { key: "!gi", name: "Images", url: "https://www.google.com/search?tbm=isch&q={query}" },
    { key: "!gsc", name: "Scholar", url: "https://scholar.google.com/scholar?q={query}" },
    { key: "!a", name: "Google AI", url: "https://www.google.com/search?q={query}&udm=50" },
    { key: "!r", name: "Reddit", url: "https://www.reddit.com/search/?q={query}" },
    { key: "!w", name: "Wikipedia", url: "https://de.wikipedia.org/wiki/{query}" },
    { key: "!y", name: "Youtube", url: "https://www.youtube.com/results?search_query={query}" },
  ];

  let query = $state("");
  let engines = $state<Engine[]>([]);
  let allFavorites = $state<Favorite[]>([]);
  let dialogEl: HTMLDialogElement;
  let searchInput = $state<HTMLInputElement | null>(null);
  let wrapperEl = $state<HTMLDivElement | null>(null);

  let isFocused = $state(false);
  let selectedIndex = $state(-1);
  let dropdownStyle = $state("");

  const activeEngine = $derived.by(() => {
    const trimmed = query.trim();
    const defaultEngine = engines.find(e => e.isDefault) || INITIAL_ENGINES[0];

    if (!trimmed) return defaultEngine;

    const shortcuts = engines
      .filter(e => !e.isDefault)
      .sort((a, b) => b.key.length - a.key.length);

    for (const engine of shortcuts) {
      if (trimmed.includes(engine.key)) {
        return engine;
      }
    }

    return defaultEngine;
  });

  const suggestions = $derived.by(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed || trimmed.startsWith('!')) return [];

    return allFavorites
      .filter(f => f.name.toLowerCase().includes(trimmed) || f.url.toLowerCase().includes(trimmed))
      .slice(0, 5);
  });

  $effect(() => {
    query;
    selectedIndex = -1;
  });

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      }
    };
  }

  function updateDropdownPosition() {
    if (!wrapperEl) return;
    const rect = wrapperEl.getBoundingClientRect();
    dropdownStyle = `
      position: fixed;
      top: ${rect.bottom + 6}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      z-index: 99999;
    `;
  }

  $effect(() => {
    if (isFocused && suggestions.length > 0) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  });

  onMount(async () => {
    await tick();
    const firstSearch = document.querySelector('input[placeholder="Search..."]') as HTMLInputElement;
    if (firstSearch) firstSearch.focus();

    const handleGlobalKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '') ||
        e.ctrlKey || e.metaKey || e.altKey || isEditing) return;
      if (e.key.length === 1) searchInput?.focus();
    };

    window.addEventListener('keydown', handleGlobalKey);

    loadFavorites();
    window.addEventListener('storage', loadFavorites);

    return () => {
      window.removeEventListener('keydown', handleGlobalKey);
      window.removeEventListener('storage', loadFavorites);
    };
  });

  function loadFavorites() {
    const loadedFavs: Favorite[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('favorites-settings-')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          if (parsed.favorites) {
            loadedFavs.push(...parsed.favorites);
          }
        } catch (e) { console.error("Fehler beim Parsen der Favoriten", e); }
      }
    }

    const unique = new Map<string, Favorite>();
    for (const fav of loadedFavs) {
      if (fav.url) unique.set(fav.url, fav);
    }
    allFavorites = Array.from(unique.values());
  }

  $effect(() => {
    if (!engines.length) {
      const saved = localStorage.getItem(`search-settings-${id}`);
      engines = saved ? JSON.parse(saved) : [...INITIAL_ENGINES];
    }
  });

  $effect(() => {
    if (showSettings) dialogEl?.showModal();
    else dialogEl?.close();
  });

  function saveSettings() {
    localStorage.setItem(`search-settings-${id}`, JSON.stringify(engines));
    showSettings = false;
  }

  function handleSearch() {
    const trimmed = query.trim();
    const isUrlExpression = /^(https?:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;

    if (activeEngine.isDefault && trimmed.match(isUrlExpression)) {
      const url = trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`;
      window.location.href = encodeURI(url);
      return;
    }

    if (!trimmed) return;

    const targetUrl = activeEngine.isDefault
      ? activeEngine.url.replace("{query}", encodeURIComponent(trimmed))
      : activeEngine.url.replace("{query}", encodeURIComponent(
        trimmed.replace(activeEngine.key, "").trim()
      ));

    if (targetUrl) window.location.href = targetUrl;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        window.location.href = suggestions[selectedIndex].url;
      } else {
        handleSearch();
      }
    }
  }
</script>

<div class="flex h-full w-full items-center px-2 font-sans">
	<div bind:this={wrapperEl} class="relative w-full">
		<div class="flex h-10 w-full overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl shadow-black/40 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50">
			<input
					bind:this={searchInput}
					type="text"
					bind:value={query}
					placeholder="Search..."
					class="min-w-0 flex-1 border-none bg-transparent px-3 text-[13px] text-white outline-none placeholder:text-neutral-500 focus:ring-0"
					onkeydown={handleKeydown}
					onfocus={() => isFocused = true}
					onblur={() => setTimeout(() => isFocused = false, 150)}
			/>
			<button
					onclick={handleSearch}
					class="flex h-full items-center justify-center border-l border-neutral-700 bg-neutral-800 px-4 text-[11px] font-bold uppercase tracking-wider text-neutral-300 transition-colors hover:bg-neutral-700 active:bg-neutral-600"
					aria-label="Search"
			>
				{activeEngine.name}
			</button>
		</div>
	</div>
</div>

{#if isFocused && suggestions.length > 0}
	<div
			use:portal
			style={dropdownStyle}
			class="overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-2xl shadow-black/80 font-sans"
	>
		{#each suggestions as fav, i}
			<button
					class="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors {i === selectedIndex ? 'bg-neutral-800' : 'hover:bg-neutral-800/60'}"
					onclick={() => window.location.href = fav.url}
			>
				<div class="flex min-w-0 flex-col pr-2">
					<span class="truncate text-[12px] font-semibold {i === selectedIndex ? 'text-white' : 'text-neutral-200'}">{fav.name}</span>
					<span class="truncate text-[10px] {i === selectedIndex ? 'text-blue-400' : 'text-neutral-500'}">{fav.url}</span>
				</div>
				<div class="shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] font-bold text-neutral-500">
					FAV
				</div>
			</button>
		{/each}
	</div>
{/if}

<dialog
		bind:this={dialogEl}
		class="fixed left-1/2 top-1/2 m-0 w-[95vw] max-w-[750px] -translate-x-1/2 -translate-y-1/2 rounded-xl border-none bg-neutral-900 p-0 text-white outline-none backdrop:bg-black/85 backdrop:backdrop-blur-sm"
		onclose={() => showSettings = false}
>
	<div class="flex max-h-[80vh] flex-col p-6">
		<header class="mb-5 flex items-center justify-between">
			<h3 class="text-base font-semibold">Search Shortcuts</h3>
			<button
					class="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
					onclick={() => engines.push({key: '!', name: 'New', url: ''})}
			>+ Add Engine</button>
		</header>

		<div class="flex flex-col gap-2 overflow-y-auto pr-1">
			{#each engines as engine, i}
				<div class="flex items-center gap-2.5 py-1 {engine.isDefault ? 'mb-2 border-b border-neutral-800 pb-3' : ''}">
					{#if engine.isDefault}
						<div class="flex w-20 shrink-0 items-center gap-1 text-[11px] font-bold text-neutral-500">
							<span>DEFAULT</span>
						</div>
					{:else}
						<div class="flex w-20 shrink-0 items-center gap-1">
							<button class="w-5 text-lg text-red-500 hover:text-red-400" onclick={() => engines.splice(i, 1)}>×</button>
							<input
									type="text"
									bind:value={engine.key}
									placeholder="!"
									class="w-[50px] rounded border border-neutral-700 bg-neutral-800 py-1.5 text-center font-mono text-sm outline-none focus:border-blue-500"
							/>
						</div>
					{/if}

					<input
							type="text"
							bind:value={engine.name}
							placeholder="Name (e.g. Google)"
							class="w-32 rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-[13px] outline-none focus:border-blue-500"
					/>

					<input
							type="text"
							bind:value={engine.url}
							placeholder="Search URL..."
							class="flex-1 rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-[13px] outline-none focus:border-blue-500"
					/>
				</div>
			{/each}
		</div>

		<footer class="mt-6 flex justify-end gap-3 border-t border-neutral-800 pt-4">
			<button class="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-400 hover:bg-neutral-800" onclick={() => showSettings = false}>Cancel</button>
			<button class="rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-500" onclick={saveSettings}>Save Changes</button>
		</footer>
	</div>
</dialog>
