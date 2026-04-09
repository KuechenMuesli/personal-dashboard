<script lang="ts">
  import { onMount } from "svelte";

  let { id, isEditing, showSettings = $bindable(false) } = $props<{
    id: string, isEditing: boolean, showSettings: boolean
  }>();

  const PROXY_URL = "https://raspy-cloud-c6cd.kuechenmuesli.workers.dev";
  const COOLDOWN_MS = 5 * 60 * 1000; // 5 Minutes

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

  // State
  let apiKey = $state("");
  let deliveries = $state<Delivery[]>([]);
  let isLoading = $state(false);
  let lastFetched = $state<number>(0);
  let newTrackingNum = $state("");
  let newDescription = $state("");
  let dialogEl = $state<HTMLDialogElement | null>(null);

  onMount(() => {
    const saved = localStorage.getItem(`parcel-settings-${id}`);
    const cachedData = localStorage.getItem(`parcel-cache-${id}`);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        apiKey = parsed.apiKey || "";
      } catch (e) { console.error(e); }
    }

    if (cachedData) {
      try {
        const cache = JSON.parse(cachedData);
        deliveries = cache.deliveries || [];
        lastFetched = cache.timestamp || 0;
      } catch (e) { console.error(e); }
    }

    // Only fetch if key exists AND (no cache OR cache is older than 5 mins)
    const timeSinceLastFetch = Date.now() - lastFetched;
    if (apiKey && (!deliveries.length || timeSinceLastFetch > COOLDOWN_MS)) {
      fetchDeliveries();
    }
  });

  async function fetchDeliveries(force = false) {
    if (!apiKey) return;

    // Check cooldown unless it's a forced update (like adding a new parcel)
    const timeSinceLastFetch = Date.now() - lastFetched;
    if (!force && timeSinceLastFetch < COOLDOWN_MS && deliveries.length > 0) {
      console.log(`Using cache. Next update available in ${Math.round((COOLDOWN_MS - timeSinceLastFetch) / 1000)}s`);
      return;
    }

    isLoading = true;
    try {
      const res = await fetch(`${PROXY_URL}/deliveries/?filter_mode=recent`, {
        headers: { "api-key": apiKey }
      });

      if (res.status === 429) {
        console.warn("Parcel API Rate limit hit. Using older cache.");
        return;
      }

      if (!res.ok) throw new Error(`API Error: ${res.status}`);

      const data = await res.json();

      if (data && Array.isArray(data.deliveries)) {
        const mapped = data.deliveries.map((item: any) => {
          const latestEvent = item.events && item.events.length > 0 ? item.events[0] : null;
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

        // Save to local cache
        localStorage.setItem(`parcel-cache-${id}`, JSON.stringify({
          deliveries: mapped,
          timestamp: lastFetched
        }));
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
      const res = await fetch(`${PROXY_URL}/deliveries/`, {
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
    localStorage.setItem(`parcel-settings-${id}`, JSON.stringify({ apiKey }));
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

<div class="parcel-container">
	<div class="add-box">
		<input bind:value={newTrackingNum} placeholder="Tracking #" onkeydown={(e) => e.stopPropagation()} />
		<input bind:value={newDescription} placeholder="Label" onkeydown={(e) => e.stopPropagation()} />
		<button onclick={addDelivery} disabled={isLoading || !newTrackingNum}>+</button>
	</div>

	<div class="list-area">
		{#if isLoading && !deliveries.length}
			<div class="msg">Updating...</div>
		{:else if deliveries.length === 0}
			<div class="msg">No recent parcels.</div>
		{:else}
			{#each deliveries as item (item.uuid)}
				<div class="card">
					<div class="card-header">
						<span class="desc">{item.description}</span>
						<span class="status-pill" style="background: {item.status.color}33; color: {item.status.color}">
              {item.status.label}
            </span>
					</div>
					{#if item.last_event}
						<div class="event">
							<p class="event-text">{item.last_event.description}</p>
							<p class="meta">
								{item.last_event.location}{item.last_event.location ? ' • ' : ''}
								{item.last_event.occured_at}
							</p>
						</div>
					{/if}
				</div>
			{/each}
			{#if isLoading}
				<div class="msg" style="padding: 10px;">Refreshing...</div>
			{/if}
		{/if}
	</div>
</div>

<dialog bind:this={dialogEl} class="centered-dialog" onclose={() => (showSettings = false)}>
	<div class="settings-wrapper">
		<header class="dialog-header">
			<h3>Parcel Settings</h3>
			<button class="close-x" onclick={() => (showSettings = false)}>&times;</button>
		</header>
		<div class="field">
			<label for="api-key-input">API Key</label>
			<input id="api-key-input" type="password" bind:value={apiKey} onkeydown={(e) => e.stopPropagation()} />
		</div>
		<footer class="actions">
			<button class="cancel" onclick={() => (showSettings = false)}>Cancel</button>
			<button class="save" onclick={saveSettings}>Save Key</button>
		</footer>
	</div>
</dialog>

<style>
  .parcel-container { height: 100%; display: flex; flex-direction: column; background: #262626; border-radius: 12px; overflow: hidden; font-family: sans-serif; }
  .add-box { display: flex; gap: 6px; padding: 10px; background: #1a1a1a; border-bottom: 1px solid #333; }
  .add-box input { flex: 1; background: #2d2d2d; border: 1px solid #3f3f3f; color: white; padding: 6px 10px; border-radius: 6px; font-size: 12px; outline: none; min-width: 0; }
  .add-box button { background: #3b82f6; border: none; color: white; border-radius: 6px; padding: 0 14px; cursor: pointer; font-weight: bold; }
  .add-box button:disabled { opacity: 0.5; }
  .list-area { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .msg { text-align: center; color: #737373; font-size: 12px; padding: 20px; }
  .card { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 12px; }
  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; }
  .desc { font-size: 13px; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .status-pill { font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; flex-shrink: 0; }
  .event-text { font-size: 11px; color: #a3a3a3; margin: 0; line-height: 1.4; }
  .meta { font-size: 9px; color: #525252; margin: 4px 0 0 0; }
  .centered-dialog { border: 1px solid #3f3f3f; border-radius: 16px; padding: 0; width: 90vw; max-width: 400px; background: #1a1a1a; color: white; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); outline: none; }
  .centered-dialog::backdrop { background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(4px); }
  .settings-wrapper { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
  .dialog-header { display: flex; justify-content: space-between; align-items: center; }
  .close-x { background: #262626; border: none; color: #737373; cursor: pointer; border-radius: 4px; }
  .field label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
  .field input { width: 100%; background: #262626; border: 1px solid #3f3f3f; color: white; padding: 8px; border-radius: 6px; box-sizing: border-box; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  .save { background: #10b981; border: none; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; }
  .cancel { background: transparent; border: 1px solid #333; color: #737373; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
</style>
