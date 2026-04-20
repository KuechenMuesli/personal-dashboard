<script lang="ts">
  import { onMount, tick } from "svelte";
  import {Check, Plus, Search, X} from "lucide-svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";

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

  interface SuggestionItem {
    id: string;
    title: string;
    subtitle: string;
    badge: string;
    action: () => void;
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

  const UNIT_CATEGORIES: Record<string, { factors: Record<string, number> }> = {
    length: {
      factors: { m: 1, km: 1000, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 }
    },
    weight: {
      factors: { g: 1, kg: 1000, mg: 0.001, oz: 28.349523, lb: 453.59237, lbs: 453.59237 }
    },
    volume: {
      factors: { l: 1, ml: 0.001, gal: 3.78541, floz: 0.0295735 }
    },
    time: {
      factors: { ms: 0.001, s: 1, sec: 1, min: 60, h: 3600, hr: 3600, d: 86400, day: 86400, w: 604800, wk: 604800, mo: 2592000, month: 2592000, y: 31536000, yr: 31536000, year: 31536000 }
    }
  };

  const TEMPERATURE: Record<string, Record<string, (v: number) => number>> = {
    c: { c: v=>v, f: v=>(v*9/5)+32, k: v=>v+273.15 },
    f: { c: v=>(v-32)*5/9, f: v=>v, k: v=>(v-32)*5/9+273.15 },
    k: { c: v=>v-273.15, f: v=>(v-273.15)*9/5+32, k: v=>v }
  };

  function getUnitInfo(unit: string) {
    if (TEMPERATURE[unit]) return { category: 'temperature' };
    for (const [category, data] of Object.entries(UNIT_CATEGORIES)) {
      if (data.factors[unit]) return { category, factor: data.factors[unit] };
    }
    return null;
  }

  function getAllCategoryUnits(unit: string): string[] {
    const info = getUnitInfo(unit);
    if (!info) return [];
    if (info.category === 'temperature') {
      return Object.keys(TEMPERATURE[unit]).filter(u => u !== unit);
    }
    return Object.keys(UNIT_CATEGORIES[info.category].factors).filter(u => u !== unit);
  }

  const PREDICTIONS: Record<string, string[]> = {
    kg: ['lb', 'g'], g: ['oz', 'kg'], mg: ['g'], oz: ['g'], lb: ['kg'], lbs: ['kg'],
    m: ['ft', 'cm'], cm: ['in', 'm'], mm: ['in', 'cm'], in: ['cm'], ft: ['m'], yd: ['m'], mi: ['km'], km: ['mi'],
    c: ['f'], f: ['c'],
    l: ['gal', 'ml'], ml: ['l', 'floz'], gal: ['l'],
    ms: ['s'], s: ['min', 'ms'], sec: ['min'], min: ['s', 'h'], h: ['min', 'd'], hr: ['min'], d: ['h', 'w'], day: ['h'], w: ['d', 'mo'], mo: ['w', 'y'], y: ['mo']
  };

  let query = $state("");
  let engines = $state<Engine[]>([]);
  let allFavorites = $state<Favorite[]>([]);
  let dialogEl: HTMLDialogElement;
  let searchInput = $state<HTMLInputElement | null>(null);
  let wrapperEl = $state<HTMLDivElement | null>(null);

  let isFocused = $state(false);
  let selectedIndex = $state(-1);
  let dropdownStyle = $state("");
  let copiedId = $state<string | null>(null);

  const activeEngine = $derived.by(() => {
    const trimmed = query.trim();
    const defaultEngine = engines.find(e => e.isDefault) || INITIAL_ENGINES[0];
    if (!trimmed) return defaultEngine;

    const shortcuts = engines
      .filter(e => !e.isDefault)
      .sort((a, b) => b.key.length - a.key.length);

    for (const engine of shortcuts) {
      if (trimmed.includes(engine.key)) return engine;
    }
    return defaultEngine;
  });

  function formatNumber(num: number): string {
    if (Number.isInteger(num)) return num.toString();
    return Number(num.toPrecision(7)).toString().replace('.', ',');
  }

  function evaluateMath(input: string): string | null {
    let s = input.toLowerCase().replace(/,/g, '.').trim();
    const mathKeywords = ['sqrt', 'sin', 'cos', 'tan', 'log', 'abs', 'pi'];

    const hasOperator = /[\+\-\*\/\^\%]/.test(s);
    const hasKeyword = mathKeywords.some(kw => s.includes(kw));

    if (!hasOperator && !hasKeyword) return null;

    s = s.replace(/\^/g, '**');
    mathKeywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'g');
      s = s.replace(regex, kw === 'pi' ? 'Math.PI' : `Math.${kw}`);
    });

    const securityCheck = s.replace(/Math\.(sqrt|sin|cos|tan|log|abs|PI)/g, '');
    if (!/^[\d\+\-\*\/\(\)\.\s\%]+$/.test(securityCheck)) return null;

    try {
      const res = new Function(`return ${s}`)();
      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        return formatNumber(res);
      }
    } catch { return null; }
    return null;
  }

  function calculateConversion(val: number, fromUnit: string, toUnit: string): string | null {
    const fromInfo = getUnitInfo(fromUnit);
    const toInfo = getUnitInfo(toUnit);

    if (!fromInfo || !toInfo || fromInfo.category !== toInfo.category) return null;

    let res: number;
    if (fromInfo.category === 'temperature') {
      res = TEMPERATURE[fromUnit][toUnit](val);
    } else {
      const valueInBase = val * fromInfo.factor!;
      res = valueInBase / toInfo.factor!;
    }

    return formatNumber(res);
  }

  function evaluateConversion(input: string): { val: string, unit: string }[] {
    const results: { val: string, unit: string }[] = [];
    const trimmed = input.trim();

    const explicitMatch = trimmed.match(/^([\d\.\,]+)\s*([a-zA-Z]+)\s+(in|to)\s*([a-zA-Z]*)$/i);
    if (explicitMatch) {
      const val = parseFloat(explicitMatch[1].replace(',', '.'));
      const fromUnit = explicitMatch[2].toLowerCase();
      const targetPrefix = explicitMatch[4].toLowerCase();

      if (!isNaN(val)) {
        const allUnits = getAllCategoryUnits(fromUnit);

        let targetUnits = targetPrefix
          ? allUnits.filter(u => u.startsWith(targetPrefix))
          : allUnits;

        targetUnits.sort((a, b) => a.length - b.length);

        const seenValues = new Set<string>();

        for (const toUnit of targetUnits) {
          const res = calculateConversion(val, fromUnit, toUnit);
          if (res !== null && !seenValues.has(res)) {
            seenValues.add(res);
            results.push({ val: res, unit: toUnit });
          }
        }
      }
      return results;
    }

    const implicitMatch = trimmed.match(/^([\d\.\,]+)\s*([a-zA-Z]+)$/i);
    if (implicitMatch) {
      const val = parseFloat(implicitMatch[1].replace(',', '.'));
      const fromUnit = implicitMatch[2].toLowerCase();

      if (!isNaN(val) && PREDICTIONS[fromUnit]) {
        const seenValues = new Set<string>();

        for (const toUnit of PREDICTIONS[fromUnit]) {
          const res = calculateConversion(val, fromUnit, toUnit);
          if (res !== null && !seenValues.has(res)) {
            seenValues.add(res);
            results.push({ val: res, unit: toUnit });
          }
        }
      }
    }

    return results;
  }

  const suggestions = $derived.by<SuggestionItem[]>(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.startsWith('!')) return [];

    const lower = trimmed.toLowerCase();
    const results: SuggestionItem[] = [];

    const mathRes = evaluateMath(trimmed);
    if (mathRes !== null) {
      results.push({
        id: 'math', title: `= ${mathRes}`, subtitle: 'Copy to clipboard', badge: 'CALC',
        action: async () => {
          await navigator.clipboard.writeText(mathRes);
          copiedId = 'math';
          setTimeout(() => copiedId = null, 1500);
        }
      });
    }

    const convResults = evaluateConversion(trimmed);
    for (const conv of convResults) {
      const uniqueId = `conv-${conv.unit}`;
      results.push({
        id: uniqueId, title: `= ${conv.val} ${conv.unit}`, subtitle: 'Copy to clipboard', badge: 'CONV',
        action: async () => {
          await navigator.clipboard.writeText(conv.val);
          copiedId = uniqueId;
          setTimeout(() => copiedId = null, 1500);
        }
      });
    }

    const favs = allFavorites
      .filter(f => f.name.toLowerCase().includes(lower) || f.url.toLowerCase().includes(lower))
      .slice(0, 5)
      .map((f, i) => ({
        id: `fav-${i}`, title: f.name, subtitle: f.url, badge: 'FAV',
        action: () => { window.location.href = f.url; }
      }));

    return [...results, ...favs];
  });

  $effect(() => { query; selectedIndex = -1; });

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy() { node.remove(); } };
  }

  function updateDropdownPosition() {
    if (!wrapperEl) return;
    const rect = wrapperEl.getBoundingClientRect();
    dropdownStyle = `position: fixed; top: ${rect.bottom + 6}px; left: ${rect.left}px; width: ${rect.width}px; z-index: 99999;`;
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
          if (parsed.favorites) loadedFavs.push(...parsed.favorites);
        } catch (e) {}
      }
    }
    const unique = new Map<string, Favorite>();
    for (const fav of loadedFavs) { if (fav.url) unique.set(fav.url, fav); }
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
      : activeEngine.url.replace("{query}", encodeURIComponent(trimmed.replace(activeEngine.key, "").trim()));

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
        suggestions[selectedIndex].action();
      } else {
        handleSearch();
      }
    }
  }
