<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { onMount, getContext } from "svelte";
  import { page } from "$app/stores";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import {Package, Plus, RefreshCw} from "lucide-svelte";

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

  const getSecrets = getContext<() => Record<string, any>>('secrets');

  const PROXY_URL = "/api/proxy";
  const TARGET_API_BASE = "https://api.parcel.app/external";
  const COOLDOWN_MS = 5 * 60 * 1000;

  const STATUS_MAP: Record<number, { label: string, color: string }> = {
    0: { label: i18n.t.w.parcel.status.delivered, color: "#10b981" },
    1: { label: i18n.t.w.parcel.status.frozen, color: "#64748b" },
    2: { label: i18n.t.w.parcel.status.inTransit, color: "#3b82f6" },
    3: { label: i18n.t.w.parcel.status.ready, color: "#f59e0b" },
    4: { label: i18n.t.w.parcel.status.outForDelivery, color: "#8b5cf6" },
    5: { label: i18n.t.w.parcel.status.notFound, color: "#ef4444" },
    6: { label: i18n.t.w.parcel.status.failed, color: "#f43f5e" },
    7: { label: i18n.t.w.parcel.status.exception, color: "#dc2626" },
    8: { label: i18n.t.w.parcel.status.infoReceived, color: "#06b6d4" }
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
    const secrets = getSecrets();
    if (secrets[id] && typeof secrets[id] === 'string') {
        apiKey = secrets[id];
    }
  });

  $effect(() => {
    if (isEditing || showSettings) {
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

  $effect(() => {
    if (isConfigured && deliveries.length === 0 && !isLoading) {
       const timeSinceLastFetch = Date.now() - lastFetched;
       if (timeSinceLastFetch > COOLDOWN_MS) fetchDeliveries();
    }
  });

  function loadSettings() {
    const saved = localStorage.getItem(`parcel-settings-${id}`);
    const cachedData = localStorage.getItem(`parcel-cache-${id}`);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
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
      const url = `${fetchEndpoint}${force ? '&force=true' : ''}`;
      const headers: Record<string, string> = { "api-key": apiKey };
      if (force) headers['Cache-Control'] = 'no-cache';

      const res = await fetch(url, {
        headers,
        cache: force ? 'no-cache' : 'default'
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
            status: STATUS_MAP[item.status_code] || { label: i18n.t.w.parcel.status.unknown, color: "#525252" },
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

  async function saveSettings() {
    if ($page.data.session && apiKey) {
        try {
            await fetch('/api/secrets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service: id, key: apiKey })
            });
        } catch (e) { console.error("Failed to save secret", e); }
    }
    localStorage.setItem(`parcel-settings-${id}`, JSON.stringify({ filterMode }));
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
		<RefreshCw size={10}></RefreshCw>
	</button>
	<button
			onclick={() => showAddForm = !showAddForm}
			class="h-5 w-5 flex items-center justify-center rounded transition-colors {showAddForm ? 'bg-widget-accent text-white' : 'text-widget-text-muted hover:text-white hover:bg-widget-bg-hover'}"
			title="Add Package"
	>
		<Plus size={10} />
	</button>
{/snippet}

<WidgetCard
		title={isLoading ? i18n.t.w.common.syncing : i18n.t.w.parcel.deliveries}
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
			<div class="flex h-full items-center justify-center text-[10px] uppercase font-bold tracking-widest text-widget-text-muted">{i18n.t.w.common.loading}</div>

		{:else if deliveries.length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center pb-2">
				<Package size={24} />
				<p class="text-[9px] text-widget-text-muted font-medium mb-2">{i18n.t.w.parcel.noPackages.replace('{filterMode}', filterMode === 'active' ? i18n.t.w.parcel.active : i18n.t.w.parcel.recent)}</p>
				{#if !showAddForm}
					<button
							onclick={() => showAddForm = true}
							class="rounded px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-black/20 text-widget-text-muted hover:text-white border border-widget-border transition-colors"
					>
						{i18n.t.w.parcel.trackPackage}
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
	title="{i18n.t.w.parcel.settings}"
	bind:show={showSettings}
	data={[apiKey]}
	onRevert={(r: any) => { apiKey = r[0]; }}
	onSave={saveSettings}
>
	<div class="space-y-4">
		<div class="space-y-2">
			<label for="api-key-input" class="block text-[10px] uppercase font-black text-widget-text-muted tracking-widest">{i18n.t.w.parcel.apiKey}</label>
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
			<label for="filter-mode-select" class="block text-[10px] uppercase font-black text-widget-text-muted tracking-widest">{i18n.t.w.parcel.displayFilter}</label>
			<select
					id="filter-mode-select"
					bind:value={filterMode}
					class="w-full rounded-lg bg-black/30 p-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-widget-accent/50 appearance-none cursor-pointer"
			>
				<option value="active" class="bg-widget-bg text-white">{i18n.t.w.parcel.activePackages}</option>
				<option value="recent" class="bg-widget-bg text-white">Recent History (30 Days)</option>
			</select>
		</div>
	</div>
</SettingsDialog>
