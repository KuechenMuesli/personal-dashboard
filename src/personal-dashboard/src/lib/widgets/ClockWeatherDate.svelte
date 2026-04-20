<script lang="ts">
  import { onMount } from "svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import { Sun, Cloud, CloudRain, Snowflake, CloudLightning, Settings } from "lucide-svelte";

  let {
    id,
    isEditing,
    height,
    showSettings = $bindable(false)
  } = $props<{
    id: string;
    isEditing: boolean;
    height: number;
    showSettings: boolean;
  }>();

  let currentTime = $state(new Date());
  let weather = $state<{ temp: number; code: number } | null>(null);
  let dialogEl = $state<HTMLDialogElement | null>(null);

  let city = $state("");
  let lat = $state<number | null>(null);
  let lon = $state<number | null>(null);
  let showClock = $state(true);
  let showDate = $state(true);
  let showWeather = $state(true);

  let unit = $state<"celsius" | "fahrenheit">("celsius");
  let hour12 = $state(false);

  const isHeight1 = $derived(height === 1);
  const isHeight2 = $derived(height === 2);
  const isHeight3 = $derived(height === 3);
  const isLarge = $derived(height >= 4);
  const isConfigured = $derived(city.trim() !== "" && (lat !== null || !showWeather));

  const showingTimeGroup = $derived(showClock || showDate);

  const timeString = $derived(currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: hour12
  }));

  const dateStringShort = $derived(currentTime.toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric'
  }));

  const dateStringFull = $derived(currentTime.toLocaleDateString([], {
    weekday: 'long', month: 'long', day: 'numeric'
  }));

  const dateStringYear = $derived(currentTime.toLocaleDateString([], {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }));

  onMount(() => {
    const saved = localStorage.getItem(`general-settings-${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        city = parsed.city || "";
        lat = parsed.lat || null;
        lon = parsed.lon || null;
        showClock = parsed.showClock ?? true;
        showDate = parsed.showDate ?? true;
        showWeather = parsed.showWeather ?? true;
        unit = parsed.unit || "celsius";
        hour12 = parsed.hour12 ?? false;
      } catch (e) { console.error(e); }
    }

    const timer = setInterval(() => (currentTime = new Date()), 1000);
    if (lat && lon) fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000);

    return () => {
      clearInterval(timer);
      clearInterval(weatherTimer);
    };
  });

  async function fetchWeather() {
    if (!showWeather || lat === null || lon === null) return;
    try {
      const u = unit === "fahrenheit" ? "&temperature_unit=fahrenheit" : "";
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true${u}`
      );
      const data = await res.json();
      weather = {
        temp: Math.round(data.current_weather.temperature),
        code: data.current_weather.weathercode
      };
    } catch (e) { console.error("Weather failed", e); }
  }

  async function saveSettings() {
    if (city.trim() !== "") {
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results[0]) {
          lat = geoData.results[0].latitude;
          lon = geoData.results[0].longitude;
        }
      } catch (e) { console.error("Geocoding failed", e); }
    }
    localStorage.setItem(`general-settings-${id}`, JSON.stringify({
      city, lat, lon, showClock, showDate, showWeather, unit, hour12
    }));
    showSettings = false;
    fetchWeather();
  }

  function getWeatherLabel(code: number) {
    if (code === 0) return "Clear sky";
    if (code <= 3) return "Mainly clear";
    if (code <= 48) return "Foggy";
    if (code <= 67) return "Rainy";
    if (code <= 77) return "Snowy";
    return "Thunderstorm";
  }

  const iconSize = $derived(isLarge ? 32 : isHeight3 ? 24 : 20);
</script>