</script>

<WidgetCard bind:showSettings={showSettings} isConfigured={true} padding={false} transparent={true}>
	<div class="flex h-full w-full items-center px-2 sm:px-3 font-sans">
		<div bind:this={wrapperEl} class="relative w-full">

			<div class="flex h-10 w-full overflow-hidden rounded-xl border border-neutral-600 bg-[#1c1c1c] shadow-xl focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">

				<div class="flex items-center pl-3 pr-1 text-neutral-500 bg-black/20">
					<Search size={14} strokeWidth={2.5} />
				</div>

				<input
						bind:this={searchInput}
						type="text"
						bind:value={query}
						placeholder="Search, Calculate or Convert..."
						class="min-w-0 flex-1 border-none bg-black/20 px-2 text-[13px] text-white outline-none placeholder:text-neutral-500 focus:ring-0"
						onkeydown={handleKeydown}
						onfocus={() => isFocused = true}
						onblur={() => setTimeout(() => isFocused = false, 150)}
				/>

				<button
						onclick={handleSearch}
						class="flex h-full items-center justify-center border-l border-black/40 bg-neutral-800 px-4 text-[10px] font-bold uppercase tracking-wider text-neutral-400 transition-colors hover:bg-black/40 hover:text-white active:bg-black/60"
						aria-label="Search"
				>
					{activeEngine?.name || 'Search'}
				</button>
			</div>

		</div>
	</div>
