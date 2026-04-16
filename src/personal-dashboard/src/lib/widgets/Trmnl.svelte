<script lang="ts">
  import { onMount } from "svelte";

  let {
    id,
    isEditing,
    showSettings = $bindable(false),
    hidden = $bindable(false)
  } = $props<{
    id: string; isEditing: boolean; showSettings: boolean; hidden: boolean;
  }>();

  const COOLDOWN_MS = 15 * 60 * 1000;
  const BATTERY_THRESHOLD = 20;

  let accessToken = $state("");
  let userApiKey = $state("");
  let deviceId = $state("");
  let screenshotUrl = $state("");
  let batteryPercent = $state<number | null>(null);
  let lastFetched = $state<number>(0);
  let isLoading = $state(false);
  let error = $state(false);
  let imageError = $state(false);
  let dialogEl = $state<HTMLDialogElement | null>(null);

  let timeUntilNext = $derived(Math.max(0, Math.ceil((COOLDOWN_MS - (Date.now() - lastFetched)) / 1000 / 60)));

  $effect(() => {
    if (isEditing) {
      hidden = false;
    } else {
      hidden = (error && !screenshotUrl) || (imageError && !isLoading) || (!isLoading && !screenshotUrl);
    }
  });

  onMount(() => {
    const saved = localStorage.getItem(`trmnl-settings-${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        accessToken = parsed.accessToken || "";
        userApiKey = parsed.userApiKey || "";
        deviceId = parsed.deviceId || "";
      } catch (e) { console.error(e); }
    }

    const cache = localStorage.getItem(`trmnl-cache-${id}`);
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        screenshotUrl = parsed.url || "";
        lastFetched = parsed.timestamp || 0;
        batteryPercent = parsed.battery !== undefined ? parsed.battery : null;
      } catch (e) { console.error(e); }
    }

    if (accessToken) {
      const isStale = Date.now() - lastFetched > COOLDOWN_MS;
      if (!screenshotUrl || isStale) {
        fetchTrmnlData();
      }
    }
  });

  async function fetchTrmnlData(force = false) {
    if (!accessToken) return;

    const timeSinceLast = Date.now() - lastFetched;
    if (!force && timeSinceLast < COOLDOWN_MS && screenshotUrl && !imageError) {
      return;
    }

    isLoading = true;
    error = false;
    imageError = false;

    try {
      const fetchDisplay = fetch(`https://trmnl.com/api/display/current`, {
        headers: { "access-token": accessToken }
      }).then(res => {
        if (res.status === 429) throw new Error("Rate limit hit");
        if (!res.ok) throw new Error(`Display API Error: ${res.status}`);
        return res.json();
      });

      const fetchDevice = (deviceId && userApiKey) ? fetch(`https://trmnl.com/api/devices/${deviceId}`, {
        headers: { "Authorization": `Bearer ${userApiKey}` }
      }).then(res => {
        if (res.ok) return res.json();
        console.warn(`Device API returned ${res.status}`);
        return null;
      }).catch(e => {
        console.error("TRMNL device fetch failed", e);
        return null;
      }) : Promise.resolve(null);

      const [displayData, deviceData] = await Promise.all([fetchDisplay, fetchDevice]);

      if (displayData.image_url) {
        screenshotUrl = displayData.image_url;
        lastFetched = Date.now();
      } else {
        screenshotUrl = "";
      }

      if (deviceData?.data?.percent_charged !== undefined) {
        batteryPercent = deviceData.data.percent_charged;
      }

      localStorage.setItem(`trmnl-cache-${id}`, JSON.stringify({
        url: screenshotUrl,
        timestamp: lastFetched,
        battery: batteryPercent
      }));

    } catch (e) {
      console.error("TRMNL sync failed", e);
      error = true;
    } finally {
      isLoading = false;
    }
  }

  function handleImageError() {
    console.error("TRMNL: Image failed to load from URL:", screenshotUrl);
    imageError = true;
    error = true;

    localStorage.setItem(`trmnl-cache-${id}`, JSON.stringify({
      url: "",
      timestamp: lastFetched,
      battery: batteryPercent
    }));

    screenshotUrl = "";
  }

  function saveSettings() {
    localStorage.setItem(`trmnl-settings-${id}`, JSON.stringify({ accessToken, userApiKey, deviceId }));
    showSettings = false;
    fetchTrmnlData(true);
  }

  $effect(() => {
    if (showSettings && dialogEl) dialogEl.showModal();
    else if (dialogEl?.open) dialogEl.close();
  });
</script>

