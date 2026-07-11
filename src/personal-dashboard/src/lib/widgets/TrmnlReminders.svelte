<script lang="ts">
  import { onMount, onDestroy, getContext } from "svelte";
  import { slide } from "svelte/transition";
  import { page } from "$app/stores";
  import { RefreshCw, ListTodo, AlertCircle, Clock, CheckCircle2, Circle } from "lucide-svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import { i18n } from '$lib/i18n/i18n.svelte';

  let { id, isEditing, height, width, showSettings = $bindable(false) } = $props<{
    id: string; isEditing: boolean; height: number; width: number; showSettings: boolean;
  }>();

  const COOLDOWN_MS = 10 * 60 * 1000;

  interface ReminderData {
    d: string; f: boolean; l: string; n: string; o: string; p: string; t: string;
  }

  interface MergedVariables {
    today: ReminderData[];
    future: ReminderData[];
    overdue: ReminderData[];
  }

  let reminders = $state<MergedVariables | null>(null);
  let isLoading = $state(false);
  let lastFetched = $state<number>(0);
  let error = $state(false);
  let dialogEl = $state<HTMLDialogElement | null>(null);
  let expandedId = $state<string | null>(null);
  let refreshTimer: ReturnType<typeof setInterval>;
  let copied = $state(false);
  let showTutorial = $state(false);

  const isWide = $derived(width >= 3);
  const isCompact = $derived(height <= 2);
  const endpointUrl = $derived(`https://dashboard.paul-simon.dev/post-reminders/${id}`);
  const iCloudShortcutUrl = 'https://www.icloud.com/shortcuts/df2447788587455fab2be8b8b4833dc6';

  onMount(() => {
    const cache = localStorage.getItem(`reminders-cache-${id}`);
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        reminders = parsed.data || null;
        lastFetched = parsed.timestamp || 0;
      } catch (e) { console.error(e); }
    }

    const isStale = Date.now() - lastFetched > COOLDOWN_MS;
    if (!reminders || isStale) fetchReminders();

    refreshTimer = setInterval(() => fetchReminders(), COOLDOWN_MS);
  });

  $effect(() => {
    if (!reminders && !isLoading) {
       const timeSinceLastFetch = Date.now() - lastFetched;
       if (timeSinceLastFetch > COOLDOWN_MS) fetchReminders();
    }
  });

  onDestroy(() => clearInterval(refreshTimer));

  async function fetchReminders(force = false) {
    const timeSinceLast = Date.now() - lastFetched;
    if (!force && timeSinceLast < COOLDOWN_MS && reminders && !error) return;

    isLoading = true;
    error = false;

    try {
      const url = `/post-reminders/${id}`;
      const res = await fetch(url, force ? { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-cache' } : undefined);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const json = await res.json();
      if (json && json.merge_variables) {
        reminders = json.merge_variables;
        lastFetched = Date.now();
        localStorage.setItem(`reminders-cache-${id}`, JSON.stringify({
          data: reminders, timestamp: lastFetched
        }));
        localStorage.setItem('global-reminders', JSON.stringify(reminders));
      }
    } catch (e) {
      console.error("Reminders sync failed", e);
      error = true;
    } finally {
      isLoading = false;
    }
  }

  async function saveSettings() {
    showSettings = false;
  }

  function copyUrl() {
    navigator.clipboard.writeText(endpointUrl);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }

  function getPriorityColor(p: string) {
    if (p === "Hoch") return "text-red-500";
    if (p === "Mittel") return "text-yellow-500";
    return "text-neutral-600";
  }

  function getListColor(listName: string) {
    let hash = 0;
    for (let i = 0; i < listName.length; i++) hash = listName.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
  }
</script>

{#snippet headerButtons()}
	<button onclick={(e) => { e.stopPropagation(); fetchReminders(true); }} class="h-5 w-5 flex items-center justify-center rounded text-neutral-500 hover:text-white hover:bg-black/40 transition-colors">
		<RefreshCw size={12} strokeWidth={2.5} class={isLoading ? 'animate-spin' : ''} />
	</button>
{/snippet}

{#snippet reminderItem(item: ReminderData, index: number, group: string)}
	{@const uniqueId = `${group}-${index}`}
	<button
			class="flex w-full flex-col gap-2 rounded-lg bg-black/20 p-2.5 transition-colors hover:bg-black/40 border border-transparent hover:border-black/40 cursor-pointer overflow-hidden text-left"
			onclick={() => expandedId = expandedId === uniqueId ? null : uniqueId}
	>
		<div class="flex items-start gap-2.5 w-full">
			<div class="mt-0.5 shrink-0 {getPriorityColor(item.p)}">
				{#if item.f} <AlertCircle size={14} strokeWidth={2.5} /> {:else} <Circle size={14} strokeWidth={2.5} /> {/if}
			</div>
			<div class="flex flex-col min-w-0 flex-grow">
     <span class="text-xs font-semibold text-slate-200 {expandedId === uniqueId ? '' : 'truncate'}">
       {item.p === 'Hoch' ? '!!! ' : item.p === 'Mittel' ? '!! ' : ''}{item.n}
     </span>
				<div class="flex items-center gap-1.5 mt-1">
					<span class="w-1.5 h-1.5 rounded-full" style="background-color: {getListColor(item.l)}"></span>
					<span class="truncate text-[9px] font-bold uppercase tracking-wider text-neutral-500">{item.l}</span>
					{#if item.d && item.d.includes('T')}
        <span class="text-[9px] text-neutral-600 ml-auto font-mono">
          {new Date(item.d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
					{/if}
				</div>
			</div>
		</div>

		{#if expandedId === uniqueId && (item.o || item.t)}
			<div transition:slide={{ duration: 200 }} class="w-full text-[10px] text-neutral-400 pl-6 ml-0.5 space-y-1.5 mt-1 border-l border-black/40 pb-0.5 cursor-default" onclick={(e) => e.stopPropagation()}>
				{#if item.o} <div class="whitespace-pre-wrap break-words italic">{item.o}</div> {/if}
				{#if item.t}
					<div class="flex flex-wrap gap-1 mt-1">
						{#each item.t.split('\n') as tag}
							{#if tag.trim()} <span class="bg-black/30 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider text-neutral-500">#{tag}</span> {/if}
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</button>
{/snippet}

{#snippet section(title: string, items: ReminderData[], colorClass: string, icon: any, group: string)}
	{#if items && items.length > 0}
		<section class="flex flex-col gap-2 {isWide ? 'flex-1 min-w-0' : 'w-full'}">
			<h3 class="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest {colorClass}">
				<svelte:component this={icon} size={10} strokeWidth={3} /> {title}
			</h3>
			<div class="flex flex-col gap-1.5 border-l border-white/5 pl-2">
				{#each items as item, i}
					{@render reminderItem(item, i, group)}
				{/each}
			</div>
		</section>
	{/if}
{/snippet}

<WidgetCard
		title={isLoading && !reminders ? '...' : i18n.t.w.reminders.title}
		bind:showSettings={showSettings}
		isConfigured={true}
		padding={true} headerActions={headerButtons}
>
	<div class="h-full w-full {isCompact ? 'flex items-center' : 'pt-2'}">
		{#if error && !reminders}
			<div class="flex h-full w-full items-center justify-center text-xs text-red-500 font-medium">{i18n.t.w.trmnlReminders.syncError}</div>
		{:else if !reminders}
			<div class="flex h-full w-full items-center justify-center text-xs text-neutral-500 font-medium text-center">...</div>
		{:else}
			<div class="w-full flex {isWide ? 'flex-row gap-6 items-start' : 'flex-col gap-5'} pb-2">
				{@render section(i18n.t.w.reminders.overdue, reminders.overdue, 'text-red-500/80', AlertCircle, 'overdue')}
				{@render section(i18n.t.w.reminders.today, reminders.today, 'text-blue-400/80', ListTodo, 'today')}
				{@render section(i18n.t.w.reminders.planned, reminders.future, 'text-neutral-500', Clock, 'future')}

				{#if !reminders.today?.length && !reminders.overdue?.length && !reminders.future?.length}
					<div class="flex-1 flex flex-col items-center justify-center text-center py-6 opacity-40">
						<CheckCircle2 size={24} strokeWidth={1.5} class="text-neutral-500 mb-2" />
						<span class="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{i18n.t.w.reminders.noEvents}</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</WidgetCard>

<SettingsDialog
	title="Apple Reminders Setup"
	bind:show={showSettings}
	data={[]}
	onRevert={() => {}}
	onSave={saveSettings}
>
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<span class="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Deine Widget-URL:</span>
			<button onclick={() => showTutorial = !showTutorial} class="text-[10px] uppercase tracking-widest font-bold text-blue-500 hover:text-blue-600 transition-colors">
				{showTutorial ? 'Tutorial ausblenden' : 'Wie richte ich das ein?'}
			</button>
		</div>

		<div class="flex items-center gap-2">
			<input type="text" readonly value={endpointUrl} class="flex-1 rounded-lg border border-black/20 dark:border-white/10 bg-black/5 dark:bg-black/20 p-3 text-xs font-mono text-neutral-800 dark:text-neutral-300 outline-none select-all" />
			<button onclick={copyUrl} class="h-[42px] px-4 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 border border-black/20 dark:border-white/10 text-neutral-800 dark:text-white text-xs font-bold transition-colors">
				{copied ? 'Kopiert!' : 'Kopieren'}
			</button>
		</div>

		{#if showTutorial}
			<div transition:slide={{ duration: 200 }} class="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-xl p-4 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed mt-4">
				<p class="mb-3 font-semibold text-neutral-900 dark:text-white">Um deine Erinnerungen hier anzuzeigen, nutze unseren vorgefertigten iOS/macOS Kurzbefehl:</p>
				<p class="mb-2"><strong class="text-black dark:text-white">1.</strong> Lade den Kurzbefehl herunter: <a href={iCloudShortcutUrl} target="_blank" class="underline hover:text-black dark:hover:text-white transition-colors">Shortcut installieren</a></p>
				<p class="mb-2"><strong class="text-black dark:text-white">2.</strong> Öffne ihn in der Kurzbefehle-App und füge oben in das URL-Feld deine kopierte <strong>Widget-URL</strong> ein.</p>
				<p><strong class="text-black dark:text-white">3.</strong> Führe den Kurzbefehl aus (oder erstelle eine Automation, die ihn regelmäßig ausführt).</p>
			</div>
		{/if}
	</div>
</SettingsDialog>