</WidgetCard>

{#if isFocused && suggestions.length > 0}
	<div
			use:portal
			style={dropdownStyle}
			class="overflow-hidden rounded-xl border border-black/40 bg-[#1c1c1c] shadow-2xl font-sans z-[99999]"
	>
		{#each suggestions as item, i}
			<button
					class="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors {i === selectedIndex ? 'bg-black/40' : 'hover:bg-black/20'}"
					onclick={() => item.action()}
			>
				<div class="flex min-w-0 flex-col pr-2">
      <span class="truncate text-[12px] font-semibold {i === selectedIndex ? 'text-white' : 'text-slate-300'}">
        {item.title}
      </span>
					<span class="flex items-center gap-1 truncate text-[10px] {i === selectedIndex ? 'text-blue-400' : (item.badge === 'FAV' ? 'text-neutral-500' : 'text-emerald-500')}">
        {#if copiedId === item.id}
          <Check size={10} strokeWidth={3} /> Copied!
        {:else}
          {item.subtitle}
        {/if}
      </span>
				</div>
				<div class="shrink-0 rounded-md bg-black/30 border border-black/20 px-1.5 py-0.5 text-[8px] font-bold tracking-wider {item.badge === 'FAV' ? 'text-neutral-500' : 'text-emerald-400'}">
					{item.badge}
				</div>
			</button>
		{/each}
	</div>
{/if}

<SettingsDialog title="Search Shortcuts" bind:show={showSettings} onSave={saveSettings}>
	<div class="flex flex-col gap-4">

		<div class="flex justify-end">
			<button
					class="flex items-center gap-1.5 rounded-lg bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-black/60 transition-colors border border-black/20"
					onclick={() => engines.push({key: '!', name: 'New', url: ''})}
			>
				<Plus size={12} strokeWidth={2.5} /> ADD ENGINE
			</button>
		</div>

		<div class="flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
			{#each engines as engine, i}
				<div class="flex items-center gap-2.5 py-2 {engine.isDefault ? 'mb-2 border-b border-black/40 pb-4' : ''}">

					{#if engine.isDefault}
						<div class="flex w-20 shrink-0 items-center justify-center gap-1 text-[9px] font-black tracking-widest text-neutral-500 bg-black/20 py-1.5 rounded-md border border-black/10">
							DEFAULT
						</div>
					{:else}
						<div class="flex w-20 shrink-0 items-center gap-1.5">
							<button class="text-neutral-600 hover:text-red-500 transition-colors" onclick={() => engines.splice(i, 1)}>
								<X size={16} strokeWidth={2.5} />
							</button>
							<input
									type="text"
									bind:value={engine.key}
									placeholder="!"
									class="w-full rounded-lg border border-black/40 bg-neutral-900 py-1.5 text-center font-mono text-xs text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
							/>
						</div>
					{/if}

					<input
							type="text"
							bind:value={engine.name}
							placeholder="Name (e.g. Google)"
							class="w-28 rounded-lg border border-black/40 bg-neutral-900 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
					/>

					<input
							type="text"
							bind:value={engine.url}
							placeholder="Search URL..."
							class="flex-1 rounded-lg border border-black/40 bg-neutral-900 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
					/>
				</div>
			{/each}
		</div>

	</div>
</SettingsDialog>
