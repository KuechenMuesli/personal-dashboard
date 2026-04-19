<script lang="ts">
  import { onMount } from "svelte";

  let {
    id,
    isEditing,
    height,
    showSettings = $bindable(false),
    hidden = $bindable(true)
  } = $props<{
    id: string;
    isEditing: boolean;
    height: number;
    showSettings: boolean;
    hidden: boolean;
  }>();

  const PROXY_URL = "https://dashboard-proxy.paul-simon.dev/";
  const TARGET_API_BASE = "https://api.parcel.app/external";
  const COOLDOWN_MS = 5 * 60 * 1000;

  const STATUS_MAP: Record<number, { label: string, color: string }> = {
    0: { label: "Delivered", color: "#10b981" },
    1: { label: "Frozen", color: "#64748b" },
    2: { label: "In Transit", color: "#3b82f6" },
    3: { label: "Ready for Pickup", color: "#f59e0b" },
    4: { label: "Out for Delivery", color: "#8b5cf6" },
    5: { label: "Not Found", color: "#ef4444" },
    6: { label: "Failed Attempt", color: "#f43f5e" },
    7: { label: "Exception", color: "#dc2626" },
    8: { label: "Info Received", color: "#06b6d4" }
  };

  interface Delivery {
    uuid: string;
    tracking_number: string;
    description: string;
    status: { label: string, color: string };
    last_event: {
      description: string;
      location: string;
      occured_at: string;
    } | null;
  }

  let apiKey = $state("");
  let filterMode = $state<"active" | "recent">("active");
  let deliveries = $state<Delivery[]>([]);
  let isLoading = $state(false);
  let lastFetched = $state<number>(0);

  let showAddForm = $state(false);
  let newTrackingNum = $state("");
  let newDescription = $state("");
  let dialogEl = $state<HTMLDialogElement | null>(null);

  const isConfigured = $derived(!!apiKey);
  const isCompact = $derived(height <= 2);

  const fetchEndpoint = $derived(
    `${PROXY_URL}/?target=${encodeURIComponent(`${TARGET_API_BASE}/deliveries/?filter_mode=${filterMode}`)}`
  );

  $effect(() => {
    if (isEditing) {
      hidden = false;
    } else {
      hidden = deliveries.length === 0 && !showAddForm && isConfigured;
    }
  });

  onMount(() => {
    loadSettings();
    const timeSinceLastFetch = Date.now() - lastFetched;
    if (apiKey && (!deliveries.length || timeSinceLastFetch > COOLDOWN_MS)) {
      fetchDeliveries();
    }
    const refreshTimer = setInterval(() => fetchDeliveries(), 60 * 60 * 1000);
    return () => clearInterval(refreshTimer);
  });

  function loadSettings() {
    const saved = localStorage.getItem(`parcel-settings-${id}`);
    const cachedData = localStorage.getItem(`parcel-cache-${id}`);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        apiKey = parsed.apiKey || "";
        filterMode = parsed.filterMode || "recent";
      } catch (e) { console.error(e); }
    }

    if (cachedData) {
      try {
        const cache = JSON.parse(cachedData);
        deliveries = cache.deliveries || [];
        lastFetched = cache.timestamp || 0;
      } catch (e) { console.error(e); }
    }
  }

  async function fetchDeliveries(force = false) {
    if (!apiKey) return;
    const timeSinceLastFetch = Date.now() - lastFetched;
    if (!force && timeSinceLastFetch < COOLDOWN_MS && deliveries.length > 0) return;

    isLoading = true;
    try {
      const res = await fetch(fetchEndpoint, {
        headers: { "api-key": apiKey }
      });
      if (res.status === 429) return;
      if (!res.ok) throw new Error(`API Error: ${res.status}`);

      const data = await res.json();
      if (data && Array.isArray(data.deliveries)) {
        const mapped = data.deliveries.map((item: any) => {
          const latestEvent = item.events?.[0] || null;
          return {
            uuid: item.tracking_number + item.carrier_code,
            tracking_number: item.tracking_number,
            description: item.description || item.tracking_number,
            status: STATUS_MAP[item.status_code] || { label: "Unknown", color: "#525252" },
            last_event: latestEvent ? {
              description: latestEvent.event,
              location: latestEvent.location || "",
              occured_at: latestEvent.date
            } : null
          };
        });
        deliveries = mapped;
        lastFetched = Date.now();
        localStorage.setItem(`parcel-cache-${id}`, JSON.stringify({ deliveries: mapped, timestamp: lastFetched }));
      }
    } catch (e) {
      console.error("Fetch failed", e);
    } finally {
      isLoading = false;
    }
  }

  async function addDelivery() {
    if (!apiKey || !newTrackingNum) return;
    isLoading = true;
    try {
      const postTarget = encodeURIComponent(`${TARGET_API_BASE}/deliveries/`);
      const res = await fetch(`${PROXY_URL}/?target=${postTarget}`, {
        method: "POST",
        headers: { "api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ tracking_number: newTrackingNum, description: newDescription })
      });
      if (res.ok) {
        newTrackingNum = "";
        newDescription = "";
        showAddForm = false;
        await fetchDeliveries(true);
      }
    } catch (e) {
      console.error("Add failed", e);
    } finally {
      isLoading = false;
    }
  }

  function saveSettings() {
    localStorage.setItem(`parcel-settings-${id}`, JSON.stringify({ apiKey, filterMode }));
    showSettings = false;
    fetchDeliveries(true);
  }

  function formatDate(dateStr: string | undefined | null) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' });
  }

  $effect(() => {
    if (showSettings && dialogEl) dialogEl.showModal();
    else if (dialogEl?.open) dialogEl.close();
  });
