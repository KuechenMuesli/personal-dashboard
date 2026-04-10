<script lang="ts">
  let { id, isEditing, showSettings = $bindable(false) } = $props<{
    id: string, isEditing: boolean, showSettings: boolean
  }>();

  interface Engine { key: string; url: string; isDefault?: boolean; }

  const INITIAL_ENGINES: Engine[] = [
    { key: "DEFAULT", url: "https://www.google.com/search?q={query}", isDefault: true },
    { key: "!gi", url: "https://www.google.com/search?tbm=isch&q={query}" },
    { key: "!gsc", url: "https://scholar.google.com/scholar?q={query}" },
    { key: "!a", url: "https://www.google.com/search?q={query}&udm=14" }
  ];

  let query = $state("");
  let engines = $state<Engine[]>([]);
  let dialogEl: HTMLDialogElement;

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
    if (!trimmed) return;

    const engineMap = Object.fromEntries(engines.map(e => [e.key, e.url]));
    const defaultEngine = engines.find(e => e.isDefault) || INITIAL_ENGINES[0];

    const shortcutKeys = Object.keys(engineMap)
      .filter(k => k !== "DEFAULT")
      .sort((a, b) => b.length - a.length);

    let targetUrl = "";
    let foundShortcut = null;

    for (const key of shortcutKeys) {
      if (trimmed.includes(key)) {
        foundShortcut = key;
        break;
      }
    }

    if (foundShortcut) {
      const searchTerms = trimmed
        .replace(foundShortcut, " ")
        .split(/\s+/)
        .filter(Boolean)
        .join(" ");
      targetUrl = engineMap[foundShortcut].replace("{query}", encodeURIComponent(searchTerms));
    } else {
      targetUrl = defaultEngine.url.replace("{query}", encodeURIComponent(trimmed));
    }

    if (targetUrl) window.location.href = targetUrl;
  }
</script>

<div class="flex h-full w-full items-center px-2 font-sans">
	<div class="flex h-10 w-full overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl shadow-black/40 focus-within:ring-1 focus-within:ring-blue-500/50 focus-within:border-blue-500/50">
		<input
				type="text"
				bind:value={query}
				placeholder="Search..."
				class="min-w-0 flex-1 bg-transparent px-3 text-[13px] text-white border-none outline-none focus:ring-0 placeholder:text-neutral-500"
				onkeydown={(e) => e.key === 'Enter' && handleSearch()}
		/>
		<button
				onclick={handleSearch}
				class="flex aspect-square h-full items-center justify-center bg-neutral-800 text-white transition-colors hover:bg-neutral-700 active:bg-neutral-600"
				aria-label="Search"
		>
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
			</svg>
		</button>
	</div>
</div>

<dialog
		bind:this={dialogEl}
		class="fixed left-1/2 top-1/2 m-0 w-[95vw] max-w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-xl border-none bg-neutral-900 p-0 text-white outline-none backdrop:bg-black/85 backdrop:backdrop-blur-sm"
		onclose={() => showSettings = false}
>
	<div class="flex max-h-[80vh] flex-col p-6">
		<header class="mb-5 flex items-center justify-between">
			<h3 class="text-base font-semibold">Search Shortcuts</h3>
			<button
					class="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
					onclick={() => engines.push({key: '!', url: ''})}
			>
				+ Add
			</button>
		</header>

		<div class="flex flex-col gap-2 overflow-y-auto pr-1">
			{#each engines as engine, i}
				<div class="flex items-center gap-2.5 py-1 {engine.isDefault ? 'mb-2 border-b border-neutral-800 pb-3' : ''}">
					{#if engine.isDefault}
						<div class="flex w-20 shrink-0 items-center gap-1 text-[11px] font-bold text-blue-500">
							<span class="text-[10px]">🔒</span>
							<span>DEF</span>
						</div>
					{:else}
						<div class="flex w-20 shrink-0 items-center gap-1">
							<button
									class="w-5 text-lg text-red-500 hover:text-red-400"
									onclick={() => engines.splice(i, 1)}
							>
								×
							</button>
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
							bind:value={engine.url}
							placeholder="Search URL..."
							class="flex-1 rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-[13px] outline-none focus:border-blue-500"
					/>
				</div>
			{/each}
		</div>

		<footer class="mt-6 flex justify-end gap-3 border-t border-neutral-800 pt-4">
			<button
					class="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-400 hover:bg-neutral-800"
					onclick={() => showSettings = false}
			>
				Cancel
			</button>
			<button
					class="rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
					onclick={saveSettings}
			>
				Save Changes
			</button>
		</footer>
	</div>
</dialog>
