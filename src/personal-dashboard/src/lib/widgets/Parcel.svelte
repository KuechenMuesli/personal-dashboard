<script lang="ts">
  import { onMount } from "svelte";

  let {
    id,
    isEditing,
    showSettings = $bindable(false),
    hidden = $bindable(true)
  } = $props<{
    id: string,
    isEditing: boolean,
    showSettings: boolean,
    hidden: boolean
  }>();

  const PROXY_URL = "https://raspy-cloud-c6cd.kuechenmuesli.workers.dev";
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
  let newTrackingNum = $state("");
  let newDescription = $state("");
  let dialogEl = $state<HTMLDialogElement | null>(null);
  const fetchEndpoint = $derived(
    `${PROXY_URL}/?target=${encodeURIComponent(`${TARGET_API_BASE}/deliveries/?filter_mode=${filterMode}`)}`
  );

  $effect(() => {
    if (isEditing) {
      hidden = false;
    } else {
      hidden = deliveries.length === 0;
    }
  });

  onMount(() => {
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

    const timeSinceLastFetch = Date.now() - lastFetched;
    if (apiKey && (!deliveries.length || timeSinceLastFetch > COOLDOWN_MS)) {
      fetchDeliveries();
    }
  });

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

  $effect(() => {
    if (showSettings && dialogEl) {
      dialogEl.showModal();
    } else if (dialogEl && dialogEl.open) {
      dialogEl.close();
    }
  });
</script>

<div class="flex flex-col h-full overflow-hidden rounded-xl bg-neutral-800 font-sans text-white">
	<div class="flex gap-1.5 border-b border-neutral-700 bg-neutral-900 p-2.5">
		<input
				bind:value={newTrackingNum}
				placeholder="Tracking #"
				class="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
				onkeydown={(e) => e.stopPropagation()}
		/>
		<input
				bind:value={newDescription}
				placeholder="Label"
				class="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
				onkeydown={(e) => e.stopPropagation()}
		/>
		<button
				onclick={addDelivery}
				disabled={isLoading || !newTrackingNum}
				class="rounded-md bg-blue-600 px-3.5 font-bold text-white transition-opacity hover:bg-blue-500 disabled:opacity-50"
		>
			+
		</button>
	</div>

	<div class="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
		{#if isLoading && !deliveries.length}
			<div class="py-5 text-center text-xs text-neutral-500">Updating...</div>
		{:else if deliveries.length === 0}
			<div class="py-5 text-center text-xs text-neutral-500">No {filterMode} parcels.</div>
		{:else}
			{#each deliveries as item (item.uuid)}
				<div class="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
					<div class="mb-2 flex items-center justify-between gap-2">
            <span class="truncate text-[13px] font-semibold text-slate-200">
              {item.description}
            </span>
						<span
								class="shrink-0 rounded px-2 py-0.5 text-[9px] font-extrabold uppercase"
								style="background-color: {item.status.color}33; color: {item.status.color}"
						>
              {item.status.label}
            </span>
					</div>
					{#if item.last_event}
						<div class="space-y-1">
							<p class="m-0 text-[11px] leading-relaxed text-neutral-400">
								{item.last_event.description}
							</p>
							<p class="m-0 text-[9px] text-neutral-600">
								{item.last_event.location}{item.last_event.location ? ' • ' : ''}
								{item.last_event.occured_at}
							</p>
						</div>
					{/if}
				</div>
			{/each}
			{#if isLoading}
				<div class="p-2.5 text-center text-xs text-neutral-500">Refreshing...</div>
			{/if}
		{/if}
	</div>
</div>

<dialog
		bind:this={dialogEl}
		class="fixed left-1/2 top-1/2 w-[90vw] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-700 bg-neutral-900 p-0 text-white outline-none backdrop:bg-black/80 backdrop:backdrop-blur-sm"
		onclose={() => (showSettings = false)}
>
	<div class="flex flex-col gap-4 p-5">
		<header class="flex items-center justify-between">
			<h3 class="text-lg font-medium">Parcel Settings</h3>
			<button
					class="flex h-6 w-6 items-center justify-center rounded bg-neutral-800 text-neutral-500 hover:text-white"
					onclick={() => (showSettings = false)}
			>
				&times;
			</button>
		</header>

		<div class="space-y-4">
			<div class="space-y-1">
				<label for="api-key-input" class="block text-xs text-slate-400">API Key</label>
				<input
						id="api-key-input"
						type="password"
						bind:value={apiKey}
						class="w-full rounded-md border border-neutral-700 bg-neutral-800 p-2 text-white outline-none focus:border-emerald-500"
						onkeydown={(e) => e.stopPropagation()}
				/>
			</div>

			<div class="space-y-1">
				<label for="filter-mode-select" class="block text-xs text-slate-400">Display Filter</label>
				<select
						id="filter-mode-select"
						bind:value={filterMode}
						class="w-full rounded-md border border-neutral-700 bg-neutral-800 p-2 text-sm text-white outline-none focus:border-emerald-500"
				>
					<option value="active">Active Packages</option>
					<option value="recent">Recent History</option>
				</select>
				<p class="text-[10px] text-neutral-500">"Active" hides delivered packages. "Recent" shows everything from the last 30 days.</p>
			</div>
		</div>

		<footer class="flex justify-end gap-2 mt-2">
			<button
					class="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-800"
					onclick={() => (showSettings = false)}
			>
				Cancel
			</button>
			<button
					class="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
					onclick={saveSettings}
			>
				Save Key
			</button>
		</footer>
	</div>
</dialog>