</script>

<div class="flex h-full w-full flex-col bg-neutral-800 font-sans text-white overflow-hidden p-3">
	{#if !isConfigured}
		<button onclick={() => showSettings = true} class="flex h-full w-full items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-blue-400 transition-colors">
			<span>⚙️</span> Configure Tracker
		</button>
	{:else}

		<div class="flex shrink-0 items-center justify-between mb-2 border-b border-white/10 pb-1.5">
			<h2 class="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
				{isLoading ? 'Syncing...' : 'Deliveries'}
			</h2>
			<div class="flex items-center gap-1 bg-black/20 rounded p-0.5 border border-white/5">
				<button
						onclick={() => fetchDeliveries(true)}
						class="h-5 w-5 flex items-center justify-center rounded text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
						title="Refresh"
				>
					<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
					</svg>
				</button>
				<button
						onclick={() => showAddForm = !showAddForm}
						class="h-5 w-5 flex items-center justify-center rounded transition-colors {showAddForm ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-white hover:bg-neutral-700'}"
						title="Add Package"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 5v14m-7-7h14"/>
					</svg>
				</button>
			</div>
		</div>

		{#if showAddForm}
			<div class="flex gap-1.5 mb-2 bg-black/20 p-1.5 rounded-lg border border-white/5 shrink-0">
				<input
						bind:value={newTrackingNum}
						placeholder="Tracking #"
						class="min-w-0 flex-1 rounded bg-neutral-900 border border-white/5 px-2 py-1 text-[10px] text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
						onkeydown={(e) => e.stopPropagation()}
				/>
				<input
						bind:value={newDescription}
						placeholder="Label"
						class="min-w-0 flex-1 rounded bg-neutral-900 border border-white/5 px-2 py-1 text-[10px] text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
						onkeydown={(e) => { e.stopPropagation(); if (e.key === 'Enter') addDelivery(); }}
				/>
				<button
						onclick={addDelivery}
						disabled={isLoading || !newTrackingNum}
						class="shrink-0 rounded bg-blue-600 px-2.5 text-[10px] font-bold text-white transition-opacity hover:bg-blue-500 disabled:opacity-50"
				>+</button>
			</div>
		{/if}

		<div class="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent pr-1">
			{#if isLoading && !deliveries.length}
				<div class="flex h-full items-center justify-center text-[10px] uppercase font-bold tracking-widest text-neutral-600">Loading...</div>
			{:else if deliveries.length === 0}
				<div class="flex h-full flex-col items-center justify-center text-center pb-2">
					<span class="text-neutral-600 mb-1.5 text-sm">📦</span>
					<p class="text-[9px] text-neutral-500 font-medium mb-2">No {filterMode} packages.</p>
					{#if !showAddForm}
						<button
								onclick={() => showAddForm = true}
								class="rounded px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-black/20 text-neutral-400 hover:text-white border border-white/5 transition-colors"
						>
							Track Package
						</button>
					{/if}
				</div>
			{:else}
				<div class="flex flex-col gap-1.5 w-full">
					{#each deliveries as item (item.uuid)}
						<div class="flex flex-col gap-1 rounded-lg bg-neutral-900/40 p-2 transition-colors hover:bg-neutral-900 border border-transparent hover:border-white/5 w-full text-left">
							<div class="flex items-start justify-between gap-2 w-full">
								<div class="flex flex-col min-w-0 gap-0.5">
									<span class="truncate text-[11px] font-bold text-slate-200 leading-none">{item.description}</span>
									{#if item.description !== item.tracking_number && !isCompact}
										<span class="truncate font-mono text-[9px] text-neutral-500 leading-none">{item.tracking_number}</span>
									{/if}
								</div>
								<span
										class="shrink-0 rounded px-1.5 py-[2px] text-[8px] font-black uppercase tracking-wider leading-none"
										style="background-color: {item.status.color}1A; color: {item.status.color}"
								>
             {item.status.label}
           </span>
							</div>

							{#if item.last_event}
								<div class="flex flex-col min-w-0 border-l border-white/10 pl-1.5 ml-0.5 mt-0.5">
           <span class="truncate text-[10px] text-neutral-400">
             {item.last_event.description}
           </span>
									<span class="truncate text-[8px] text-neutral-600 font-medium tracking-wide mt-0.5">
             {#if item.last_event.location}
               {item.last_event.location} &bull;
             {/if}
										{formatDate(item.last_event.occured_at)}
           </span>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<dialog
		bind:this={dialogEl}
		class="fixed left-1/2 top-1/2 m-0 w-[90vw] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-800 bg-neutral-900 p-0 text-white shadow-2xl outline-none backdrop:bg-black/80 backdrop:backdrop-blur-sm"
		onclose={() => (showSettings = false)}
>
	<div class="flex flex-col gap-5 p-6">
		<header class="flex items-center justify-between shrink-0">
			<h3 class="text-lg font-bold">Parcel Settings</h3>
			<button class="text-2xl text-neutral-500 hover:text-white leading-none" onclick={() => (showSettings = false)}>&times;</button>
		</header>

		<div class="space-y-4">
			<div class="space-y-2">
				<label for="api-key-input" class="block text-[10px] uppercase font-black text-neutral-500 tracking-widest">API Key</label>
				<input
						id="api-key-input"
						type="password"
						bind:value={apiKey}
						placeholder="sk_..."
						class="w-full rounded-lg border border-neutral-800 bg-neutral-800 p-2.5 text-sm text-white outline-none focus:border-blue-500"
						onkeydown={(e) => e.stopPropagation()}
				/>
			</div>

			<div class="space-y-2">
				<label for="filter-mode-select" class="block text-[10px] uppercase font-black text-neutral-500 tracking-widest">Display Filter</label>
				<select
						id="filter-mode-select"
						bind:value={filterMode}
						class="w-full rounded-lg border border-neutral-800 bg-neutral-800 p-2.5 text-sm text-white outline-none focus:border-blue-500 appearance-none cursor-pointer"
				>
					<option value="active">Active Packages</option>
					<option value="recent">Recent History (30 Days)</option>
				</select>
			</div>
		</div>

		<footer class="flex justify-end gap-2 shrink-0 border-t border-neutral-800 pt-4 mt-2">
			<button class="rounded-lg px-4 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors" onclick={() => (showSettings = false)}>Cancel</button>
			<button class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20" onclick={saveSettings}>Save Config</button>
		</footer>
	</div>
</dialog>
