<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { onMount, getContext } from "svelte";
  import { page } from "$app/stores";
  import { RefreshCw, BatteryWarning } from "lucide-svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";

  let {
    id,
    isEditing,
    showSettings = $bindable(false),
    hidden = $bindable(false)
  } = $props<{
    id: string; isEditing: boolean; showSettings: boolean; hidden: boolean;
  }>();

  const getSecrets = getContext<() => Record<string, any>>('secrets');
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
    const secrets = getSecrets();
    if (secrets[id] && typeof secrets[id] === 'object') {
        accessToken = secrets[id].accessToken || "";
        userApiKey = secrets[id].userApiKey || "";
        deviceId = secrets[id].deviceId || "";
    }
  });

  $effect(() => {
    if (isEditing || showSettings) {
      hidden = false;
    } else {
      hidden = (error && !screenshotUrl) || (imageError && !isLoading) || (!isLoading && !screenshotUrl);
    }
  });

  onMount(() => {
    const cache = localStorage.getItem(`trmnl-cache-${id}`);
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        screenshotUrl = parsed.url || "";
        lastFetched = parsed.timestamp || 0;
        batteryPercent = parsed.battery !== undefined ? parsed.battery : null;
      } catch (e) { console.error(e); }
    }

  });

  $effect(() => {
    if (accessToken) {
      const isStale = Date.now() - lastFetched > COOLDOWN_MS;
      if (!screenshotUrl || isStale) {
        if (!isLoading) fetchTrmnlData();
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
        headers: { "access-token": accessToken },
        cache: force ? 'no-cache' : 'default'
      }).then(res => {
        if (res.status === 429) throw new Error("Rate limit hit");
        if (!res.ok) throw new Error(`Display API Error: ${res.status}`);
        return res.json();
      });

      const fetchDevice = (deviceId && userApiKey) ? fetch(`https://trmnl.com/api/devices/${deviceId}`, {
        headers: { "Authorization": `Bearer ${userApiKey}` },
        cache: force ? 'no-cache' : 'default'
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

  async function saveSettings() {
    if ($page.data.session && (accessToken || userApiKey || deviceId)) {
        try {
            await fetch('/api/secrets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service: id, key: { accessToken, userApiKey, deviceId } })
            });
            localStorage.removeItem(`trmnl-settings-${id}`);
        } catch (e) { console.error("Failed to save TRMNL secrets", e); }
    }
    showSettings = false;
    fetchTrmnlData(true);
  }
</script>

<WidgetCard
		title={accessToken ? undefined : "TRMNL Device"}
		bind:showSettings={showSettings}
		isConfigured={!!accessToken}
		padding={false}
>
	<div class="relative h-full w-full overflow-hidden group">

		{#if isLoading && !screenshotUrl}
			<div class="flex h-full items-center justify-center text-[10px] text-neutral-500 font-bold tracking-[0.2em] animate-pulse">
				SYNCING...
			</div>
		{:else if error && !screenshotUrl}
			<div class="flex h-full items-center justify-center p-4 text-center text-[10px] text-red-500 uppercase font-bold">
				{i18n.t.w.trmnl.syncError}
			</div>
		{:else}
			{#if screenshotUrl}
				<div class="flex h-full w-full items-center justify-center overflow-hidden relative">
					<img
							src={screenshotUrl}
							alt="TRMNL Content"
							onerror={handleImageError}
							class="max-h-full max-w-full object-contain grayscale brightness-95 contrast-125 transition-opacity duration-300 {isLoading ? 'opacity-50' : 'opacity-100'}"
					/>

					{#if batteryPercent !== null && batteryPercent <= BATTERY_THRESHOLD}
						<div class="absolute bottom-2 left-2 bg-[#1c1c1c]/90 text-neutral-300 text-[9px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 shadow z-10 backdrop-blur-sm border border-black/40">
							<BatteryWarning size={12} strokeWidth={2.5} class="text-red-500" />
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
							class="rounded-md bg-black/40 p-1.5 text-white hover:bg-black/60 shadow-lg disabled:opacity-50 transition-colors border border-black/20"
							title="Force Refresh"
					>
						<RefreshCw size={14} strokeWidth={2.5} class={isLoading ? 'animate-spin' : ''} />
					</button>

					<div class="bg-black/60 px-2 py-1 rounded-md text-[9px] text-neutral-400 font-mono backdrop-blur-sm border border-black/20">
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
</WidgetCard>

<SettingsDialog 
	title="{i18n.t.w.trmnl.settings}" 
	bind:show={showSettings} 
	data={[accessToken, userApiKey, deviceId]} 
	onRevert={(r: any) => { accessToken = r[0]; userApiKey = r[1]; deviceId = r[2]; }} 
	onSave={saveSettings}
>
	<div class="space-y-4">
		<div class="space-y-1.5">
			<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="trmnl-token">{i18n.t.w.trmnl.deviceToken}</label>
			<input
					id="trmnl-token"
					type="password"
					bind:value={accessToken}
					placeholder="Used for display image"
					class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
					onkeydown={(e) => e.stopPropagation()}
			/>
		</div>

		<div class="space-y-1.5">
			<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="trmnl-user-api">{i18n.t.w.trmnl.apiKey}</label>
			<input
					id="trmnl-user-api"
					type="password"
					bind:value={userApiKey}
					placeholder="Used for battery data"
					class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
					onkeydown={(e) => e.stopPropagation()}
			/>
		</div>

		<div class="space-y-1.5">
			<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="trmnl-device-id">{i18n.t.w.trmnl.deviceId}</label>
			<input
					id="trmnl-device-id"
					type="text"
					bind:value={deviceId}
					placeholder="Required for battery status"
					class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
					onkeydown={(e) => e.stopPropagation()}
			/>
		</div>
	</div>
</SettingsDialog>
