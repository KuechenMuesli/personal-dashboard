<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { slide } from "svelte/transition";
  import { Clock, MapPin, FileText, Pencil, X, GripVertical } from "lucide-svelte";
  // @ts-ignore
  import ICAL from 'ical.js';
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import WidgetTabs from "$lib/components/WidgetTabs.svelte";
  import DraggableList from "$lib/components/DraggableList.svelte";

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

  const PROXY_URL = "/api/proxy";

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
    localStorage.setItem('global-calendar-events', JSON.stringify(loadedCalendars));
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
        url: newCalUrl.replace("webcal://", "https://"),
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
    try {
      const jcalData = ICAL.parse(icsData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');
      
      const now = new Date();
      // Expand events up to 1 year into the future and 1 month in the past
      const maxDate = new Date();
      maxDate.setFullYear(now.getFullYear() + 1);
      
      for (const vevent of vevents) {
        const event = new ICAL.Event(vevent);
        if (!event.startDate) continue;

        if (event.isRecurring()) {
          const expand = event.iterator();
          let next;
          // Prevent infinite loops just in case
          let maxIterations = 500;
          while ((next = expand.next()) && next.toJSDate() < maxDate && maxIterations > 0) {
            maxIterations--;
            const duration = event.endDate ? event.endDate.toJSDate().getTime() - event.startDate.toJSDate().getTime() : 0;
            events.push({
              id: Math.random().toString(36).substring(2, 11),
              title: event.summary,
              description: event.description || undefined,
              location: event.location || undefined,
              start: next.toJSDate(),
              end: new Date(next.toJSDate().getTime() + duration)
            });
          }
        } else {
          events.push({
            id: Math.random().toString(36).substring(2, 11),
            title: event.summary,
            description: event.description || undefined,
            location: event.location || undefined,
            start: event.startDate.toJSDate(),
            end: event.endDate ? event.endDate.toJSDate() : event.startDate.toJSDate()
          });
        }
      }
    } catch (e) {
      console.error("Failed to parse ICS with ical.js", e);
    }
    return events;
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

{#snippet calendarHeader()}
	<WidgetTabs
		options={[
			{ value: 'today', label: 'Today' },
			{ value: 'upcoming', label: 'Upcoming' },
			{ value: 'grouped', label: 'Grouped' }
		]}
		bind:selected={viewMode as any}
		onChange={() => { saveSettingsLocally(); expandedEventId = null; }}
	/>
{/snippet}

{#snippet eventItem(event: CalendarEvent, dateLabel: string, showCalName: boolean)}
	<button
			class="flex flex-col gap-2 rounded-lg bg-black/20 p-2.5 transition-colors hover:bg-black/40 border border-transparent hover:border-black/40 cursor-pointer overflow-hidden w-full text-left"
			onclick={() => toggleExpand(event.id)}
	>
		<div class="flex items-start gap-3 w-full">
			<div class="w-1 rounded-full shrink-0 mt-1" style="background-color: {event.calColor}; min-height: 24px;"></div>
			<div class="flex flex-col overflow-hidden min-w-0 flex-grow">
				<span class="text-sm font-bold text-slate-200 {isLarge ? 'text-base' : ''} {expandedEventId === event.id ? '' : 'truncate'}">{event.title}</span>
				{#if showCalName && !isHeight1}
					<span class="truncate text-[10px] text-neutral-500 font-medium">{event.calName}</span>
				{/if}
			</div>
			<div class="flex flex-col items-end shrink-0 text-right">
				<span class="text-xs font-semibold tabular-nums text-blue-400">{dateLabel}</span>
				<span class="text-[10px] tabular-nums text-neutral-500">{formatTime(event.start)}</span>
			</div>
		</div>

		{#if expandedEventId === event.id}
			<div transition:slide={{ duration: 200 }} class="w-full text-xs text-neutral-300 pl-4 ml-1 space-y-2 mt-1 border-l-2 border-black/40 pb-1 cursor-default" onclick={(e) => e.stopPropagation()}>

				<div class="flex gap-2 items-start text-neutral-400">
					<Clock class="shrink-0 mt-0.5 text-neutral-500" size={12} strokeWidth={2.5} />
					<span>{formatDateTimeFull(event.start)} - {formatTime(event.end)}</span>
				</div>

				{#if event.location}
					<div class="flex gap-2 items-start">
						<MapPin class="shrink-0 mt-0.5 text-neutral-500" size={12} strokeWidth={2.5} />
						<span class="break-words font-medium">{event.location}</span>
					</div>
				{/if}

				{#if event.description}
					<div class="flex gap-2 items-start">
						<FileText class="shrink-0 mt-0.5 text-neutral-500" size={12} strokeWidth={2.5} />
						<div class="whitespace-pre-wrap break-words text-neutral-400 leading-relaxed max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 pr-2">{event.description}</div>
					</div>
				{/if}
			</div>
		{/if}
	</button>
{/snippet}

{#snippet groupedEventItem(event: CalendarEvent)}
	<button
			class="flex flex-col cursor-pointer rounded p-1.5 -mx-1.5 hover:bg-black/20 transition-colors w-full text-left"
			onclick={() => toggleExpand(event.id)}
	>
		<div class="flex items-baseline justify-between gap-2 w-full">
			<span class="text-xs text-slate-200 {expandedEventId === event.id ? '' : 'truncate'}">{event.title}</span>
			<span class="shrink-0 text-[10px] text-neutral-500 tabular-nums">{formatDateShort(event.start)}</span>
		</div>

		{#if expandedEventId === event.id}
			<div transition:slide={{ duration: 200 }} class="text-[10px] text-neutral-400 mt-2 space-y-1.5 bg-black/30 rounded-lg p-2.5 cursor-default w-full" onclick={(e) => e.stopPropagation()}>
				<div class="flex gap-1.5 items-start">
					<Clock class="shrink-0 mt-0.5 text-neutral-500" size={10} strokeWidth={2.5} />
					<span>{formatDateTimeFull(event.start)} - {formatTime(event.end)}</span>
				</div>
				{#if event.location}
					<div class="flex gap-1.5 items-start">
						<MapPin class="shrink-0 mt-0.5 text-neutral-500" size={10} strokeWidth={2.5} />
						<span class="break-words text-neutral-300">{event.location}</span>
					</div>
				{/if}
				{#if event.description}
					<div class="whitespace-pre-wrap break-words pt-1.5 border-t border-black/40 mt-1.5 leading-relaxed max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700">{event.description}</div>
				{/if}
			</div>
		{/if}
	</button>
{/snippet}

<WidgetCard
		title={isLoading ? 'Syncing...' : 'Calendar'}
		bind:showSettings={showSettings}
		isConfigured={isConfigured}
		padding={!isHeight1}
		headerActions={!isHeight1 ? calendarHeader : undefined}
>
	<div class="h-full w-full {isHeight1 ? 'flex items-center px-4' : 'pr-1'}">
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
				<div class="flex h-full items-center justify-center text-xs text-neutral-500 italic pb-4">No upcoming events.</div>
			{:else}
				<div class="flex flex-col gap-2 w-full">
					{#each upcomingEvents().slice(0, isHeight1 ? 1 : undefined) as event (event.id)}
						{@render eventItem(event, formatDateShort(event.start), true)}
					{/each}
				</div>
			{/if}

		{:else if viewMode === 'grouped'}
			<div class="space-y-5 pb-2">
				{#each calendarsData as calendar}
					<section>
						<h3 class="flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wide" style="color: {calendar.color}">
							<span class="w-2 h-2 rounded-full bg-current shrink-0"></span>
							<span class="truncate">{calendar.name}</span>
						</h3>
						{#if calendar.events.filter(e => e.end > new Date()).length === 0}
							<div class="text-[10px] text-neutral-600 pl-4">No upcoming events.</div>
						{:else}
							<div class="flex flex-col gap-0.5 pl-4 border-l border-black/40 ml-1">
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
</WidgetCard>

<SettingsDialog
		title="Calendar Settings"
		bind:show={showSettings}
		data={[storedConfigs, viewMode] as any}
		onRevert={(restored) => { storedConfigs = restored[0]; viewMode = restored[1]; }}
		onSave={saveAndCloseSettings}
>
	<div class="space-y-6">

		<div class="space-y-2">
			<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Active Calendars</label>
			{#if storedConfigs.length === 0}
				<div class="text-sm text-neutral-600 italic rounded-lg border border-black/40 border-dashed p-4 text-center">No calendars added yet.</div>
			{:else}
				<DraggableList 
					bind:items={storedConfigs} 
					handleClass="drag-handle"
					listClass="flex flex-col gap-2"
					itemClass="flex items-center justify-between gap-3 rounded-lg bg-neutral-900 p-2.5 border border-black/40"
				>
					{#snippet children(config, i)}
							<div class="flex items-center gap-2 overflow-hidden">
								<div class="drag-handle cursor-grab active:cursor-grabbing text-neutral-500 hover:text-white transition-colors shrink-0 px-1">
									<GripVertical size={16} strokeWidth={2.5} />
								</div>
								<div class="w-3 h-3 rounded-full shrink-0" style="background-color: {config.color}"></div>
								<span class="font-medium text-sm truncate text-slate-200 {editingCalId === config.id ? 'text-blue-400' : ''}">{config.name}</span>
							</div>
							<div class="flex items-center gap-1">
								<button
										onclick={() => editCalendar(config)}
										class="shrink-0 h-6 w-6 flex items-center justify-center rounded bg-black/30 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
										title="Edit Calendar"
								>
									<Pencil size={12} strokeWidth={2.5} />
								</button>
								<button
										onclick={() => removeCalendar(config.id)}
										class="shrink-0 h-6 w-6 flex items-center justify-center rounded bg-black/30 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
										title="Remove Calendar"
								>
									<X size={12} strokeWidth={2.5} />
								</button>
							</div>
					{/snippet}
				</DraggableList>
			{/if}
		</div>

		<div class="space-y-3 border-t border-black/40 pt-5">
			<div class="flex justify-between items-center">
				<label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">
					{editingCalId ? 'Edit Calendar' : 'Add New Calendar'}
				</label>
				{#if editingCalId}
					<button onclick={resetForm} class="text-[10px] font-bold text-neutral-400 hover:text-white uppercase tracking-wider">Cancel Edit</button>
				{/if}
			</div>

			<div class="grid grid-cols-[1fr_auto] gap-3">
				<input bind:value={newCalName} placeholder="Calendar Name (e.g. Work)" class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" onkeydown={(e) => e.stopPropagation()} />
				<input type="color" bind:value={newCalColor} class="h-[42px] w-[42px] rounded-lg cursor-pointer border border-black/40 bg-neutral-900" title="Pick a color" />
			</div>

			<input bind:value={newCalUrl} placeholder="ICS URL (https://...)" class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 font-mono text-[11px]" onkeydown={(e) => e.stopPropagation()} />

			<button
					onclick={saveCalendar}
					disabled={!newCalUrl || !newCalName}
					class="w-full rounded-lg bg-black/40 py-2.5 text-sm font-bold text-white hover:bg-black/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-black/40"
			>
				{editingCalId ? 'Save Changes' : '+ Add to List'}
			</button>
		</div>

	</div>
</SettingsDialog>
