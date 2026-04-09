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

    // Get all shortcut keys (excluding DEFAULT), sorted by length descending
    // Sorting prevents "!g" matching inside "!gsc"
    const shortcutKeys = Object.keys(engineMap)
      .filter(k => k !== "DEFAULT")
      .sort((a, b) => b.length - a.length);

    let targetUrl = "";
    let foundShortcut = null;

    // Search for the shortcut anywhere in the string
    for (const key of shortcutKeys) {
      if (trimmed.includes(key)) {
        foundShortcut = key;
        break;
      }
    }

    if (foundShortcut) {
      // Replace only the FIRST occurrence of the shortcut with a space
      // Then clean up extra whitespace
      const searchTerms = trimmed
        .replace(foundShortcut, " ")
        .split(/\s+/)
        .filter(Boolean)
        .join(" ");

      targetUrl = engineMap[foundShortcut].replace("{query}", encodeURIComponent(searchTerms));
    } else {
      // Fallback to DEFAULT
      targetUrl = defaultEngine.url.replace("{query}", encodeURIComponent(trimmed));
    }

    if (targetUrl) {
      window.location.href = targetUrl;
    }
  }
</script>

<div class="search-widget">
	<div class="search-input-group">
		<input
				type="text"
				bind:value={query}
				placeholder="Search..."
				onkeydown={(e) => e.key === 'Enter' && handleSearch()}
		/>
		<button onclick={handleSearch} class="search-btn">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
		</button>
	</div>
</div>

<dialog bind:this={dialogEl} class="centered-dialog" onclose={() => showSettings = false}>
	<div class="settings-wrapper">
		<header>
			<h3>Search Shortcuts</h3>
			<button class="add-btn" onclick={() => engines.push({key: '!', url: ''})}>+ Add</button>
		</header>

		<div class="engine-scroll">
			{#each engines as engine, i}
				<div class="row" class:default-row={engine.isDefault}>
					{#if engine.isDefault}
						<div class="key-container locked">
							<span class="lock-icon">🔒</span>
							<span class="key-text">DEF</span>
						</div>
					{:else}
						<div class="key-container">
							<button class="d-btn" onclick={() => engines.splice(i, 1)}>×</button>
							<input class="k-in" type="text" bind:value={engine.key} placeholder="!" />
						</div>
					{/if}

					<input class="u-in" type="text" bind:value={engine.url} placeholder="Search URL..." />
				</div>
			{/each}
		</div>

		<footer class="actions">
			<button class="cancel" onclick={() => showSettings = false}>Cancel</button>
			<button class="save" onclick={saveSettings}>Save Changes</button>
		</footer>
	</div>
</dialog>

<style>
  /* Widget Appearance */
  .search-widget { width: 100%; height: 100%; display: flex; align-items: center; padding: 0 5px; background: transparent; }
  .search-input-group { display: flex; flex: 1; background: #1e1e1e; border-radius: 6px; border: 1px solid #3a3a3a; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);}
  input { flex: 1; background: transparent; border: none; color: #fff; padding: 8px 12px; font-size: 13px; outline: none; }
  .search-btn { background: #3a3a3a; border: none; color: #fff; padding: 0 12px; cursor: pointer; }

  /* Dialog Layout */
  .centered-dialog {
    border: none; padding: 0; border-radius: 12px; background: #1e1e1e; color: white;
    width: 95vw; max-width: 650px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0;
  }
  .centered-dialog::backdrop { background: rgba(0,0,0,0.85); backdrop-filter: blur(4px); }
  .settings-wrapper { padding: 24px; display: flex; flex-direction: column; max-height: 80vh; }

  header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  h3 { margin: 0; font-size: 1rem; color: #ffffff; }

  .engine-scroll { overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }

  .row { display: flex; gap: 10px; align-items: center; padding: 4px 0; }
  .default-row { border-bottom: 1px solid #333; margin-bottom: 8px; padding-bottom: 12px; }

  .key-container { display: flex; align-items: center; width: 80px; flex-shrink: 0; gap: 4px; }
  .key-container.locked { color: #3b82f6; font-weight: bold; font-size: 12px; }

  .k-in {
    width: 50px !important;
    background: #2d2d2d !important;
    border: 1px solid #3a3a3a !important;
    text-align: center;
    border-radius: 4px;
    padding: 6px 2px !important;
    font-family: monospace;
  }

  .u-in {
    flex: 1 !important;
    background: #2d2d2d !important;
    border: 1px solid #3a3a3a !important;
    border-radius: 4px;
    padding: 6px 12px !important;
    font-size: 13px;
  }

  .d-btn { background: none; border: none; color: #ef4444; font-size: 18px; cursor: pointer; padding: 0; width: 20px; }
  .lock-icon { font-size: 10px; margin-right: 4px; }

  .add-btn { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; }
  .actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #333; }
  .cancel { background: transparent; border: 1px solid #333; color: #94a3b8; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
  .save { background: #059669; color: white; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; }
</style>
