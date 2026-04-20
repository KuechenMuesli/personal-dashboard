<script lang="ts">
  import { onMount } from "svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";

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

{#snippet headerButtons()}
	<button
			onclick={() => fetchDeliveries(true)}
			class="h-5 w-5 flex items-center justify-center rounded text-widget-text-muted hover:text-white hover:bg-widget-bg-hover transition-colors"
			title="Refresh"
	>
		<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
		</svg>
	</button>
	<button
			onclick={() => showAddForm = !showAddForm}
			class="h-5 w-5 flex items-center justify-center rounded transition-colors {showAddForm ? 'bg-widget-accent text-white' : 'text-widget-text-muted hover:text-white hover:bg-widget-bg-hover'}"
			title="Add Package"
	>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
			<path d="M12 5v14m-7-7h14"/>
		</svg>
	</button>
{/snippet}

<WidgetCard
		title={isLoading ? 'Syncing...' : 'Deliveries'}
		bind:showSettings={showSettings}
		isConfigured={isConfigured}
		headerActions={headerButtons}
>
	{#if showAddForm}
		<div class="flex gap-1.5 mb-2 bg-black/20 p-1.5 rounded-lg border border-widget-border shrink-0">
			<input
					bind:value={newTrackingNum}
					placeholder="Tracking #"
					class="min-w-0 flex-1 rounded bg-widget-bg border border-widget-border px-2 py-1 text-[10px] text-widget-text outline-none focus:border-widget-accent focus:ring-1 focus:ring-widget-accent/50"
					onkeydown={(e) => e.stopPropagation()}
			/>
			<input
					bind:value={newDescription}
					placeholder="Label"
					class="min-w-0 flex-1 rounded bg-widget-bg border border-widget-border px-2 py-1 text-[10px] text-widget-text outline-none focus:border-widget-accent focus:ring-1 focus:ring-widget-accent/50"
					onkeydown={(e) => { e.stopPropagation(); if (e.key === 'Enter') addDelivery(); }}
			/>
			<button
					onclick={addDelivery}
					disabled={isLoading || !newTrackingNum}
					class="shrink-0 rounded bg-widget-accent px-2.5 text-[10px] font-bold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
			>+</button>
		</div>
	{/if}

	<div class="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent pr-1">
		{#if isLoading && !deliveries.length}
			<div class="flex h-full items-center justify-center text-[10px] uppercase font-bold tracking-widest text-widget-text-muted">Loading...</div>

		{:else if deliveries.length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center pb-2">
				<svg class="text-widget-text-muted mb-2 opacity-50" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>
				</svg>
				<p class="text-[9px] text-widget-text-muted font-medium mb-2">No {filterMode} packages.</p>
				{#if !showAddForm}
					<button
							onclick={() => showAddForm = true}
							class="rounded px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-black/20 text-widget-text-muted hover:text-white border border-widget-border transition-colors"
					>
						Track Package
					</button>
				{/if}
			</div>

		{:else}
			<div class="flex flex-col gap-1.5 w-full">
				{#each deliveries as item (item.uuid)}
					<div class="flex flex-col gap-1 rounded-lg bg-widget-bg-hover/30 p-2 transition-colors hover:bg-widget-bg-hover border border-transparent hover:border-widget-border w-full text-left">
						<div class="flex items-start justify-between gap-2 w-full">
							<div class="flex flex-col min-w-0 gap-0.5">
								<span class="truncate text-[11px] font-bold text-widget-text leading-none">{item.description}</span>
								{#if item.description !== item.tracking_number && !isCompact}
									<span class="truncate font-mono text-[9px] text-widget-text-muted leading-none">{item.tracking_number}</span>
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
							<div class="flex flex-col min-w-0 border-l border-widget-border pl-1.5 ml-0.5 mt-0.5">
          <span class="truncate text-[10px] text-widget-text-muted">
            {item.last_event.description}
          </span>
								<span class="truncate text-[8px] text-widget-text-muted opacity-80 font-medium tracking-wide mt-0.5">
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
</WidgetCard>

<SettingsDialog
		title="Parcel Settings"
		bind:show={showSettings}
		onSave={saveSettings}
>
	<div class="space-y-4">
		<div class="space-y-2">
			<label for="api-key-input" class="block text-[10px] uppercase font-black text-widget-text-muted tracking-widest">API Key</label>
			<input
					id="api-key-input"
					type="password"
					bind:value={apiKey}
					placeholder="sk_..."
					class="w-full rounded-lg bg-black/30 p-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-widget-accent/50"
					onkeydown={(e) => e.stopPropagation()}
			/>
		</div>

		<div class="space-y-2">
			<label for="filter-mode-select" class="block text-[10px] uppercase font-black text-widget-text-muted tracking-widest">Display Filter</label>
			<select
					id="filter-mode-select"
					bind:value={filterMode}
					class="w-full rounded-lg bg-black/30 p-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-widget-accent/50 appearance-none cursor-pointer"
			>
				<option value="active" class="bg-widget-bg text-white">Active Packages</option>
				<option value="recent" class="bg-widget-bg text-white">Recent History (30 Days)</option>
			</select>
		</div>
	</div>
</SettingsDialog>
