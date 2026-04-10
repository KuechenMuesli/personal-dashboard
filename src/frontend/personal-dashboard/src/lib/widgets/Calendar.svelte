<script lang="ts">
  import { onMount, untrack } from "svelte";

  let { id, height, width, showSettings = $bindable(false) } = $props<{
    id: string;
    height: number;
    width: number;
    showSettings: boolean;
  }>();

  interface CalendarSource {
    url: string;
    color: string;
  }

  interface CalendarEvent {
    summary: string;
    start: Date;
    location: string;
    color: string;
  }

  const WORKER_DOMAIN = "https://raspy-cloud-c6cd.kuechenmuesli.workers.dev";
  let lastFetchTimestamp = 0;

  let calendars = $state<CalendarSource[]>([]);
  let events = $state<CalendarEvent[]>([]);
  let viewMode = $state<"upcoming" | "today">("upcoming");
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  let dialogEl: HTMLDialogElement;

  // Initial Load and Sync
  $effect(() => {
    // We only track 'id' and 'showSettings'
    // If settings are closed, we refresh the data
    if (!showSettings) {
      untrack(() => {
        const saved = localStorage.getItem(`calendar-settings-${id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);

            // Handle migration from old single string format
            if (typeof parsed.icalUrl === 'string' && parsed.icalUrl) {
              calendars = [{ url: parsed.icalUrl, color: '#3b82f6' }];
            } else {
              calendars = parsed.calendars || [];
            }

            viewMode = parsed.viewMode || "upcoming";
            if (calendars.length > 0) fetchAllCalendars();
          } catch (e) {
            console.error("Failed to parse calendar settings:", e);
          }
        }
      });
    }
  });

  $effect(() => {
    if (showSettings) dialogEl?.showModal();
    else dialogEl?.close();
  });

  async function fetchAllCalendars() {
    // Guard: Prevent more than one fetch every 2 seconds to stop 503 loops
    const now = Date.now();
    if (now - lastFetchTimestamp < 2000) return;

    lastFetchTimestamp = now;
    isLoading = true;
    error = null;

    try {
      const fetchPromises = calendars.map(async (cal) => {
        if (!cal.url || cal.url.trim() === "") return [];

        let input = cal.url.trim();
        if (!input.startsWith('http') && !input.startsWith('webcal')) {
          input = 'https://' + input;
        }
        const cleanUrl = input.replace(/^webcal:\/\//i, 'https://');

        try {
          const urlObj = new URL(cleanUrl);
          const proxyUrl = `${WORKER_DOMAIN}/calendar${urlObj.pathname}${urlObj.search}`;

          const response = await fetch(proxyUrl);
          if (!response.ok) return [];

          const text = await response.text();
          return parseICS(text, cal.color);
        } catch (e) {
          console.warn("Skipping invalid calendar URL:", cal.url);
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      const allEvents = results.flat();

      // Filter and Sort: keep events from 1 hour ago into the future
      events = allEvents
        .filter(e => e.start >= new Date(Date.now() - 3600000))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    } catch (e) {
      error = "Connection error";
      console.error(e);
    } finally {
      isLoading = false;
    }
  }

  function parseICS(data: string, color: string): CalendarEvent[] {
    const evs: CalendarEvent[] = [];

    // 1. Unfold lines: ICS lines starting with a space/tab are continuations
    const unfoldedData = data.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');

    // 2. Split into individual events
    const vevents = unfoldedData.split(/BEGIN:VEVENT/i);
    vevents.shift();

    vevents.forEach((vevent) => {
      // Improved Regex to handle various line endings and property parameters
      const summaryMatch = vevent.match(/^SUMMARY[:;](.*)$/m);
      const startMatch = vevent.match(/^DTSTART[:;](?:TZID=.*:)?(\d{8}T\d{6}Z?)/m);
      const locationMatch = vevent.match(/^LOCATION[:;](.*)$/m);

      if (startMatch) {
        const s = startMatch[1];
        const date = new Date(Date.UTC(
          parseInt(s.substring(0, 4)),
          parseInt(s.substring(4, 6)) - 1,
          parseInt(s.substring(6, 8)),
          parseInt(s.substring(9, 11)),
          parseInt(s.substring(11, 13))
        ));

        // Clean up ICS escape characters (e.g., \, or \n)
        const cleanText = (txt: string) => txt.trim()
          .replace(/\\,/g, ',')
          .replace(/\\n/g, ' ')
          .replace(/\\;/g, ';');

        evs.push({
          summary: summaryMatch ? cleanText(summaryMatch[1]) : "Untitled Event",
          start: date,
          location: locationMatch ? cleanText(locationMatch[1]) : "",
          color
        });
      }
    });
    return evs;
  }

  function saveSettings() {
    localStorage.setItem(`calendar-settings-${id}`, JSON.stringify({ calendars, viewMode }));
    // fetchAllCalendars is triggered via the $effect when showSettings becomes false
    showSettings = false;
  }

  function addCalendar() {
    calendars.push({ url: '', color: '#3b82f6' });
  }

  const filteredEvents = $derived(
    viewMode === "today"
      ? events.filter(e => e.start.toDateString() === new Date().toDateString())
      : events.slice(0, 15)
  );
</script>

<div class="flex h-full w-full flex-col bg-neutral-800 p-3 text-white overflow-hidden box-border">
	<header class="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
		<h3 class="text-[10px] font-black uppercase tracking-widest text-neutral-500">
			{viewMode} Events
		</h3>
		<div class="flex gap-1">
			<div class="h-1.5 w-1.5 rounded-full {isLoading ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}"></div>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto pr-1 scrollbar-hide">
		{#if error}
			<p class="py-4 text-center text-xs text-red-400">{error}</p>
		{:else if filteredEvents.length === 0 && !isLoading}
			<p class="py-8 text-center text-xs text-neutral-500">No events found</p>
		{:else}
			<div class="flex flex-col gap-2">
				{#each filteredEvents as event}
					<div class="group relative flex flex-col gap-0.5 overflow-hidden rounded-xl bg-neutral-900/40 p-2 pl-3.5 transition-all hover:bg-neutral-900/60">
						<div class="absolute left-0 top-0 h-full w-1" style="background-color: {event.color}"></div>

						<div class="flex items-start justify-between gap-2">
							<span class="truncate text-xs font-medium text-white/90">{event.summary}</span>
							<span class="shrink-0 text-[10px] font-bold" style="color: {event.color}">
                {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
						</div>
						<div class="flex items-center justify-between text-[9px] text-neutral-500 font-mono">
							<span>{event.start.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
							{#if event.location}
								<span class="truncate max-w-[120px] italic opacity-60">@ {event.location}</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<dialog
		bind:this={dialogEl}
		onclose={() => (showSettings = false)}
		class="fixed left-1/2 top-1/2 m-0 w-[95vw] max-w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-none bg-neutral-900 p-0 text-white outline-none backdrop:bg-black/85 backdrop:backdrop-blur-sm"
>
	<div class="p-6">
		<header class="mb-5 flex items-center justify-between">
			<h3 class="text-xs font-black uppercase tracking-widest text-neutral-500">Calendar Settings</h3>
			<button
					class="rounded-lg bg-neutral-800 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-neutral-700 transition-colors"
					onclick={addCalendar}
			>+ ADD CALENDAR</button>
		</header>

		<div class="flex max-h-[350px] flex-col gap-3 overflow-y-auto pr-2 custom-scroll">
			{#each calendars as cal, i}
				<div class="flex items-center gap-2 rounded-xl bg-neutral-800/40 p-2 border border-white/5 shadow-sm">
					<input type="color" bind:value={cal.color} class="h-8 w-8 shrink-0 cursor-pointer rounded border-none bg-transparent" />
					<input
							type="text"
							bind:value={cal.url}
							placeholder="iCal URL..."
							class="flex-1 rounded-lg bg-neutral-900 p-2 text-xs text-white outline-none ring-blue-500 focus:ring-1"
					/>
					<button
							class="px-2 text-neutral-500 hover:text-red-500 transition-colors"
							onclick={() => calendars.splice(i, 1)}
					>×</button>
				</div>
			{/each}

			<div class="mt-2 flex flex-col gap-1.5">
				<label class="text-[10px] font-bold text-neutral-400 uppercase">Default View</label>
				<div class="flex bg-neutral-800 p-1 rounded-lg">
					{#each ["upcoming", "today"] as mode}
						<button
								onclick={() => (viewMode = mode as any)}
								class="flex-1 py-1.5 text-[10px] font-bold rounded uppercase transition-all
              {viewMode === mode ? 'bg-neutral-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}"
						>
							{mode}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<footer class="mt-8 flex justify-end gap-3 border-t border-neutral-800 pt-4">
			<button class="px-4 py-2 text-sm text-neutral-500 hover:text-white" onclick={() => (showSettings = false)}>Cancel</button>
			<button class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-500" onclick={saveSettings}>Save Changes</button>
		</footer>
	</div>
</dialog>

<style>
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .custom-scroll::-webkit-scrollbar { width: 4px; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
</style>