<div class="relative h-full w-full overflow-hidden rounded-xl group bg-transparent">
	{#if !accessToken}
		<div class="flex h-full flex-col items-center justify-center p-4 text-center bg-neutral-900">
			<p class="text-[11px] text-neutral-500 mb-2 text-balance">Tokens Required</p>
			<button
					onclick={() => showSettings = true}
					class="text-[10px] font-bold text-blue-500 uppercase tracking-wider hover:text-blue-400 transition-colors"
			>Configure Device</button>
		</div>
	{:else if isLoading && !screenshotUrl}
		<div class="flex h-full items-center justify-center text-[10px] text-neutral-600 font-bold tracking-[0.2em] animate-pulse bg-neutral-900">
			SYNCING...
		</div>
	{:else if error && !screenshotUrl}
		<div class="flex h-full items-center justify-center p-4 text-center text-[10px] text-red-500 uppercase font-bold bg-neutral-900">
			Sync Error
		</div>
	{:else}
		{#if screenshotUrl}
			<div class="flex h-full w-full items-center justify-center overflow-hidden relative">
				<img
						src={screenshotUrl}
						alt="TRMNL Content"
						onerror={handleImageError}
						class="max-h-full max-w-full object-contain rounded-lg grayscale brightness-95 contrast-125 transition-opacity duration-300 {isLoading ? 'opacity-50' : 'opacity-100'}"
				/>

				{#if batteryPercent !== null && batteryPercent <= BATTERY_THRESHOLD}
					<div class="absolute bottom-2 left-2 bg-neutral-900/90 text-neutral-300 text-[9px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 shadow z-10 backdrop-blur-sm border border-neutral-800">
						<svg class="h-3 w-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M21 10.5h.75a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5H21v-6ZM4.5 9h12a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 3 16.5v-6A1.5 1.5 0 0 1 4.5 9Zm1.5 3h1.5v3H6v-3Z" />
						</svg>
						{batteryPercent}%
					</div>
				{/if}
			</div>
		{/if}

		<div class="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
			<div class="absolute inset-x-0 top-0 p-2 flex justify-between items-start pointer-events-auto">
				<button
						onclick={() => fetchTrmnlData(true)}
						disabled={isLoading}
						class="rounded bg-neutral-800 p-1.5 text-white hover:bg-neutral-700 shadow-lg disabled:opacity-50 transition-colors"
						title="Force Refresh"
				>
					<svg class="h-3.5 w-3.5 {isLoading ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
						<path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</button>

				<div class="bg-neutral-900/80 px-2 py-1 rounded text-[9px] text-neutral-400 font-mono backdrop-blur-sm">
					{#if isLoading}
						UPDATING...
					{:else}
						NEXT: {timeUntilNext}m
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<dialog
		bind:this={dialogEl}
		class="fixed left-1/2 top-1/2 m-0 w-[90vw] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-800 bg-neutral-900 p-0 text-white shadow-2xl outline-none backdrop:bg-black/80 backdrop:backdrop-blur-sm"
		onclose={() => (showSettings = false)}
>
	<div class="flex flex-col gap-4 p-6">
		<header class="flex items-center justify-between">
			<h3 class="text-lg font-bold">TRMNL Sync</h3>
			<button class="text-2xl text-neutral-500 hover:text-white transition-colors" onclick={() => (showSettings = false)}>&times;</button>
		</header>

		<div class="space-y-4">
			<div class="space-y-1.5">
				<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="trmnl-token">Device Access Token</label>
				<input
						id="trmnl-token"
						type="password"
						bind:value={accessToken}
						placeholder="Used for display image"
						class="w-full rounded-lg border border-neutral-800 bg-neutral-800 p-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
						onkeydown={(e) => e.stopPropagation()}
				/>
			</div>

			<div class="space-y-1.5">
				<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="trmnl-user-api">User API Key</label>
				<input
						id="trmnl-user-api"
						type="password"
						bind:value={userApiKey}
						placeholder="Used for battery data"
						class="w-full rounded-lg border border-neutral-800 bg-neutral-800 p-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
						onkeydown={(e) => e.stopPropagation()}
				/>
			</div>

			<div class="space-y-1.5">
				<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="trmnl-device-id">Device ID</label>
				<input
						id="trmnl-device-id"
						type="text"
						bind:value={deviceId}
						placeholder="Required for battery status"
						class="w-full rounded-lg border border-neutral-800 bg-neutral-800 p-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
						onkeydown={(e) => e.stopPropagation()}
				/>
			</div>
		</div>

		<footer class="mt-4 flex justify-end gap-2">
			<button class="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-800 transition-colors" onclick={() => (showSettings = false)}>Cancel</button>
			<button class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-500 transition-colors" onclick={saveSettings}>Save & Sync</button>
		</footer>
	</div>
</dialog>
