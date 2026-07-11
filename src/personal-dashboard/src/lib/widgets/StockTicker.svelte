<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { onMount, onDestroy, getContext } from "svelte";
  import { Plus, X, Search, ChevronUp, ChevronDown, GripVertical } from "lucide-svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import WidgetTabs from "$lib/components/WidgetTabs.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import DraggableList from "$lib/components/DraggableList.svelte";

  let { id, isEditing, width, height, showSettings = $bindable(false) } = $props<{
    id: string; isEditing?: boolean; width?: number; height?: number; showSettings?: boolean;
  }>();

  interface StockConfig {
    symbol: string;
    name: string;
  }

  interface StockData {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    currency: string;
    chartData: number[];
    error?: boolean;
  }

  const PROXY_URL = "/api/proxy?target=";
  const UPDATE_INTERVAL = 5 * 60 * 1000;

  let stocks = $state<StockConfig[]>([
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "BTC-USD", name: "Bitcoin USD" },
    { symbol: "VWAGY", name: "Volkswagen AG" }
  ]);
  let targetCurrency = $state<string>("Native");

  let range = $state<"1d" | "5d" | "1mo" | "1y" | "max">("1d");
  let displayMode = $state<"abs" | "rel">("rel");

  let stockDataList = $state<StockData[]>([]);
  let isLoading = $state(false);
  let interval: ReturnType<typeof setInterval>;

  // Settings
  let searchQuery = $state("");
  let searchResults = $state<any[]>([]);
  let isSearching = $state(false);
  let searchTimeout: ReturnType<typeof setTimeout>;

  // Detail Modal
  let selectedStock = $state<StockData | null>(null);
  let draggedIndex = $state<number | null>(null);
  let showDetailDialog = $state(false);
  let detailDialog: HTMLDialogElement;
  let tvContainer = $state<HTMLDivElement | null>(null);

  let isLoaded = $state(false);

  let isCompact = $derived(height ? height <= 2 : false);

  $effect(() => {
    if (showDetailDialog && detailDialog && !detailDialog.open) {
      detailDialog.showModal();
    } else if (!showDetailDialog && detailDialog && detailDialog.open) {
      detailDialog.close();
    }
  });

  $effect(() => {
    if (showDetailDialog && selectedStock && tvContainer) {
      const initChart = () => {
        let tvSymbol = selectedStock!.symbol.replace(/-/g, '');
        if (tvSymbol.endsWith('=X')) tvSymbol = tvSymbol.replace('=X', '');

        new (window as any).TradingView.widget({
          "autosize": true,
          "symbol": tvSymbol,
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "backgroundColor": "rgba(23, 23, 23, 1)",
          "style": "1",
          "locale": "en",
          "enable_publishing": false,
          "allow_symbol_change": true,
          "container_id": `tv_chart_${id}`
        });
      };

      if (!(window as any).TradingView) {
        const script = document.createElement('script');
        script.src = "https://s3.tradingview.com/tv.js";
        script.onload = initChart;
        document.head.appendChild(script);
      } else {
        initChart();
      }
    }
  });

  function openDetail(stock: StockData) {
    selectedStock = stock;
    showDetailDialog = true;
  }

  const RANGES = [
    { label: "1D", value: "1d", interval: "5m" },
    { label: "1W", value: "5d", interval: "15m" },
    { label: "1M", value: "1mo", interval: "1d" },
    { label: "1Y", value: "1y", interval: "1wk" },
    { label: "MAX", value: "max", interval: "1mo" }
  ];

  const currentRangeDef = $derived(RANGES.find(r => r.value === range) || RANGES[0]);

  const getSecrets = getContext<() => Record<string, any>>('secrets');

  $effect(() => {
    const secrets = getSecrets();
    if (secrets[id]) {
      const parsed = secrets[id];
      if (parsed.stocks) stocks = parsed.stocks;
      if (parsed.targetCurrency) targetCurrency = parsed.targetCurrency;
      if (parsed.range) range = parsed.range;
      if (parsed.displayMode) displayMode = parsed.displayMode;
    }
  });

  $effect(() => {
    if (range && isLoaded) fetchAllData();
  });

  onMount(() => {
    loadSettings();
    isLoaded = true;
    interval = setInterval(fetchAllData, UPDATE_INTERVAL);
    return () => clearInterval(interval);
  });

  function loadSettings() {
    const saved = localStorage.getItem(`stock-settings-${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.stocks) stocks = parsed.stocks;
        if (parsed.targetCurrency) targetCurrency = parsed.targetCurrency;
        if (parsed.range) range = parsed.range;
        if (parsed.displayMode) displayMode = parsed.displayMode;
      } catch (e) {}
    }
  }

  async function saveSettings() {
    localStorage.setItem(`stock-settings-${id}`, JSON.stringify({ stocks, targetCurrency, range, displayMode }));
    showSettings = false;
    fetchAllData();
    
    try {
      await fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: id, key: { stocks, targetCurrency, range, displayMode } })
      });
    } catch (e) {}
  }

  async function fetchAllData() {
    if (!stocks.length) {
      stockDataList = [];
      return;
    }
    isLoading = true;

    try {
      const results = await Promise.all(stocks.map(s => fetchStockData(s.symbol, s.name)));

      // If we need currency conversion
      if (targetCurrency !== "Native") {
        const rates = new Map<string, number>();
        for (const res of results) {
          if (res && res.currency && res.currency !== targetCurrency) {
            const pair = `${res.currency}${targetCurrency}=X`;
            if (!rates.has(pair)) {
              rates.set(pair, await fetchExchangeRate(pair));
            }
            const rate = rates.get(pair) || 1;
            res.price *= rate;
            res.change *= rate;
            res.currency = targetCurrency;
          }
        }
      }

      stockDataList = results.filter(r => r !== null) as StockData[];
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  }

  async function fetchExchangeRate(pair: string): Promise<number> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${pair}?range=1d&interval=1d`;
      const res = await fetch(PROXY_URL + encodeURIComponent(url));
      const data = await res.json();
      return data.chart.result[0].meta.regularMarketPrice;
    } catch {
      return 1;
    }
  }

  async function fetchStockData(symbol: string, name: string): Promise<StockData | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${currentRangeDef.value}&interval=${currentRangeDef.interval}`;
      const res = await fetch(PROXY_URL + encodeURIComponent(url));
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();

      const result = data.chart.result[0];
      const meta = result.meta;
      const quotes = result.indicators.quote[0];

      const currentPrice = meta.regularMarketPrice;
      let startPrice = meta.chartPreviousClose || currentPrice;

      if (range !== "1d" && quotes && quotes.close) {
        const firstValidClose = quotes.close.find((c: number | null) => c !== null);
        if (firstValidClose !== undefined) {
          startPrice = firstValidClose;
        }
      }

      const change = currentPrice - startPrice;
      const changePercent = startPrice > 0 ? (change / startPrice) * 100 : 0;

      const closePrices = quotes?.close || [];
      const chartData = closePrices.filter((c: number | null) => c !== null) as number[];

      return {
        symbol,
        name,
        price: currentPrice,
        change,
        changePercent,
        currency: meta.currency,
        chartData,
        error: false
      };
    } catch (e) {
      console.error(`Error fetching ${symbol}:`, e);
      return { symbol, name, price: 0, change: 0, changePercent: 0, currency: "", chartData: [], error: true };
    }
  }

  function handleSearchInput() {
    clearTimeout(searchTimeout);
    if (!searchQuery.trim()) {
      searchResults = [];
      return;
    }
    searchTimeout = setTimeout(async () => {
      isSearching = true;
      try {
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(PROXY_URL + encodeURIComponent(url));
        const data = await res.json();
        searchResults = data.quotes.filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'CRYPTOCURRENCY' || q.quoteType === 'INDEX');
      } catch (e) {
        console.error(e);
      } finally {
        isSearching = false;
      }
    }, 500);
  }

  function addStock(quote: any) {
    if (!stocks.find(s => s.symbol === quote.symbol)) {
      stocks.push({ symbol: quote.symbol, name: quote.shortname || quote.longname || quote.symbol });
    }
    searchQuery = "";
    searchResults = [];
  }

  // move is replaced by drag and drop

  function formatCurrency(val: number, currency: string) {
    return new Intl.NumberFormat(navigator.language, {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  }

  function formatNumber(val: number) {
    return new Intl.NumberFormat(navigator.language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  }

  function toggleDisplayMode() {
    displayMode = displayMode === "abs" ? "rel" : "abs";
    saveSettings();
  }
</script>

{#snippet headerButtons()}
	<WidgetTabs
		options={[
			{ value: 'abs', label: 'ABS' },
			{ value: 'rel', label: 'REL' }
		]}
		bind:selected={displayMode as any}
		onChange={saveSettings}
	/>
{/snippet}

<WidgetCard title="Stocks" bind:showSettings={showSettings} isConfigured={true} padding={true} headerActions={headerButtons}>
	<div class="flex h-full w-full flex-col font-sans relative pr-1">
		<div class="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-wrap content-start {isCompact ? 'gap-1.5' : 'gap-2'}">
			{#if isLoading && stockDataList.length === 0}
				<div class="flex h-full w-full items-center justify-center text-[10px] text-neutral-500 font-bold tracking-[0.2em] animate-pulse">
					LOADING...
				</div>
			{:else if stockDataList.length === 0}
				<div class="flex h-full w-full items-center justify-center text-[10px] text-neutral-500 font-bold tracking-[0.2em]">
					NO STOCKS
				</div>
			{:else}
				{#each stockDataList as data}
					<button onclick={() => openDetail(data)} class="flex-1 min-w-[120px] flex items-center justify-between bg-neutral-800 rounded-xl {isCompact ? 'p-1.5 sm:p-2' : 'p-2.5 sm:p-3'} border border-transparent hover:border-black/40 transition-all shadow-sm group">
						<div class="flex flex-col overflow-hidden mr-2 text-left">
							<span class="{isCompact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'} font-bold text-white tracking-tight truncate">{data.symbol}</span>
							<span class="{isCompact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'} text-neutral-400 truncate">{data.name}</span>
						</div>

						{#if data.error}
							<div class="{isCompact ? 'text-[8px]' : 'text-[10px]'} text-red-500 font-bold uppercase">Error</div>
						{:else}
							<div class="flex flex-col items-end shrink-0">
								<span class="{isCompact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'} font-bold text-white tabular-nums tracking-tight">
									{formatCurrency(data.price, data.currency)}
								</span>
								<div class="flex items-center gap-0.5 {isCompact ? 'text-[8px] sm:text-[9px]' : 'text-[10px] sm:text-xs'} font-bold tabular-nums {data.change >= 0 ? 'text-emerald-400' : 'text-red-400'}">
									{#if data.change > 0}+{/if}{#if displayMode === 'abs'}{formatNumber(data.change)}{:else}{formatNumber(data.changePercent)}%{/if}
								</div>
							</div>
						{/if}
					</button>
				{/each}
			{/if}
		</div>

		<div class="shrink-0 flex items-center justify-between pt-2 mt-2 border-t border-black/20">
			<div class="flex items-center gap-1 w-full bg-black/20 rounded-md p-0.5 border border-black/20">
				<WidgetTabs 
					options={RANGES}
					bind:selected={range as any}
					onChange={saveSettings}
					fullWidth={true}
				/>
			</div>
		</div>
	</div>
</WidgetCard>

<SettingsDialog title="{i18n.t.w.stock.settings}" bind:show={showSettings} onSave={saveSettings}>
	<div class="flex flex-col gap-4">

		<div class="space-y-1.5">
			<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="currency">{i18n.t.w.stock.targetCurrency}</label>
			<select
					id="currency"
					bind:value={targetCurrency}
					class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 appearance-none"
			>
				<option value="Native">Native (Exchange Currency)</option>
				<option value="USD">USD ($)</option>
				<option value="EUR">EUR (€)</option>
				<option value="GBP">GBP (£)</option>
				<option value="JPY">JPY (¥)</option>
				<option value="CHF">CHF</option>
			</select>
		</div>

		<div class="space-y-2">
			<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Search & Add</label>
			<div class="relative">
				<div class="flex items-center gap-2 border border-black/40 bg-neutral-900 rounded-lg px-2 py-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
					<Search size={14} class="text-neutral-500" />
					<input
							type="text"
							bind:value={searchQuery}
							oninput={handleSearchInput}
							placeholder="{i18n.t.w.stock.searchPlaceholder}"
							class="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-600 border-none focus:ring-0 p-0"
					/>
					{#if isSearching}
						<div class="w-3 h-3 rounded-full border-2 border-neutral-500 border-t-transparent animate-spin"></div>
					{/if}
				</div>

				{#if searchResults.length > 0}
					<div class="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-neutral-900 border border-black/40 rounded-lg shadow-2xl z-50 scrollbar-thin">
						{#each searchResults as quote}
							<button
									onclick={() => addStock(quote)}
									class="w-full flex flex-col items-start px-3 py-2 hover:bg-black/20 border-b border-black/20 last:border-0 text-left"
							>
								<div class="flex items-center justify-between w-full">
									<span class="text-xs font-bold text-white">{quote.symbol}</span>
									<span class="text-[9px] font-black text-neutral-500 uppercase px-1.5 py-0.5 bg-black/30 rounded">{quote.quoteType}</span>
								</div>
								<span class="text-[10px] text-neutral-400 truncate w-full">{quote.shortname || quote.longname || quote.symbol}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="space-y-2">
			<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">{i18n.t.w.stock.activeTickers}</label>
			<DraggableList 
				bind:items={stocks} 
				handleClass="drag-handle"
				listClass="flex max-h-[250px] flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent"
				itemClass="flex items-center gap-2 bg-neutral-900 p-2 rounded-xl border border-black/40"
			>
				{#snippet children(stock, i)}
						<div class="drag-handle cursor-grab active:cursor-grabbing text-neutral-500 hover:text-white transition-colors shrink-0 px-1">
							<GripVertical size={16} strokeWidth={2.5} />
						</div>

						<div class="flex flex-col min-w-0 flex-1 ml-1">
							<span class="text-xs font-bold text-white truncate">{stock.symbol}</span>
							<span class="text-[10px] text-neutral-400 truncate">{stock.name}</span>
						</div>

						<button class="p-2 text-neutral-600 hover:text-red-500 transition-colors shrink-0 bg-black/20 rounded-lg" onclick={() => stocks.splice(i, 1)}>
							<X size={16} strokeWidth={2.5} />
						</button>
				{/snippet}
			</DraggableList>
				{#if stocks.length === 0}
					<div class="text-[10px] text-neutral-500 italic text-center py-4">{i18n.t.w.stock.noTickers}</div>
				{/if}
		</div>

	</div>
</SettingsDialog>

<dialog bind:this={detailDialog} class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 m-0 bg-neutral-900 text-white rounded-xl shadow-2xl p-0 border border-black/40 outline-none backdrop:bg-neutral-950/80 backdrop:backdrop-blur-sm w-[95vw] max-w-5xl h-[80vh] overflow-hidden" onclose={() => showDetailDialog = false}>
	{#if selectedStock}
		<div class="flex flex-col w-full h-full">
			<div class="flex justify-between items-center shrink-0 p-4 border-b border-black/40 bg-neutral-900">
				<div>
					<h2 class="text-lg font-bold">{selectedStock.name} ({selectedStock.symbol})</h2>
				</div>
				<button class="p-1.5 rounded-md bg-black/20 text-neutral-400 hover:text-white transition-colors" onclick={() => showDetailDialog = false}>
					<X size={16} strokeWidth={2.5}/>
				</button>
			</div>

			<div class="flex-grow w-full bg-neutral-900" id="tv_chart_{id}" bind:this={tvContainer}></div>
		</div>
	{/if}
</dialog>

<style>
  .scrollbar-hide::-webkit-scrollbar { display: none; }
</style>
