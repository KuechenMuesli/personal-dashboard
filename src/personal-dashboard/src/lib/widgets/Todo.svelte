<script lang="ts">
  import { getContext, onMount, onDestroy } from 'svelte';
  import { slide } from 'svelte/transition';
  import { page } from '$app/stores';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { Plus, X, Check, Circle, Trash2, Calendar, AlertCircle, Tag, GripHorizontal, FileText, ChevronDown, ChevronUp, RefreshCw } from 'lucide-svelte';
  import WidgetCard from '$lib/components/WidgetCard.svelte';
  import SettingsDialog from '$lib/components/SettingsDialog.svelte';

  let { id, isEditing, onDelete, onDragStart, onResizeStart, width, height, showSettings, hidden } = $props<{
    id: string,
    isEditing?: boolean,
    onDelete?: () => void,
    onDragStart?: (e: MouseEvent | TouchEvent) => void,
    onResizeStart?: (e: MouseEvent | TouchEvent) => void,
    width?: number,
    height?: number,
    showSettings?: boolean,
    hidden?: boolean
  }>();

  const getSecrets = getContext<() => Record<string, any>>('secrets');

  type Todo = {
    id: string;
    title: string;
    completed: boolean;
    dueDate: string | null;
    priority: 'low' | 'medium' | 'high' | null;
    notes: string;
    tags: string[];
    isAppleReminder?: boolean;
    list?: string;
    completedAt?: number | null;
  };

  function getTodayString() {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return (new Date(today.getTime() - offset)).toISOString().split('T')[0];
  }

  let todos = $state<Todo[]>([]);
  let isLoaded = $state(false);
  let saveTimeout: ReturnType<typeof setTimeout>;
  
  // New Todo Form State
  let showAddForm = $state(false);
  let newTitle = $state("");
  let newDueDate = $state(getTodayString());
  let newPriority = $state<'low' | 'medium' | 'high' | null>(null);
  let newNotes = $state("");
  let newTags = $state<string[]>([]);
  let tagInput = $state("");
  
  // Expanded State
  let expandedTodos = $state<Record<string, boolean>>({});

  $effect(() => {
    if (!isLoaded) {
      const secrets = getSecrets();
      if (secrets[id] && secrets[id].todos) {
        todos = secrets[id].todos;
      } else {
        const saved = localStorage.getItem(`todo-settings-${id}`);
        if (saved) {
          try {
            todos = JSON.parse(saved);
          } catch(e) {}
        }
      }
      
      // Ensure existing completed tasks get a completion timestamp
      let needsSave = false;
      todos = todos.map(t => {
        if (t.completed && !t.completedAt) {
          needsSave = true;
          return { ...t, completedAt: Date.now() };
        }
        return t;
      });
      if (needsSave) saveTodos();
      
      cleanupCompletedTodos();
      isLoaded = true;
    }
  });

  function cleanupCompletedTodos() {
    if (integrations.autoDeleteHours === null) return;
    const delayMs = integrations.autoDeleteHours * 60 * 60 * 1000;
    const now = Date.now();
    let changed = false;
    
    todos = todos.filter(t => {
      if (t.completed && t.completedAt && (now - t.completedAt > delayMs)) {
        changed = true;
        return false;
      }
      return true;
    });
    
    if (changed) saveTodos();
  }

  // Integrations State
  let integrations = $state<{ apple: boolean; microsoft: boolean; autoDeleteHours: number | null }>({ apple: true, microsoft: false, autoDeleteHours: 1 });
  let showTutorial = $state(false);
  let copied = $state(false);
  const endpointUrl = $derived(`https://dashboard.paul-simon.dev/post-reminders/${userId}`);
  const iCloudShortcutUrl = 'https://www.icloud.com/shortcuts/df2447788587455fab2be8b8b4833dc6';

  function copyUrl() {
    navigator.clipboard.writeText(endpointUrl);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }

  // Apple Reminders Integration
  let appleReminders = $state<Todo[]>([]);
  let isFetchingApple = $state(false);
  let lastFetchedApple = $state<number>(0);
  let refreshTimer: ReturnType<typeof setInterval>;
  const COOLDOWN_MS = 10 * 60 * 1000;
  const userId = $derived($page.data.session?.user?.id || id);

  async function fetchAppleReminders(force = false) {
    const timeSinceLast = Date.now() - lastFetchedApple;
    if (!force && timeSinceLast < COOLDOWN_MS && appleReminders.length > 0) return;

    isFetchingApple = true;
    lastFetchedApple = Date.now();

    try {
      const url = `/post-reminders/${userId}`;
      const res = await fetch(url, force ? { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-cache' } : undefined);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const json = await res.json();
      
      if (json && json.merge_variables) {
        const mv = json.merge_variables;
        const allApple: any[] = [...(mv.overdue || []), ...(mv.today || []), ...(mv.future || [])];
        
        appleReminders = allApple.map((item, index) => ({
          id: `apple-${index}-${item.n}`,
          title: item.n,
          completed: false,
          dueDate: item.d ? item.d : null,
          priority: item.p === 'Hoch' ? 'high' : item.p === 'Mittel' ? 'medium' : item.p === 'Niedrig' ? 'low' : null,
          notes: item.o || "",
          tags: item.t ? item.t.split('\n').filter((t: string) => t.trim()) : [],
          isAppleReminder: true,
          list: item.l
        }));

        localStorage.setItem(`todo-apple-cache-${userId}`, JSON.stringify({
          timestamp: lastFetchedApple,
          data: appleReminders
        }));
      }
    } catch (e) {
      console.error("Apple Reminders sync failed", e);
    } finally {
      isFetchingApple = false;
    }
  }

  onMount(() => {
    const intCache = localStorage.getItem(`todo-integrations-${id}`);
    if (intCache) {
      try {
        integrations = { ...integrations, ...JSON.parse(intCache) };
      } catch(e) {}
    }

    const cache = localStorage.getItem(`todo-apple-cache-${userId}`);
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        appleReminders = parsed.data || [];
        lastFetchedApple = parsed.timestamp || 0;
      } catch (e) { console.error(e); }
    }

    if (integrations.apple) {
      const isStale = Date.now() - lastFetchedApple > COOLDOWN_MS;
      if (appleReminders.length === 0 || isStale) fetchAppleReminders();
    }

    refreshTimer = setInterval(() => {
      if (integrations.apple) fetchAppleReminders();
    }, COOLDOWN_MS);
  });

  $effect(() => {
    if (isLoaded) {
      localStorage.setItem(`todo-integrations-${id}`, JSON.stringify(integrations));
      if (!integrations.apple && appleReminders.length > 0) {
        appleReminders = [];
      } else if (integrations.apple && appleReminders.length === 0 && !isFetchingApple) {
        fetchAppleReminders();
      }
    }
  });

  onDestroy(() => {
    if (refreshTimer) clearInterval(refreshTimer);
  });

  function saveTodos() {
    localStorage.setItem(`todo-settings-${id}`, JSON.stringify(todos));
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: id, key: { todos } })
      }).catch(console.error);
    }, 500);
  }

  function addTodo() {
    if (!newTitle.trim()) return;
    
    // Process remaining tag
    let currentTags = [...newTags];
    if (tagInput.trim()) {
        const val = tagInput.trim().replace(/^#/, '');
        if (!currentTags.includes(val)) currentTags.push(val);
    }

    todos = [...todos, {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      completed: false,
      dueDate: newDueDate || null,
      priority: newPriority,
      notes: newNotes.trim(),
      tags: currentTags
    }];
    
    // Reset form
    newTitle = "";
    newDueDate = getTodayString();
    newPriority = null;
    newNotes = "";
    newTags = [];
    tagInput = "";
    showAddForm = false;
    
    saveTodos();
  }

  function handleTagInput(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '');
      if (val && !newTags.includes(val)) {
        newTags = [...newTags, val];
      }
      tagInput = "";
    } else if (e.key === 'Backspace' && tagInput === '') {
      if (newTags.length > 0) {
        newTags = newTags.slice(0, -1);
      }
    }
  }

  function removeTag(tagToRemove: string) {
    newTags = newTags.filter(t => t !== tagToRemove);
  }

  function toggleTodo(todoId: string) {
    todos = todos.map(t => {
      if (t.id === todoId) {
        const isCompleted = !t.completed;
        return { ...t, completed: isCompleted, completedAt: isCompleted ? Date.now() : null };
      }
      return t;
    });
    saveTodos();
  }

  function deleteTodo(todoId: string) {
    todos = todos.filter(t => t.id !== todoId);
    saveTodos();
  }
  
  function toggleExpand(todoId: string) {
    expandedTodos[todoId] = !expandedTodos[todoId];
  }

  let sortedTodos = $derived([...todos, ...appleReminders].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.priority !== b.priority) {
      const pMap = { 'high': 3, 'medium': 2, 'low': 1, null: 0 };
      return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
    }
    return 0;
  }));

  let overdueTodos = $derived(sortedTodos.filter(t => {
    if (t.completed || !t.dueDate) return false;
    const due = new Date(t.dueDate); due.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    return due < today;
  }));

  let todayTodos = $derived(sortedTodos.filter(t => {
    if (t.completed || !t.dueDate) return false;
    const due = new Date(t.dueDate); due.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    return due.getTime() === today.getTime();
  }));

  let futureTodos = $derived(sortedTodos.filter(t => {
    if (t.completed || !t.dueDate) return true;
    const due = new Date(t.dueDate); due.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    return due > today;
  }));
