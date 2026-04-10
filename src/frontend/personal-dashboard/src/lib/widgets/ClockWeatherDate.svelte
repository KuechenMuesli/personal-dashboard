<script lang="ts">
  import { onMount } from "svelte";

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

  const isSmall = $derived(height === 1);
  const isHeight2 = $derived(height === 2);
  const isHeight3 = $derived(height === 3);
  const isLarge = $derived(height >= 4);
  const isExpanded = $derived(height > 1);
  const isConfigured = $derived(city.trim() !== "" && (lat !== null || !showWeather));

  const showingTimeGroup = $derived(showClock || showDate);
  const showingOnlyOneGroup = $derived((showingTimeGroup && !showWeather) || (!showingTimeGroup && showWeather));

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

  function getWeatherIcon(code: number) {
    if (code <= 1) return "☀️";
    if (code <= 3) return "☁️";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "❄️";
    return "⛈️";
  }

  $effect(() => {
    if (showSettings && dialogEl) dialogEl.showModal();
    else if (dialogEl?.open) dialogEl.close();
  });
</script>

<div class="flex h-full w-full bg-neutral-800 font-sans text-white overflow-hidden transition-all {isHeight2 ? 'p-3' : 'p-4'}">
	{#if !isConfigured && showWeather}
		<button onclick={() => showSettings = true} class="flex w-full items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-blue-400">
			<span>⚙️</span> Configure Location
		</button>
	{:else}
		<div class="flex w-full {isExpanded ? 'flex-col justify-center' : 'flex-row items-center justify-between'} {isHeight2 ? 'gap-1' : 'gap-4'}">

			{#if showingTimeGroup}
				<div class="flex flex-col {isExpanded ? 'items-start flex-1 justify-center' : 'items-baseline gap-3'}">
					{#if showClock}
            <span class="font-bold tabular-nums tracking-tight
              {isLarge ? 'text-5xl mb-1' : isHeight3 ? 'text-3xl' : isHeight2 ? 'text-2xl leading-none' : 'text-xl'}">
              {timeString}
            </span>
					{/if}
					{#if showDate}
            <span class="font-medium uppercase tracking-wider
              {isLarge ? 'text-sm text-blue-400' : isHeight3 ? 'text-xs text-blue-400' : isHeight2 ? 'text-[10px] text-blue-400' : 'text-[11px] text-neutral-400'}">
              {isLarge ? dateStringYear : (isHeight3 || isHeight2) ? dateStringFull : dateStringShort}
            </span>
					{/if}
				</div>
			{/if}

			{#if showWeather && weather}
				<div class="flex {isExpanded ? 'flex-col items-start flex-1 justify-center' : 'items-center gap-2 border-l border-neutral-700 pl-4'} {isExpanded && !showingOnlyOneGroup ? 'mt-1 pt-1 border-t border-neutral-700/50' : ''}">
					{#if isLarge}
						<div class="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">{city}</div>
					{/if}
					<div class="flex items-center gap-2">
						<span class="{isLarge ? 'text-3xl' : isHeight3 ? 'text-xl' : 'text-lg'}">{getWeatherIcon(weather.code)}</span>
						<span class="{isLarge ? 'text-2xl' : isHeight3 ? 'text-lg' : 'text-sm'} font-semibold tabular-nums">{weather.temp}°</span>
						{#if isExpanded}
							<span class="ml-1 text-neutral-400 {isLarge ? 'text-xs' : 'text-[10px]'}">{getWeatherLabel(weather.code)}</span>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<dialog bind:this={dialogEl} class="fixed left-1/2 top-1/2 m-0 w-[90vw] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-800 bg-neutral-900 p-0 text-white shadow-2xl outline-none backdrop:bg-black/80 backdrop:backdrop-blur-sm" onclose={() => (showSettings = false)}>
	<div class="flex flex-col gap-5 p-6">
		<header class="flex items-center justify-between">
			<h3 class="text-lg font-bold">General Info Settings</h3>
			<button class="text-2xl text-neutral-500 hover:text-white" onclick={() => (showSettings = false)}>&times;</button>
		</header>

		<div class="space-y-4">
			<div class="space-y-1.5">
				<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="city">City</label>
				<input id="city" bind:value={city} placeholder="e.g. London" class="w-full rounded-lg border border-neutral-800 bg-neutral-800 p-3 text-sm text-white outline-none focus:border-blue-500" onkeydown={(e) => e.stopPropagation()} />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-1.5">
					<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Temperature</label>
					<select bind:value={unit} class="w-full rounded-lg border border-neutral-800 bg-neutral-800 p-2 text-sm text-white outline-none">
						<option value="celsius">Celsius (°C)</option>
						<option value="fahrenheit">Fahrenheit (°F)</option>
					</select>
				</div>
				<div class="space-y-1.5">
					<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Time Format</label>
					<select bind:value={hour12} class="w-full rounded-lg border border-neutral-800 bg-neutral-800 p-2 text-sm text-white outline-none">
						<option value={false}>24h (13:00)</option>
						<option value={true}>12h (1:00 PM)</option>
					</select>
				</div>
			</div>

			<div class="flex flex-col gap-3">
				<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Visibility</label>
				<div class="grid grid-cols-3 gap-2">
					<button class="rounded-lg py-2 text-xs font-bold transition-colors {showClock ? 'bg-blue-600' : 'bg-neutral-800 text-neutral-500'}" onclick={() => showClock = !showClock}>Clock</button>
					<button class="rounded-lg py-2 text-xs font-bold transition-colors {showDate ? 'bg-blue-600' : 'bg-neutral-800 text-neutral-500'}" onclick={() => showDate = !showDate}>Date</button>
					<button class="rounded-lg py-2 text-xs font-bold transition-colors {showWeather ? 'bg-blue-600' : 'bg-neutral-800 text-neutral-500'}" onclick={() => showWeather = !showWeather}>Weather</button>
				</div>
			</div>
		</div>

		<footer class="mt-2 flex justify-end gap-2">
			<button class="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-800" onclick={() => (showSettings = false)}>Cancel</button>
			<button class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-500" onclick={saveSettings}>Save</button>
		</footer>
	</div>
</dialog>
