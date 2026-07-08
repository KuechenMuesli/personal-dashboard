<script lang="ts">
  import { onMount, tick } from "svelte";
  import {Check, Plus, Search, X, Trash2} from "lucide-svelte";
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
    expandable?: boolean;
    onDelete?: () => void;
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
  let dialogEl = $state<HTMLDialogElement | null>(null);

  let searchInput = $state<HTMLInputElement | null>(null);
  let wrapperEl = $state<HTMLDivElement | null>(null);

  let isFocused = $state(false);
  let selectedIndex = $state(-1);
  let dropdownStyle = $state("");
  let copiedId = $state<string | null>(null);

  let webSuggestions = $state<string[]>([]);
  let searchHistory = $state<string[]>([]);
  let smartAnswer = $state<SuggestionItem | null>(null);
  let lastSmartQuery = $state("");
  let expandedItemId = $state<string | null>(null);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function getEngineForQuery(q: string) {
    const trimmed = q.trim();
    const defaultEngine = engines.find(e => e.isDefault) || INITIAL_ENGINES[0];
    if (!trimmed) return defaultEngine;

    const shortcuts = engines
      .filter(e => !e.isDefault)
      .sort((a, b) => b.key.length - a.key.length);

    for (const engine of shortcuts) {
      if (trimmed.includes(engine.key)) return engine;
    }
    return defaultEngine;
  }

  const activeEngine = $derived(getEngineForQuery(query));

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
    
    if (!trimmed) {
      return searchHistory.slice(0, 6).map((h, i) => ({
        id: `hist-recent-${i}`, title: h, subtitle: 'Recent Search', badge: 'HISTORY',
        action: () => { handleSearch(h); },
        onDelete: () => {
          searchHistory = searchHistory.filter(item => item !== h);
          localStorage.setItem(`search-history-${id}`, JSON.stringify(searchHistory));
        }
      }));
    }

    const lower = trimmed.toLowerCase();
    const results: SuggestionItem[] = [];

    if (smartAnswer) {
      results.push(smartAnswer);
    }

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

    const histRes = searchHistory
      .filter(h => h.toLowerCase().includes(lower) && h !== trimmed)
      .slice(0, 3)
      .map((h, i) => ({
        id: `hist-match-${i}`, title: h, subtitle: 'Search History', badge: 'HISTORY',
        action: () => { handleSearch(h); },
        onDelete: () => {
          searchHistory = searchHistory.filter(item => item !== h);
          localStorage.setItem(`search-history-${id}`, JSON.stringify(searchHistory));
        }
      }));
    results.push(...histRes);

    const favs = allFavorites
      .filter(f => f.name.toLowerCase().includes(lower) || f.url.toLowerCase().includes(lower))
      .slice(0, 3)
      .map((f, i) => ({
        id: `fav-${i}`, title: f.name, subtitle: f.url, badge: 'FAV',
        action: () => { window.location.href = f.url; }
      }));

    const webRes = webSuggestions
      .filter(w => w.toLowerCase() !== lower && !searchHistory.some(h => h.toLowerCase() === w.toLowerCase()))
      .slice(0, 4)
      .map((w, i) => ({
        id: `web-${i}`, title: w, subtitle: 'Suggestion', badge: 'WEB',
        action: () => { handleSearch(w); }
      }));

    return [...favs, ...results, ...webRes].slice(0, 8);
  });

  $effect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.startsWith('!')) {
      webSuggestions = [];
      smartAnswer = null;
      lastSmartQuery = "";
      expandedItemId = null;
      return;
    }
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // 1. Google Web Suggestions
      const callbackName = 'googleSuggestCb_' + Math.round(Math.random() * 1000000);
      (window as any)[callbackName] = (data: any) => {
         if (data && data[1]) {
            webSuggestions = data[1].map((i: any) => typeof i === 'string' ? i : i[0] || i).slice(0, 5);
         }
         delete (window as any)[callbackName];
         const script = document.getElementById(callbackName);
         if (script) script.remove();
      };
      
      const script = document.createElement('script');
      script.id = callbackName;
      script.src = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(trimmed)}&jsonp=${callbackName}`;
      document.body.appendChild(script);

      // 2. Smart Answers (Weather / Time / DuckDuckGo)
      const weatherMatch = trimmed.match(/^(?:(?:wetter|weather)\s+(?:in\s+)?(.+))|(?:(.+)\s+(?:wetter|weather))$/i);
      const timeMatch = trimmed.match(/^(?:(?:uhrzeit|time|wie sp[aä]t|how late)\s+(?:ist es\s+)?(?:in\s+)?(.+))|(?:(.+)\s+(?:uhrzeit|time))$/i);

      const weatherLoc = weatherMatch ? (weatherMatch[1] || weatherMatch[2]) : null;
      const timeLoc = timeMatch ? (timeMatch[1] || timeMatch[2]) : null;

      if (weatherLoc && weatherLoc !== lastSmartQuery) {
        lastSmartQuery = weatherLoc;
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherLoc)}&count=1&language=de`)
          .then(res => res.json())
          .then(geoData => {
             const geo = geoData.results?.[0];
             if (geo) {
               return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,weather_code,is_day&timezone=${encodeURIComponent(geo.timezone || 'auto')}`)
                 .then(res => res.json())
                 .then(data => {
                    if (data.current) {
                      const c = data.current;
                      const getWmoEmoji = (code: number, isDay: number) => {
                         if (code === 0) return isDay ? '☀️' : '🌙';
                         if (code === 1 || code === 2) return isDay ? '⛅' : '☁️';
                         if (code === 3) return '☁️';
                         if ([45, 48].includes(code)) return '🌫️';
                         if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
                         if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
                         if ([95, 96, 99].includes(code)) return '⛈️';
                         return '🌡️';
                      };
                      const emoji = getWmoEmoji(c.weather_code, c.is_day);
                      const temp = Math.round(c.temperature_2m);
                      const sign = temp > 0 ? '+' : '';
                      const answer = `${geo.name}: ${emoji} ${sign}${temp}°C`;
                      smartAnswer = {
                        id: 'smart-weather', title: answer, subtitle: 'Copy to clipboard', badge: 'WEATHER',
                        action: async () => {
                          await navigator.clipboard.writeText(answer);
                          copiedId = 'smart-weather';
                          setTimeout(() => copiedId = null, 1500);
                        }
                      };
                    } else smartAnswer = null;
                 });
             } else smartAnswer = null;
          }).catch(() => smartAnswer = null);
      } else if (timeLoc && timeLoc !== lastSmartQuery) {
        lastSmartQuery = timeLoc;
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(timeLoc)}&count=1&language=de`)
          .then(res => res.json())
          .then(geoData => {
             const geo = geoData.results?.[0];
             if (geo && geo.timezone) {
               try {
                 const timeStr = new Date().toLocaleTimeString("de-DE", { timeZone: geo.timezone, timeStyle: "short" });
                 const answer = `${geo.name}: ${timeStr} Uhr`;
                 smartAnswer = {
                   id: 'smart-time', title: answer, subtitle: 'Copy to clipboard', badge: 'TIME',
                   action: async () => {
                     await navigator.clipboard.writeText(answer);
                     copiedId = 'smart-time';
                     setTimeout(() => copiedId = null, 1500);
                   }
                 };
               } catch(e) { smartAnswer = null; }
             } else smartAnswer = null;
          }).catch(() => smartAnswer = null);
      } else if (!weatherMatch && !timeMatch && trimmed !== lastSmartQuery && trimmed.length > 3) {
         lastSmartQuery = trimmed;
         const lang = navigator.language.toLowerCase();
         fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(trimmed)}&format=json&kl=${lang}`)
          .then(res => res.json())
          .then(data => {
            let answerText = data.AbstractText;
            if (!answerText && data.RelatedTopics && data.RelatedTopics.length > 0) {
              answerText = data.RelatedTopics[0].Text;
            }
            if (answerText) {
              // DuckDuckGo facts can be slightly long; we make them expandable
              smartAnswer = {
                 id: 'smart-fact', title: answerText, subtitle: 'Fact via DuckDuckGo', badge: 'FACT',
                 expandable: true,
                 action: () => {
                   expandedItemId = expandedItemId === 'smart-fact' ? null : 'smart-fact';
                 }
               };
            } else {
              smartAnswer = null;
            }
          }).catch(() => smartAnswer = null);
      }
    }, 250);
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

  onMount(() => {
    tick().then(() => {
      const firstSearch = document.querySelector('input[placeholder="Search..."]') as HTMLInputElement;
      if (firstSearch) firstSearch.focus();
    });

    const handleGlobalKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '') ||
        e.ctrlKey || e.metaKey || e.altKey || isEditing) return;
      if (e.key.length === 1) searchInput?.focus();
    };

    window.addEventListener('keydown', handleGlobalKey);
    loadFavorites();
    loadHistory();
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

  function loadHistory() {
    try {
      const hist = localStorage.getItem(`search-history-${id}`);
      if (hist) searchHistory = JSON.parse(hist);
    } catch(e) {}
  }

  function saveHistory(q: string) {
    if (!q) return;
    const filtered = searchHistory.filter(h => h !== q);
    searchHistory = [q, ...filtered].slice(0, 15);
    localStorage.setItem(`search-history-${id}`, JSON.stringify(searchHistory));
  }

  function clearHistory() {
    searchHistory = [];
    localStorage.removeItem(`search-history-${id}`);
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

  function handleSearch(overrideQuery?: string | Event) {
    const q = typeof overrideQuery === 'string' ? overrideQuery : query;
    const trimmed = q.trim();
    if (!trimmed) return;
    
    saveHistory(trimmed);
    if (typeof overrideQuery === 'string') query = overrideQuery;

    const engine = getEngineForQuery(trimmed);
    const isUrlExpression = /^(https?:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;

    if (engine.isDefault && trimmed.match(isUrlExpression)) {
      const url = trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`;
      window.location.href = encodeURI(url);
      return;
    }

    const targetUrl = engine.isDefault
      ? engine.url.replace("{query}", encodeURIComponent(trimmed))
      : engine.url.replace("{query}", encodeURIComponent(trimmed.replace(engine.key, "").trim()));

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
			<div class="flex h-10 w-full overflow-hidden rounded-xl border border-neutral-600 bg-neutral-900 shadow-xl focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">

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
			class="overflow-hidden rounded-xl border border-black/40 bg-neutral-900 shadow-2xl font-sans z-[99999]"
	>
		{#each suggestions as item, i}
			<button
					onmousedown={(e) => e.preventDefault()}
					class="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors group {i === selectedIndex ? 'bg-black/40' : 'hover:bg-black/20'}"
					onclick={() => item.action()}
			>
				<div class="flex min-w-0 flex-col pr-2">
      <span class="break-words text-[12px] font-semibold leading-snug mb-0.5 {i === selectedIndex ? 'text-white' : 'text-slate-300'} {item.expandable && expandedItemId !== item.id ? 'line-clamp-3' : ''}">
        {item.title}
      </span>
					<span class="flex items-center gap-1 truncate text-[10px] {i === selectedIndex ? 'text-blue-400' : (item.badge === 'FAV' ? 'text-neutral-500' : 'text-emerald-500')}">
        {#if copiedId === item.id}
          <Check size={10} strokeWidth={3} /> Copied!
        {:else if item.expandable}
          {expandedItemId === item.id ? 'Click to collapse' : 'Click to read more'}
        {:else}
          {item.subtitle}
        {/if}
      </span>
				</div>
				<div class="flex items-center gap-2">
					<div class="shrink-0 rounded-md bg-black/30 border border-black/20 px-1.5 py-0.5 text-[8px] font-bold tracking-wider {item.badge === 'FAV' ? 'text-neutral-500' : 'text-emerald-400'}">
						{item.badge}
					</div>
					{#if item.onDelete}
						<button 
							onmousedown={(e) => e.preventDefault()} 
							onclick={(e) => { e.stopPropagation(); item.onDelete!(); }} 
							class="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
							aria-label="Delete from history"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
						</button>
					{/if}
				</div>
			</button>
		{/each}
	</div>
{/if}

<SettingsDialog 
	title="Search Shortcuts" 
	bind:show={showSettings} 
	data={[engines]} 
	onRevert={(r: any) => { engines = r[0]; }} 
	onSave={saveSettings}
>
	<div class="flex flex-col gap-4">

		<div class="flex justify-between items-center">
			<button
					class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/20 transition-colors border border-transparent hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={clearHistory}
					disabled={searchHistory.length === 0}
					title="Clear Search History"
			>
				<Trash2 size={12} strokeWidth={2.5} /> Clear History
			</button>

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