</script>

{#snippet headerButtons()}
  {#if integrations.apple}
    <button onclick={(e) => { e.stopPropagation(); fetchAppleReminders(true); }} title={i18n.currentLang === 'de' ? 'Apple Reminders aktualisieren' : 'Refresh Apple Reminders'} class="h-5 w-5 flex items-center justify-center rounded text-neutral-500 hover:text-white hover:bg-black/40 transition-colors">
      <RefreshCw size={10} strokeWidth={2.5} class={isFetchingApple ? 'animate-spin' : ''} />
    </button>
  {/if}
  <button onclick={() => showAddForm = true} class="h-5 w-5 flex items-center justify-center rounded text-neutral-500 hover:text-white hover:bg-black/40 transition-colors">
    <Plus size={12} strokeWidth={2.5} />
  </button>
{/snippet}

<WidgetCard title={i18n.currentLang === 'de' ? 'Aufgaben' : 'Tasks'} headerActions={headerButtons} bind:showSettings={showSettings} isConfigured={true}>
  <div class="flex h-full w-full flex-col relative">

      <SettingsDialog title={i18n.currentLang === 'de' ? 'Neue Aufgabe' : 'New Task'} bind:show={showAddForm} onSave={addTodo}>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] uppercase font-black tracking-widest text-neutral-500">{i18n.currentLang === 'de' ? 'Titel' : 'Title'}</label>
            <input 
              type="text" 
              bind:value={newTitle} 
              placeholder={i18n.currentLang === 'de' ? 'Was gibt es zu tun?' : 'What needs to be done?'} 
              class="w-full bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500/50 transition-colors font-medium"
              onkeydown={(e) => e.key === 'Enter' && addTodo()}
              autocomplete="off"
            />
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase font-black tracking-widest text-neutral-500 flex items-center gap-1.5"><Calendar size={12}/> {i18n.currentLang === 'de' ? 'Datum' : 'Date'}</label>
              <input type="date" bind:value={newDueDate} class="bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase font-black tracking-widest text-neutral-500 flex items-center gap-1.5"><AlertCircle size={12}/> {i18n.currentLang === 'de' ? 'Prio' : 'Prio'}</label>
              <select bind:value={newPriority} class="bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none">
                <option value={null}>-</option>
                <option value="low">{i18n.currentLang === 'de' ? 'Niedrig' : 'Low'}</option>
                <option value="medium">{i18n.currentLang === 'de' ? 'Mittel' : 'Medium'}</option>
                <option value="high">{i18n.currentLang === 'de' ? 'Hoch' : 'High'}</option>
              </select>
            </div>
          </div>
          
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] uppercase font-black tracking-widest text-neutral-500 flex items-center gap-1.5"><Tag size={12}/> {i18n.currentLang === 'de' ? 'Tags (Enter drücken)' : 'Tags (Press Enter)'}</label>
            <div class="flex flex-wrap items-center gap-2 bg-black/40 border border-neutral-800 rounded-xl px-4 py-2 min-h-[46px] focus-within:border-blue-500/50 transition-colors">
              {#each newTags as tag}
                <div class="group flex items-center gap-1 bg-white/15 hover:bg-white/25 border border-white/10 px-2.5 py-1 rounded-full text-xs font-bold text-white transition-colors">
                  <span>#{tag}</span>
                  <button onclick={() => removeTag(tag)} class="md:opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-neutral-400 hover:text-white rounded-full">
                    <X size={10} />
                  </button>
                </div>
              {/each}
              <input 
                type="text" 
                bind:value={tagInput} 
                onkeydown={handleTagInput}
                placeholder={newTags.length === 0 ? (i18n.currentLang === 'de' ? 'Tag hinzufügen...' : 'Add tag...') : ''}
                class="flex-1 bg-transparent min-w-[80px] text-sm text-white placeholder-neutral-500 focus:outline-none outline-none border-none focus:ring-0 ring-0 shadow-none p-0 m-0" 
              />
            </div>
          </div>
          
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] uppercase font-black tracking-widest text-neutral-500 flex items-center gap-1.5"><FileText size={12}/> {i18n.currentLang === 'de' ? 'Notizen' : 'Notes'}</label>
            <textarea bind:value={newNotes} rows="3" class="w-full bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 resize-none"></textarea>
          </div>
        </div>
      </SettingsDialog>

      <div class="flex flex-col gap-2">
        {#snippet todoItem(todo: Todo)}
          <div 
            class="group flex flex-col bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all relative {todo.completed ? 'opacity-50' : ''} {todo.notes ? 'cursor-pointer' : ''}"
            onclick={() => { if (todo.notes) toggleExpand(todo.id); }}
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter' && todo.notes) toggleExpand(todo.id); }}
          >
            <div class="relative flex items-start gap-3 p-3 pr-10">
              <button onclick={(e) => { e.stopPropagation(); !todo.isAppleReminder && toggleTodo(todo.id); }} class="shrink-0 mt-0.5 text-neutral-400 {todo.isAppleReminder ? 'opacity-30 cursor-not-allowed' : 'hover:text-white'} transition-colors">
                {#if todo.completed}
                  <Check size={18} class="text-blue-400" />
                {:else}
                  <Circle size={18} />
                {/if}
              </button>
              
              <div class="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                <div class="flex items-start justify-between gap-2">
                  <span class="text-sm font-medium leading-tight {todo.completed ? 'line-through text-neutral-500' : 'text-slate-200'}">
                    {#if todo.priority === 'high'}<span class="text-red-500 font-bold mr-1 tracking-tighter">!!!</span>
                    {:else if todo.priority === 'medium'}<span class="text-yellow-500 font-bold mr-1 tracking-tighter">!!</span>
                    {:else if todo.priority === 'low'}<span class="text-blue-500 font-bold mr-1 tracking-tighter">!</span>{/if}
                    {todo.title}
                  </span>
                </div>
                
                {#if todo.dueDate || todo.tags.length > 0 || todo.list}
                  <div class="flex items-center gap-1.5 mt-1 text-[10px] text-neutral-500 font-medium truncate flex-wrap">
                    {#if todo.dueDate}
                      <span class="flex items-center gap-0.5"><Calendar size={9} /> {new Date(todo.dueDate).toLocaleDateString(i18n.currentLang)}</span>
                    {/if}
                    
                    {#if todo.list}
                      {#if todo.dueDate}<span class="opacity-40 text-[8px]">&bull;</span>{/if}
                      <span>{todo.list}</span>
                    {/if}
                    
                    {#if todo.tags.length > 0}
                      {#if todo.dueDate || todo.list}<span class="opacity-40 text-[8px]">&bull;</span>{/if}
                      <span class="text-neutral-400">
                        {#each todo.tags as tag, i}#{tag}{i < todo.tags.length - 1 ? ' ' : ''}{/each}
                      </span>
                    {/if}
                  </div>
                {/if}
              </div>
              
              <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                {#if todo.notes}
                  <div class="text-neutral-500 { !todo.isAppleReminder ? 'group-hover:opacity-0 transition-opacity' : '' }">
                    {#if expandedTodos[todo.id]}<ChevronUp size={16} />{:else}<ChevronDown size={16} />{/if}
                  </div>
                {/if}
                {#if !todo.isAppleReminder}
                  <button onclick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }} class="absolute right-0 opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all pointer-events-auto">
                    <Trash2 size={14} />
                  </button>
                {/if}
              </div>
            </div>
            
            {#if expandedTodos[todo.id] && todo.notes}
              <div class="px-3 pb-3 pt-0 text-xs text-neutral-400 border-t border-white/5 mt-1 pt-2">
                {todo.notes}
              </div>
            {/if}
          </div>
        {/snippet}

        {#if overdueTodos.length > 0}
          <div class="text-[10px] font-bold text-red-500/80 uppercase tracking-widest px-1 mt-1 mb-0.5">{i18n.currentLang === 'de' ? 'Überfällig' : 'Overdue'}</div>
          {#each overdueTodos as todo (todo.id)}
            {@render todoItem(todo)}
          {/each}
        {/if}

        {#if todayTodos.length > 0}
          <div class="text-[10px] font-bold text-blue-400 uppercase tracking-widest px-1 mt-2 mb-0.5">{i18n.currentLang === 'de' ? 'Heute' : 'Today'}</div>
          {#each todayTodos as todo (todo.id)}
            {@render todoItem(todo)}
          {/each}
        {/if}

        {#if futureTodos.length > 0}
          <div class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-1 mt-2 mb-0.5">{i18n.currentLang === 'de' ? 'Geplant' : 'Upcoming'}</div>
          {#each futureTodos as todo (todo.id)}
            {@render todoItem(todo)}
          {/each}
        {/if}
        
        {#if todos.length === 0 && appleReminders.length === 0}
          <div class="flex flex-col items-center justify-center h-full text-center p-6 opacity-50">
            <Check size={48} class="mb-4 text-neutral-600" />
            <p class="text-sm font-medium text-neutral-400">{i18n.currentLang === 'de' ? 'Keine Aufgaben. Genieß den Tag!' : 'No tasks. Enjoy your day!'}</p>
          </div>
        {/if}
      </div>
  </div>
</WidgetCard>

<SettingsDialog
	title={i18n.currentLang === 'de' ? 'Todo Einstellungen' : 'Todo Settings'}
	bind:show={showSettings}
>
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<span class="text-sm font-semibold text-white">{i18n.currentLang === 'de' ? 'Erledigte löschen' : 'Delete completed'}</span>
			<select 
				bind:value={integrations.autoDeleteHours}
				class="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500/50"
			>
				<option value={0}>{i18n.currentLang === 'de' ? 'Sofort' : 'Immediately'}</option>
				<option value={1}>{i18n.currentLang === 'de' ? 'Nach 1 Stunde' : 'After 1 hour'}</option>
				<option value={24}>{i18n.currentLang === 'de' ? 'Nach 24 Stunden' : 'After 24 hours'}</option>
				<option value={null}>{i18n.currentLang === 'de' ? 'Nie' : 'Never'}</option>
			</select>
		</div>

		<hr class="border-white/5" />

		<div class="flex items-center justify-between">
			<span class="text-sm font-semibold text-white flex items-center gap-2">Apple Reminders</span>
			<button 
				onclick={() => integrations.apple = !integrations.apple} 
				class="w-10 h-5 rounded-full transition-colors relative {integrations.apple ? 'bg-blue-500' : 'bg-neutral-600'}"
			>
				<div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform {integrations.apple ? 'translate-x-5' : ''}"></div>
			</button>
		</div>

		{#if integrations.apple}
			<div transition:slide class="bg-black/20 p-4 rounded-xl border border-white/10 space-y-4 -mt-2">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-neutral-300">Deine Widget-URL:</span>
					<button onclick={() => showTutorial = !showTutorial} class="text-[10px] uppercase tracking-widest font-bold text-blue-500 hover:text-blue-400 transition-colors">
						{showTutorial ? 'Tutorial ausblenden' : 'Wie richte ich das ein?'}
					</button>
				</div>

				<div class="flex items-center gap-2">
					<input type="text" readonly value={endpointUrl} class="flex-1 rounded-lg border border-white/10 bg-black/40 p-3 text-xs font-mono text-white outline-none select-all" />
					<button onclick={copyUrl} class="h-[42px] px-4 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-colors">
						{copied ? 'Kopiert!' : 'Kopieren'}
					</button>
				</div>

				{#if showTutorial}
					<div transition:slide class="bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-neutral-300 leading-relaxed">
						<p class="mb-3 font-semibold text-white">Um deine Erinnerungen hier anzuzeigen, nutze unseren vorgefertigten iOS/macOS Kurzbefehl:</p>
						<p class="mb-2"><strong class="text-white">1.</strong> Lade den Kurzbefehl herunter: <a href={iCloudShortcutUrl} target="_blank" class="text-blue-400 hover:underline">Shortcut installieren</a></p>
						<p class="mb-2"><strong class="text-white">2.</strong> Öffne ihn in der Kurzbefehle-App und füge oben in das URL-Feld deine kopierte <strong>Widget-URL</strong> ein.</p>
						<p><strong class="text-white">3.</strong> Führe den Kurzbefehl aus (oder erstelle eine Automation, die ihn regelmäßig ausführt).</p>
					</div>
				{/if}
			</div>
		{/if}

		<div class="flex items-center justify-between opacity-50">
			<span class="text-sm font-semibold text-white flex items-center gap-2">Microsoft To-Do <span class="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white font-bold uppercase">Bald</span></span>
			<button class="w-10 h-5 rounded-full bg-neutral-600 relative cursor-not-allowed">
				<div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full"></div>
			</button>
		</div>
	</div>
</SettingsDialog>
