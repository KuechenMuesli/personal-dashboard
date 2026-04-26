<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { slide } from "svelte/transition";
  import { RefreshCw, ListTodo, AlertCircle, Clock, CheckCircle2, Circle } from "lucide-svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";

  let { id, isEditing, height, width, showSettings = $bindable(false) } = $props<{
    id: string; isEditing: boolean; height: number; width: number; showSettings: boolean;
  }>();

  const PROXY_URL = "https://dashboard-proxy.paul-simon.dev/";
  const COOLDOWN_MS = 10 * 60 * 1000;

  interface ReminderData {
    d: string; f: boolean; l: string; n: string; o: string; p: string; t: string;
  }

  interface MergedVariables {
    today: ReminderData[];
    future: ReminderData[];
    overdue: ReminderData[];
  }

  let webhookUrl = $state("");
  let reminders = $state<MergedVariables | null>(null);
  let isLoading = $state(false);
  let lastFetched = $state<number>(0);
  let error = $state(false);
  let dialogEl = $state<HTMLDialogElement | null>(null);
  let expandedId = $state<string | null>(null);
  let refreshTimer: ReturnType<typeof setInterval>;

  const isConfigured = $derived(webhookUrl.trim() !== "");
  const isWide = $derived(width >= 3);
  const isCompact = $derived(height <= 2);

  onMount(() => {
    const savedSettings = localStorage.getItem(`reminders-settings-${id}`);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        webhookUrl = parsed.webhookUrl || "";
      } catch (e) { console.error(e); }
    }

    const cache = localStorage.getItem(`reminders-cache-${id}`);
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        reminders = parsed.data || null;
        lastFetched = parsed.timestamp || 0;
      } catch (e) { console.error(e); }
    }

    if (isConfigured) {
      const isStale = Date.now() - lastFetched > COOLDOWN_MS;
      if (!reminders || isStale) fetchReminders();
    }
    refreshTimer = setInterval(() => fetchReminders(), COOLDOWN_MS);
  });

  onDestroy(() => clearInterval(refreshTimer));

  async function fetchReminders(force = false) {
    if (!webhookUrl) return;
    const timeSinceLast = Date.now() - lastFetched;
    if (!force && timeSinceLast < COOLDOWN_MS && reminders && !error) return;

    isLoading = true;
    error = false;

    try {
      const targetUrl = encodeURIComponent(webhookUrl);
      const res = await fetch(`${PROXY_URL}?target=${targetUrl}`);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const json = await res.json();
      if (json && json.merge_variables) {
        reminders = json.merge_variables;
        lastFetched = Date.now();
        localStorage.setItem(`reminders-cache-${id}`, JSON.stringify({
          data: reminders, timestamp: lastFetched
        }));
      }
    } catch (e) {
      console.error("Reminders sync failed", e);
      error = true;
    } finally {
      isLoading = false;
    }
  }

  function saveSettings() {
    localStorage.setItem(`reminders-settings-${id}`, JSON.stringify({ webhookUrl }));
    showSettings = false;
    fetchReminders(true);
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
		title={isLoading && !reminders ? 'Syncing...' : 'Reminders'}
		bind:showSettings={showSettings}
		isConfigured={isConfigured}
		padding={true} headerActions={headerButtons}
>
	<div class="h-full w-full {isCompact ? 'flex items-center' : 'pt-2'}">
		{#if error && !reminders}
			<div class="flex h-full w-full items-center justify-center text-xs text-red-500 font-medium">Sync Error</div>
		{:else if !reminders}
			<div class="flex h-full w-full items-center justify-center text-xs text-neutral-500 font-medium text-center">Lade...</div>
		{:else}
			<div class="w-full flex {isWide ? 'flex-row gap-6 items-start' : 'flex-col gap-5'} pb-2">
				{@render section('Überfällig', reminders.overdue, 'text-red-500/80', AlertCircle, 'overdue')}
				{@render section('Heute', reminders.today, 'text-blue-400/80', ListTodo, 'today')}
				{@render section('Geplant', reminders.future, 'text-neutral-500', Clock, 'future')}

				{#if !reminders.today?.length && !reminders.overdue?.length && !reminders.future?.length}
					<div class="flex-1 flex flex-col items-center justify-center text-center py-6 opacity-40">
						<CheckCircle2 size={24} strokeWidth={1.5} class="text-neutral-500 mb-2" />
						<span class="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Alles erledigt</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</WidgetCard>

<SettingsDialog title="Reminders Settings" bind:show={showSettings} onSave={saveSettings}>
	<div class="space-y-4">
		<label class="block text-[10px] uppercase font-black text-neutral-500 tracking-widest" for="webhook-url">Webhook URL</label>
		<input id="webhook-url" type="url" bind:value={webhookUrl} placeholder="https://trmnl.com/api/..." class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-xs font-mono text-white outline-none focus:border-blue-500" />
	</div>
</SettingsDialog>