{#snippet WeatherIcon(code: number, size: number)}
	{#if code <= 1} <Sun {size} strokeWidth={2} />
	{:else if code <= 3} <Cloud {size} strokeWidth={2} />
	{:else if code <= 67} <CloudRain {size} strokeWidth={2} />
	{:else if code <= 77} <Snowflake {size} strokeWidth={2} />
	{:else} <CloudLightning {size} strokeWidth={2} />
	{/if}
{/snippet}

<WidgetCard bind:showSettings={showSettings} isConfigured={isConfigured} padding={false}>
	<div class="flex h-full w-full transition-all {isHeight1 ? 'items-center px-4' : 'p-3 sm:p-4'}">
		{#if !isConfigured && showWeather}
			<button onclick={() => showSettings = true} class="flex h-full w-full items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-blue-400 transition-colors">
				<Settings size={14} strokeWidth={2.5} /> Configure Location
			</button>
		{:else}
			<div class="flex w-full {isHeight1 || isHeight2 ? 'flex-row justify-between' : 'flex-col justify-center'} {isHeight1 ? 'gap-0' : 'gap-4'}">

				{#if showingTimeGroup}
					<div class="flex {isHeight1 || isHeight2 ? 'items-center' : 'items-baseline'} gap-3 {!isHeight1 && !isHeight2 ? 'flex-col items-start mb-2' : 'flex-row'}">
						{#if showClock}
          <span class="font-bold tabular-nums tracking-tight text-slate-200 {isLarge ? 'text-5xl' : isHeight3 ? 'text-3xl' : isHeight2 ? 'text-2xl' : 'text-xl'}">
            {timeString}
          </span>
						{/if}

						{#if showDate}
          <span class="font-medium uppercase tracking-wider {isLarge ? 'text-sm text-blue-400' : isHeight3 || isHeight2 ? 'text-xs text-blue-400' : 'text-[11px] text-neutral-400'}">
            {isLarge ? dateStringYear : (isHeight3 || isHeight2) ? dateStringFull : dateStringShort}
          </span>
						{/if}
					</div>
				{/if}

				{#if showWeather && weather}
					<div class="flex items-center {isHeight1 || isHeight2 ? 'gap-2 border-l border-black/30 pl-4' : 'flex-col items-start border-t border-black/30 pt-3'}">

						{#if isLarge}
							<div class="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">{city}</div>
						{/if}

						<div class="flex items-center gap-2 text-slate-200">
							{@render WeatherIcon(weather.code, iconSize)}
							<span class="{isLarge ? 'text-2xl' : isHeight3 ? 'text-lg' : 'text-sm'} font-semibold tabular-nums">{weather.temp}°</span>

							{#if !isHeight1}
								<span class="ml-1 text-neutral-400 {isLarge ? 'text-xs' : 'text-[10px]'}">{getWeatherLabel(weather.code)}</span>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</WidgetCard>

<SettingsDialog title="General Info Settings" bind:show={showSettings} onSave={saveSettings}>
	<div class="space-y-4">
		<div class="space-y-1.5">
			<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="city">City</label>
			<input id="city" bind:value={city} placeholder="e.g. London" class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" onkeydown={(e) => e.stopPropagation()} />
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-1.5">
				<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Temperature</label>
				<select bind:value={unit} class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 appearance-none cursor-pointer">
					<option value="celsius">Celsius (°C)</option>
					<option value="fahrenheit">Fahrenheit (°F)</option>
				</select>
			</div>
			<div class="space-y-1.5">
				<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Time Format</label>
				<select bind:value={hour12} class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 appearance-none cursor-pointer">
					<option value={false}>24h (13:00)</option>
					<option value={true}>12h (1:00 PM)</option>
				</select>
			</div>
		</div>

		<div class="flex flex-col gap-3 pt-2">
			<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Visibility</label>
			<div class="grid grid-cols-3 gap-2">
				<button class="rounded-lg py-2.5 text-xs font-bold transition-colors border border-black/40 {showClock ? 'bg-blue-600 text-white' : 'bg-black/30 text-neutral-500 hover:text-white'}" onclick={() => showClock = !showClock}>Clock</button>
				<button class="rounded-lg py-2.5 text-xs font-bold transition-colors border border-black/40 {showDate ? 'bg-blue-600 text-white' : 'bg-black/30 text-neutral-500 hover:text-white'}" onclick={() => showDate = !showDate}>Date</button>
				<button class="rounded-lg py-2.5 text-xs font-bold transition-colors border border-black/40 {showWeather ? 'bg-blue-600 text-white' : 'bg-black/30 text-neutral-500 hover:text-white'}" onclick={() => showWeather = !showWeather}>Weather</button>
			</div>
		</div>
	</div>
</SettingsDialog>
