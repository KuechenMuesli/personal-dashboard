<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { slide } from "svelte/transition";

  interface StoredCalendar {
    id: string;
    url: string;
    name: string;
    color: string;
  }

  interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
    calName?: string;
    calColor?: string;
  }

  interface Calendar {
    name: string;
    color: string;
    events: CalendarEvent[];
  }

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

  let storedConfigs = $state<StoredCalendar[]>([]);
  let calendarsData = $state<Calendar[]>([]);
  let viewMode = $state<"today" | "upcoming" | "grouped">("upcoming");

  let dialogEl = $state<HTMLDialogElement | null>(null);
  let isLoading = $state(false);
  let expandedEventId = $state<string | null>(null);

  let editingCalId = $state<string | null>(null);
  let newCalUrl = $state("");
  let newCalName = $state("");
  let newCalColor = $state("#3b82f6");

  const PROXY_URL = "https://raspy-cloud-c6cd.kuechenmuesli.workers.dev/";

  const isHeight1 = $derived(height === 1);
  const isLarge = $derived(height >= 3);
  const isConfigured = $derived(storedConfigs.length > 0);

  const upcomingEvents = $derived(() => {
    const now = new Date();
    let all: CalendarEvent[] = [];
    calendarsData.forEach(cal => {
      cal.events.forEach(ev => {
        all.push({ ...ev, calName: cal.name, calColor: cal.color });
      });
    });
    return all
      .filter(e => e.end > now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 5);
  });

  const todayEvents = $derived(() => {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let all: CalendarEvent[] = [];
    calendarsData.forEach(cal => {
      cal.events.forEach(ev => {
        all.push({ ...ev, calName: cal.name, calColor: cal.color });
      });
    });
    return all
      .filter(e => e.start <= endOfToday && e.end > now)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  });

  onMount(() => {
    loadSettings();
    if (storedConfigs.length > 0) fetchAllCalendars();

    const refreshTimer = setInterval(fetchAllCalendars, 60 * 60 * 1000);
    return () => clearInterval(refreshTimer);
  });

  function loadSettings() {
    const saved = localStorage.getItem(`stored-calendars-${id}`);
    const savedMode = localStorage.getItem(`calendar-viewmode-${id}`);
    if (saved) {
      try { storedConfigs = JSON.parse(saved); } catch (e) { console.error(e); }
    }
    if (savedMode === "grouped" || savedMode === "upcoming" || savedMode === "today") {
      viewMode = savedMode;
    }
  }

  function saveSettingsLocally() {
    localStorage.setItem(`stored-calendars-${id}`, JSON.stringify(storedConfigs));
    localStorage.setItem(`calendar-viewmode-${id}`, viewMode);
  }

  async function fetchAllCalendars() {
    isLoading = true;
    const loadedCalendars: Calendar[] = [];

    for (const config of storedConfigs) {
      try {
        const proxiedUrl = `${PROXY_URL}?target=${encodeURIComponent(config.url)}`;
        const response = await fetch(proxiedUrl);

        if (!response.ok) continue;

        const text = await response.text();
        const data = parseICS(text);

        loadedCalendars.push({
          name: config.name,
          color: config.color,
          events: data
        });
      } catch (e) {
        console.error(`Failed to fetch calendar: ${config.name}`, e);
      }
    }
    calendarsData = loadedCalendars;
    isLoading = false;
  }

  function saveCalendar() {
    if (!newCalUrl || !newCalName) return;

    if (editingCalId) {
      storedConfigs = storedConfigs.map(c =>
        c.id === editingCalId
          ? { ...c, url: newCalUrl, name: newCalName, color: newCalColor }
          : c
      );
      editingCalId = null;
    } else {
      storedConfigs = [...storedConfigs, {
        id: Math.random().toString(36).substr(2, 9),
        url: newCalUrl,
        name: newCalName,
        color: newCalColor
      }];
    }
    resetForm();
  }

  function editCalendar(config: StoredCalendar) {
    editingCalId = config.id;
    newCalName = config.name;
    newCalUrl = config.url;
    newCalColor = config.color;
  }

  function resetForm() {
    editingCalId = null;
    newCalUrl = "";
    newCalName = "";
    newCalColor = "#3b82f6";
  }

  function removeCalendar(calId: string) {
    storedConfigs = storedConfigs.filter(c => c.id !== calId);
    if (editingCalId === calId) resetForm();
  }

  async function saveAndCloseSettings() {
    saveSettingsLocally();
    showSettings = false;
    await fetchAllCalendars();
  }

  function parseICS(icsData: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const unfoldedData = icsData.replace(/\r?\n[ \t]/g, '');
    const lines = unfoldedData.split(/\r?\n/);

    let currentEvent: Partial<CalendarEvent> | null = null;

    for (let line of lines) {
      if (line.startsWith("BEGIN:VEVENT")) {
        currentEvent = { id: Math.random().toString(36).substring(2, 11) };
      } else if (line.startsWith("END:VEVENT") && currentEvent) {
        if (currentEvent.start && currentEvent.title) {
          events.push(currentEvent as CalendarEvent);
        }
        currentEvent = null;
      } else if (currentEvent) {
        const colonIdx = line.indexOf(":");
        if (colonIdx > -1) {
          const key = line.substring(0, colonIdx);
          const value = line.substring(colonIdx + 1).trim();

          if (key.startsWith("DTSTART")) {
            currentEvent.start = parseIcsDate(value);
          } else if (key.startsWith("DTEND")) {
            currentEvent.end = parseIcsDate(value);
          } else if (key.startsWith("SUMMARY")) {
            currentEvent.title = value.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, ' ');
          } else if (key.startsWith("LOCATION")) {
            currentEvent.location = value.replace(/\\,/g, ',').replace(/\\n/g, ', ');
          } else if (key.startsWith("DESCRIPTION")) {
            currentEvent.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
          }
        }
      }
    }
    return events;
  }

  function parseIcsDate(icsDate: string): Date {
    const year = parseInt(icsDate.substring(0, 4));
    const month = parseInt(icsDate.substring(4, 6)) - 1;
    const day = parseInt(icsDate.substring(6, 8));
    const hour = parseInt(icsDate.substring(9, 11)) || 0;
    const min = parseInt(icsDate.substring(11, 13)) || 0;
    const sec = parseInt(icsDate.substring(13, 15)) || 0;

    return icsDate.includes("Z")
      ? new Date(Date.UTC(year, month, day, hour, min, sec))
      : new Date(year, month, day, hour, min, sec);
  }

  function formatDateShort(date: Date) {
    return date.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: '2-digit' });
  }

  function formatDateTimeFull(date: Date) {
    return date.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function toggleExpand(eventId: string) {
    expandedEventId = expandedEventId === eventId ? null : eventId;
  }

  $effect(() => {
    if (showSettings && dialogEl) dialogEl.showModal();
    else if (dialogEl?.open) {
      dialogEl.close();
      resetForm();
    }
  });
</script>

{#snippet eventItem(event: CalendarEvent, dateLabel: string, showCalName: boolean)}
	<button
			class="flex flex-col gap-2 rounded-lg bg-neutral-900/50 p-2.5 transition-colors hover:bg-neutral-900 border border-transparent hover:border-white/5 cursor-pointer overflow-hidden w-full text-left"
			onclick={() => toggleExpand(event.id)}
	>
		<div class="flex items-start gap-3 w-full">
			<div class="w-1 rounded-full shrink-0 mt-1" style="background-color: {event.calColor}; min-height: 24px;"></div>
			<div class="flex flex-col overflow-hidden min-w-0 flex-grow">
				<span class="text-sm font-bold {isLarge ? 'text-base' : ''} {expandedEventId === event.id ? '' : 'truncate'}">{event.title}</span>
				{#if showCalName && !isHeight1}
					<span class="truncate text-[10px] text-neutral-400 font-medium">{event.calName}</span>
				{/if}
			</div>
			<div class="flex flex-col items-end shrink-0 text-right">
				<span class="text-xs font-semibold tabular-nums text-blue-400">{dateLabel}</span>
				<span class="text-[10px] tabular-nums text-neutral-500">{formatTime(event.start)}</span>
			</div>
		</div>

		{#if expandedEventId === event.id}
			<div transition:slide={{ duration: 200 }} class="w-full text-xs text-neutral-300 pl-4 ml-1 space-y-2 mt-1 border-l-2 border-white/10 pb-1 cursor-default" onclick={(e) => e.stopPropagation()}>
				<div class="flex gap-2 items-start text-neutral-400">
					<span class="text-neutral-500 shrink-0 mt-0.5">🕒</span>
					<span>{formatDateTimeFull(event.start)} - {formatTime(event.end)}</span>
				</div>
				{#if event.location}
					<div class="flex gap-2 items-start">
						<span class="text-neutral-500 shrink-0 mt-0.5">📍</span>
						<span class="break-words font-medium">{event.location}</span>
					</div>
				{/if}
				{#if event.description}
					<div class="flex gap-2 items-start">
						<span class="text-neutral-500 shrink-0 mt-0.5">📝</span>
						<div class="whitespace-pre-wrap break-words text-neutral-400 leading-relaxed max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 pr-2">{event.description}</div>
					</div>
				{/if}
			</div>
		{/if}
	</button>
{/snippet}

{#snippet groupedEventItem(event: CalendarEvent)}
	<button
			class="flex flex-col cursor-pointer rounded p-1.5 -mx-1.5 hover:bg-white/5 transition-colors w-full text-left"
			onclick={() => toggleExpand(event.id)}
	>
		<div class="flex items-baseline justify-between gap-2 w-full">
			<span class="text-xs text-neutral-300 {expandedEventId === event.id ? '' : 'truncate'}">{event.title}</span>
			<span class="shrink-0 text-[10px] text-neutral-500 tabular-nums">{formatDateShort(event.start)}</span>
		</div>

		{#if expandedEventId === event.id}
			<div transition:slide={{ duration: 200 }} class="text-[10px] text-neutral-400 mt-2 space-y-1.5 bg-black/20 rounded-lg p-2.5 cursor-default w-full" onclick={(e) => e.stopPropagation()}>
				<div class="flex gap-1.5 items-start">
					<span class="text-neutral-500 shrink-0 mt-0.5">🕒</span>
					<span>{formatDateTimeFull(event.start)} - {formatTime(event.end)}</span>
				</div>
				{#if event.location}
					<div class="flex gap-1.5 items-start">
						<span class="text-neutral-500 shrink-0 mt-0.5">📍</span>
						<span class="break-words text-neutral-300">{event.location}</span>
					</div>
				{/if}
				{#if event.description}
					<div class="whitespace-pre-wrap break-words pt-1.5 border-t border-white/5 mt-1.5 leading-relaxed max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700">{event.description}</div>
				{/if}
			</div>
		{/if}
	</button>
{/snippet}


<div class="flex h-full w-full flex-col bg-neutral-800 font-sans text-white overflow-hidden transition-all {isHeight1 ? 'px-4 py-0 justify-center' : 'p-4'}">
	{#if !isConfigured}
		<button onclick={() => showSettings = true} class="flex h-full w-full items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-blue-400">
			<span>⚙️</span> Configure Calendars
		</button>
	{:else}
		{#if !isHeight1}
			<div class="flex shrink-0 items-center justify-between mb-3 border-b border-white/10 pb-2">
				<h2 class="text-xs font-black uppercase tracking-widest text-neutral-500">
					{isLoading ? 'Syncing...' : 'Calendar'}
				</h2>

				<div class="flex gap-1 bg-black/20 rounded p-0.5">
					<button
							class="rounded px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors {viewMode === 'today' ? 'bg-neutral-600 text-white' : 'text-neutral-500 hover:text-white'}"
							onclick={() => { viewMode = 'today'; saveSettingsLocally(); expandedEventId = null; }}
					>Today</button>
					<button
							class="rounded px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors {viewMode === 'upcoming' ? 'bg-neutral-600 text-white' : 'text-neutral-500 hover:text-white'}"
							onclick={() => { viewMode = 'upcoming'; saveSettingsLocally(); expandedEventId = null; }}
					>Upcoming</button>
					<button
							class="rounded px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors {viewMode === 'grouped' ? 'bg-neutral-600 text-white' : 'text-neutral-500 hover:text-white'}"
							onclick={() => { viewMode = 'grouped'; saveSettingsLocally(); expandedEventId = null; }}
					>Grouped</button>
				</div>
			</div>
		{/if}

		<div class="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent {isHeight1 ? 'flex items-center' : 'pr-1'}">

			{#if viewMode === 'today' && !isHeight1}
				{#if todayEvents().length === 0}
					<div class="flex h-full items-center justify-center text-xs text-neutral-500 italic pb-4">No more events today.</div>
				{:else}
					<div class="flex flex-col gap-2 w-full">
						{#each todayEvents() as event (event.id)}
							{@render eventItem(event, "Today", true)}
						{/each}
					</div>
				{/if}

			{:else if viewMode === 'upcoming' || isHeight1}
				{#if upcomingEvents().length === 0}
					<div class="text-xs text-neutral-500 italic">No upcoming events.</div>
				{:else}
					<div class="flex flex-col gap-2 w-full">
						{#each upcomingEvents().slice(0, isHeight1 ? 1 : undefined) as event (event.id)}
							{@render eventItem(event, formatDateShort(event.start), true)}
						{/each}
					</div>
				{/if}

			{:else if viewMode === 'grouped'}
				<div class="space-y-5">
					{#each calendarsData as calendar}
						<section>
							<h3 class="flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wide" style="color: {calendar.color}">
								<span class="w-2 h-2 rounded-full bg-current shrink-0"></span>
								<span class="truncate">{calendar.name}</span>
							</h3>
							{#if calendar.events.filter(e => e.end > new Date()).length === 0}
								<div class="text-[10px] text-neutral-600 pl-4">No upcoming events.</div>
							{:else}
								<div class="flex flex-col gap-0.5 pl-4 border-l border-white/5 ml-1">
									{#each calendar.events.filter(e => e.end > new Date()).sort((a,b) => a.start.getTime() - b.start.getTime()).slice(0, 5) as event (event.id)}
										{@render groupedEventItem(event)}
									{/each}
								</div>
							{/if}
						</section>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<dialog bind:this={dialogEl} class="fixed left-1/2 top-1/2 m-0 w-[90vw] max-w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-800 bg-neutral-900 p-0 text-white shadow-2xl outline-none backdrop:bg-black/80 backdrop:backdrop-blur-sm" onclose={() => (showSettings = false)}>
	<div class="flex flex-col gap-5 p-6 max-h-[85vh]">
		<header class="flex items-center justify-between shrink-0">
			<h3 class="text-lg font-bold">Calendar Settings</h3>
			<button class="text-2xl text-neutral-500 hover:text-white leading-none" onclick={() => (showSettings = false)}>&times;</button>
		</header>

		<div class="flex-grow overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent pr-2">

			<div class="space-y-2">
				<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Active Calendars</label>
				{#if storedConfigs.length === 0}
					<div class="text-sm text-neutral-600 italic rounded-lg border border-neutral-800 border-dashed p-4 text-center">No calendars added yet.</div>
				{:else}
					<div class="flex flex-col gap-2">
						{#each storedConfigs as config}
							<div class="flex items-center justify-between gap-3 rounded-lg bg-neutral-800/50 p-2.5 border border-white/5 {editingCalId === config.id ? 'ring-1 ring-blue-500' : ''}">
								<div class="flex items-center gap-2 overflow-hidden">
									<div class="w-3 h-3 rounded-full shrink-0" style="background-color: {config.color}"></div>
									<span class="font-medium text-sm truncate">{config.name}</span>
								</div>
								<div class="flex items-center gap-1">
									<button
											onclick={() => editCalendar(config)}
											class="shrink-0 h-6 w-6 flex items-center justify-center rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
											title="Edit Calendar"
									>✎</button>
									<button
											onclick={() => removeCalendar(config.id)}
											class="shrink-0 h-6 w-6 flex items-center justify-center rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
											title="Remove Calendar"
									>×</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="space-y-3 border-t border-neutral-800 pt-5">
				<div class="flex justify-between items-center">
					<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">
						{editingCalId ? 'Edit Calendar' : 'Add New Calendar'}
					</label>
					{#if editingCalId}
						<button onclick={resetForm} class="text-[10px] font-bold text-neutral-400 hover:text-white uppercase tracking-wider">Cancel Edit</button>
					{/if}
				</div>

				<div class="grid grid-cols-[1fr_auto] gap-3">
					<input bind:value={newCalName} placeholder="Calendar Name (e.g. Work)" class="w-full rounded-lg border border-neutral-800 bg-neutral-800 p-2.5 text-sm text-white outline-none focus:border-blue-500" onkeydown={(e) => e.stopPropagation()} />
					<input type="color" bind:value={newCalColor} class="h-[42px] w-[42px] rounded-lg cursor-pointer bg-neutral-800 border-neutral-800" title="Pick a color" />
				</div>

				<input bind:value={newCalUrl} placeholder="ICS URL (https://...)" class="w-full rounded-lg border border-neutral-800 bg-neutral-800 p-2.5 text-sm text-white outline-none focus:border-blue-500 font-mono text-[11px]" onkeydown={(e) => e.stopPropagation()} />

				<button
						onclick={saveCalendar}
						disabled={!newCalUrl || !newCalName}
						class="w-full rounded-lg bg-neutral-800 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/5"
				>
					{editingCalId ? 'Save Changes' : '+ Add to List'}
				</button>
			</div>

		</div>

		<footer class="flex justify-end gap-2 shrink-0 border-t border-neutral-800 pt-4 mt-2">
			<button class="rounded-lg px-4 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors" onclick={() => (showSettings = false)}>Cancel</button>
			<button class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20" onclick={saveAndCloseSettings}>Save & Sync</button>
		</footer>
	</div>
</dialog>
