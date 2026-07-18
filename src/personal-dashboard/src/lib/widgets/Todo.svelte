<script lang="ts">
  import { getContext, onMount, onDestroy } from 'svelte';
  import { slide } from 'svelte/transition';
  import { page } from '$app/stores';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { Plus, X, Check, Circle, Trash2, Calendar, AlertCircle, Tag, GripHorizontal, FileText, ChevronDown, ChevronUp, RefreshCw } from 'lucide-svelte';
  import WidgetCard from '$lib/components/WidgetCard.svelte';
  import SettingsDialog from '$lib/components/SettingsDialog.svelte';
  import CustomDropdown from '$lib/components/CustomDropdown.svelte';

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
  const getSecretsLoaded = getContext<() => boolean>('secretsLoaded');
  const GLOBAL_SERVICE_ID = 'global-todo-sync';

  type Todo = {
    id: string;
    title: string;
    completed: boolean;
    dueDate: string | null;
    priority: 'low' | 'medium' | 'high' | null;
    notes: string;
    tags: string[];
    isAppleReminder?: boolean;
    isMicrosoftReminder?: boolean;
    list?: string;
    listId?: string;
    completedAt?: number | null;
  };

  const SHORTCUT_URL_APPLE = 'https://www.icloud.com/shortcuts/bc0eed4621324ab4831f5087da5bc305';

  function getTodayString() {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return (new Date(today.getTime() - offset)).toISOString().split('T')[0];
  }

  let todos = $state<Todo[]>([]);
  let isLoaded = $state(false);
  let saveTimeout: ReturnType<typeof setTimeout>;

  let showAddForm = $state(false);
  let newTitle = $state("");
  let newDueDate = $state(getTodayString());
  let newDueTime = $state('');
  let newPriority = $state<'high'|'medium'|'low'|null>(null);
  let newNotes = $state("");
  let newTags = $state<string[]>([]);
  let tagInput = $state("");

  let expandedTodos = $state<Record<string, boolean>>({});

  function loadTodosFromStorage() {
      const saved = localStorage.getItem(`todo-settings-global`);
      if (saved) {
        try {
          todos = JSON.parse(saved).map((t: any) => ({
            ...t,
            tags: t.tags || [],
            notes: t.notes || '',
            priority: t.priority || null
          }));
        } catch (e) {}
      }
  }

  onMount(() => {
     const handleTodoUpdate = (e?: Event) => {
         if (e && (e as CustomEvent).detail?.source === id) return;
         loadTodosFromStorage();
     };
     window.addEventListener('todo-updated', handleTodoUpdate);
     window.addEventListener('todo-updated-internal', handleTodoUpdate);
     return () => {
         window.removeEventListener('todo-updated', handleTodoUpdate);
         window.removeEventListener('todo-updated-internal', handleTodoUpdate);
     };
  });

  $effect(() => {
    if (!isLoaded) {
      const secrets = getSecrets();
      if (secrets[GLOBAL_SERVICE_ID] && secrets[GLOBAL_SERVICE_ID].todos) {
        todos = secrets[GLOBAL_SERVICE_ID].todos;
      } else if (secrets[id] && secrets[id].todos) {
        todos = secrets[id].todos;
      } else {
        const saved = localStorage.getItem(`todo-settings-global`) || localStorage.getItem(`todo-settings-${id}`);
        if (saved) {
          try {
            todos = JSON.parse(saved).map((t: any) => ({
              ...t,
              tags: t.tags || [],
              notes: t.notes || '',
              priority: t.priority || null
            }));
          } catch (e) {}
        }
      }

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

  type Integrations = {
    apple: boolean;
    microsoft: boolean;
    autoDeleteHours: number | null;
    sortMethod?: 'time' | 'priority';
  };
  let integrations = $state<Integrations>({ apple: true, microsoft: false, autoDeleteHours: 1, sortMethod: 'time' });
  let showTutorialApple = $state(false);
  let copiedApple = $state(false);
  let msNeedsLogin = $state(false);

  let autoDeleteProxy = {
    get value() { return integrations.autoDeleteHours === null ? 'null' : integrations.autoDeleteHours.toString(); },
    set value(v: string) { integrations.autoDeleteHours = v === 'null' ? null : parseInt(v); }
  };

  let sortMethodProxy = {
    get value() { return integrations.sortMethod || 'time'; },
    set value(v: any) { integrations.sortMethod = v; }
  };

  const isLoggedIn = $derived(!!($page.data.user || $page.data.session?.user));
  const userId = $derived($page.data.session?.user?.id || id);

  let globalAppleUrlId = $state<string | null>(null);

  const appleUrlId = $derived(globalAppleUrlId || userId);
  const endpointUrlApple = $derived(`https://dashboard.paul-simon.dev/post-reminders/${appleUrlId}`);

  async function saveGlobalAppleUrlId(urlId: string) {
    globalAppleUrlId = urlId;
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`apple-reminders-url-global`, urlId);
    }
    if (isLoggedIn) {
      try {
        await fetch('/api/secrets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service: 'apple_reminders_global', key: { urlId } })
        });
      } catch (e) {
        console.error('Failed to save appleUrlId', e);
      }
    }
  }

  function rotateUrl() {
    saveGlobalAppleUrlId(crypto.randomUUID());
    appleReminders = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`todo-apple-cache-global`);
    }
  }

  let appleUrlIdLoaded = $state(false);

  $effect(() => {
    const secretsLoaded = getSecretsLoaded ? getSecretsLoaded() : true;
    if (secretsLoaded && !appleUrlIdLoaded && typeof localStorage !== 'undefined') {
        const secrets = getSecrets();
        let foundUrlId = secrets['apple_reminders_global']?.urlId;

        if (!foundUrlId) {
            foundUrlId = localStorage.getItem(`apple-reminders-url-global`);
        }

        if (foundUrlId) {
            globalAppleUrlId = foundUrlId;
            if (!secrets['apple_reminders_global']?.urlId && isLoggedIn) {
                saveGlobalAppleUrlId(foundUrlId);
            }
        } else {
            saveGlobalAppleUrlId(crypto.randomUUID());
        }
        appleUrlIdLoaded = true;
    }
  });

  function copyUrl() {
    navigator.clipboard.writeText(endpointUrlApple);
    copiedApple = true;
    setTimeout(() => copiedApple = false, 2000);
  }

  let appleReminders = $state<Todo[]>([]);
  let microsoftTodos = $state<Todo[]>([]);
  let isFetchingApple = $state(false);
  let isFetchingMs = $state(false);
  let lastFetchedApple = $state<number>(0);
  let lastFetchedMs = $state<number>(0);
  let refreshTimer: ReturnType<typeof setInterval>;
  const COOLDOWN_MS = 2 * 60 * 1000;

  async function fetchExternalReminders(type: 'apple' | 'microsoft', force = false) {
    const timeSinceLast = Date.now() - (type === 'apple' ? lastFetchedApple : lastFetchedMs);
    const hasData = (type === 'apple' ? appleReminders : microsoftTodos).length > 0;

    if (!force && timeSinceLast < COOLDOWN_MS && hasData) return;

    if (type === 'apple') isFetchingApple = true;
    else isFetchingMs = true;

    try {
      if (type === 'apple') lastFetchedApple = Date.now();
      else lastFetchedMs = Date.now();

      let url = '';
      if (type === 'apple') {
        if (appleUrlId === 'pending') return;
        url = `/post-reminders/${appleUrlId}`;
      } else {
        url = `/api/ms-todo`;
      }

      const res = await fetch(url, force ? { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-cache' } : undefined);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const json = await res.json();

      if (type === 'microsoft' && json.not_authenticated) {
        msNeedsLogin = true;
        return;
      }
      if (type === 'microsoft') msNeedsLogin = false;

      if (json && json.merge_variables) {
        const mv = json.merge_variables;
        const allItems: any[] = [...(mv.overdue || []), ...(mv.today || []), ...(mv.future || [])];

        const mapped = allItems.map((item, index) => ({
          id: type === 'microsoft' ? item.tid : `${type}-${index}-${item.n}`,
          listId: type === 'microsoft' ? item.lid : undefined,
          title: item.n,
          completed: false,
          dueDate: item.d ? item.d : null,
          priority: item.p === 'Hoch' ? 'high' : item.p === 'Mittel' ? 'medium' : item.p === 'Niedrig' ? 'low' : null,
          notes: item.o || "",
          tags: item.t ? (Array.isArray(item.t) ? item.t : (typeof item.t === 'string' ? item.t.split('\n') : [])).filter((t: any) => typeof t === 'string' && t.trim()) : [],
          isAppleReminder: type === 'apple',
          isMicrosoftReminder: type === 'microsoft',
          list: item.l || (type === 'apple' ? 'Apple' : 'Microsoft')
        }));

        if (type === 'apple') {
          appleReminders = mapped;
          localStorage.setItem(`todo-apple-cache-global`, JSON.stringify({
            timestamp: lastFetchedApple,
            data: appleReminders
          }));
        } else {
          const mappedIds = new Set(mapped.map(t => t.id));
          const keepCompleted = microsoftTodos.filter(t => t.completed && !mappedIds.has(t.id));
          microsoftTodos = [...keepCompleted, ...mapped];

          localStorage.setItem(`todo-ms-cache-global`, JSON.stringify({
            timestamp: lastFetchedMs,
            data: microsoftTodos
          }));
        }
      }
    } catch (e) {
      console.error(`${type} sync failed`, e);
    } finally {
      if (type === 'apple') isFetchingApple = false;
      else isFetchingMs = false;
    }
  }



  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const msError = params.get('msAuthError');
    if (msError) {
      alert("Microsoft Login Error: " + msError);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const intCache = localStorage.getItem(`todo-integrations-global`) || localStorage.getItem(`todo-integrations-${id}`);
    if (intCache) {
      try {
        const parsed = JSON.parse(intCache);
        integrations = { ...integrations, ...parsed };


      } catch(e) {}
    }



    const cacheApple = localStorage.getItem(`todo-apple-cache-global`);
    if (cacheApple) {
      try {
        const parsed = JSON.parse(cacheApple);
        appleReminders = parsed.data || [];
        lastFetchedApple = parsed.timestamp || 0;
      } catch (e) {}
    }

    const cacheMs = localStorage.getItem(`todo-ms-cache-global`);
    if (cacheMs) {
      try {
        const parsed = JSON.parse(cacheMs);
        microsoftTodos = parsed.data || [];
        lastFetchedMs = parsed.timestamp || 0;
      } catch (e) {}
    }

    const handleTodoUpdate = (e: CustomEvent) => {
      const { widgetId, type, todoId, completed, completedAt } = e.detail;

      if (type === 'microsoft') {
        microsoftTodos = microsoftTodos.map(t => t.id === todoId ? { ...t, completed, completedAt } : t);
      }
    };
    window.addEventListener('cross-widget-todo-update', handleTodoUpdate as EventListener);

    if (integrations.apple && appleUrlId !== 'pending') fetchExternalReminders('apple');
    if (integrations.microsoft) fetchExternalReminders('microsoft');

    refreshTimer = setInterval(() => {
      if (integrations.apple) fetchExternalReminders('apple');
      if (integrations.microsoft) fetchExternalReminders('microsoft');
    }, COOLDOWN_MS);

    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
      window.removeEventListener('cross-widget-todo-update', handleTodoUpdate as EventListener);
    };
  });

  $effect(() => {
    if (isLoaded) {
      localStorage.setItem(`todo-integrations-global`, JSON.stringify(integrations));

      if (!integrations.apple && appleReminders.length > 0) appleReminders = [];
      if (!integrations.microsoft && microsoftTodos.length > 0) microsoftTodos = [];
    }
  });

  function saveTodos() {
    localStorage.setItem(`todo-settings-global`, JSON.stringify(todos));
    window.dispatchEvent(new CustomEvent('todo-updated-internal', { detail: { source: id } }));
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: GLOBAL_SERVICE_ID, key: { todos } })
      }).catch(console.error);
    }, 500);
  }

  function addTodo() {
    if (!newTitle.trim()) return;

    let currentTags = [...newTags];
    if (tagInput.trim()) {
        const val = tagInput.trim().replace(/^#/, '');
        if (!currentTags.includes(val)) currentTags.push(val);
    }

    todos = [...todos, {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      completed: false,
      dueDate: (newDueDate && newDueTime) ? `${newDueDate}T${newDueTime}` : (newDueDate || null),
      priority: newPriority,
      notes: newNotes.trim(),
      tags: currentTags
    }];

    newTitle = "";
    newDueDate = getTodayString();
    newDueTime = "";
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

  function toggleTodo(todoId: string, isMicrosoft = false, listId?: string) {
    if (isMicrosoft && listId) {
      microsoftTodos = microsoftTodos.map(t => {
        if (t.id === todoId) {
          const isCompleted = !t.completed;

          fetch('/api/ms-todo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: todoId, listId, completed: isCompleted })
          }).catch(console.error);

          const completedAt = isCompleted ? Date.now() : null;
          window.dispatchEvent(new CustomEvent('cross-widget-todo-update', {
            detail: { type: 'microsoft', todoId, completed: isCompleted, completedAt }
          }));

          return { ...t, completed: isCompleted, completedAt };
        }
        return t;
      });
      return;
    }

    todos = todos.map(t => {
      if (t.id === todoId) {
        const isCompleted = !t.completed;
        const completedAt = isCompleted ? Date.now() : null;

        return { ...t, completed: isCompleted, completedAt };
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

  let sortedTodos = $derived([...todos, ...appleReminders, ...microsoftTodos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    const aDate = a.dueDate ? new Date(a.dueDate) : new Date(8640000000000000);
    const bDate = b.dueDate ? new Date(b.dueDate) : new Date(8640000000000000);

    const aDay = new Date(aDate).setHours(0,0,0,0);
    const bDay = new Date(bDate).setHours(0,0,0,0);

    if (aDay !== bDay) {
        return aDay - bDay;
    }

    const sortMethod = integrations.sortMethod || 'time';

    const pMap = { 'high': 3, 'medium': 2, 'low': 1, null: 0 };
    const pDiff = (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
    const tDiff = aDate.getTime() - bDate.getTime();

    if (sortMethod === 'priority') {
        if (pDiff !== 0) return pDiff;
        return tDiff;
    } else {
        if (tDiff !== 0) return tDiff;
        return pDiff;
    }
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
  {#if integrations.apple || integrations.microsoft}
    <button onclick={(e) => { e.stopPropagation(); if(integrations.apple) fetchExternalReminders('apple', true); if(integrations.microsoft) fetchExternalReminders('microsoft', true); }} title={i18n.currentLang === 'de' ? 'Aktualisieren' : 'Refresh'} class="h-5 w-5 flex items-center justify-center rounded text-neutral-500 hover:text-white hover:bg-black/40 transition-colors">
      <RefreshCw size={10} strokeWidth={2.5} class={isFetchingApple || isFetchingMs ? 'animate-spin' : ''} />
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
              <label class="text-[10px] uppercase font-black tracking-widest text-neutral-500 flex items-center gap-1.5"><Calendar size={12}/> {i18n.currentLang === 'de' ? 'Datum & Zeit' : 'Date & Time'}</label>
              <div class="flex gap-2">
                <input type="date" bind:value={newDueDate} class="flex-1 min-w-0 bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                <input type="time" bind:value={newDueTime} class="w-[5.5rem] bg-black/40 border border-neutral-800 rounded-xl px-2 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50" />
              </div>
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
              <button onclick={(e) => { e.stopPropagation(); !todo.isAppleReminder && toggleTodo(todo.id, todo.isMicrosoftReminder, todo.listId); }} class="shrink-0 mt-0.5 text-neutral-400 {todo.isAppleReminder ? 'opacity-30 cursor-not-allowed' : 'hover:text-white'} transition-colors">
                {#if todo.completed}
                  <Check size={18} class="text-blue-400" />
                {:else}
                  <Circle size={18} />
                {/if}
              </button>

              <div class="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                <div class="flex items-start justify-between gap-2">
                  <span class="text-sm font-medium leading-tight {todo.completed ? 'line-through text-neutral-500' : 'text-slate-200'}">
                    {#if todo.priority === 'high'}<span class="text-red-500 font-bold mr-1 tracking-tighter">!!</span>
                    {:else if todo.priority === 'medium'}<span class="text-yellow-500 font-bold mr-1 tracking-tighter">!</span>{/if}
                    {todo.title}
                  </span>
                </div>

                {#if todo.dueDate || todo.tags.length > 0 || todo.list}
                  <div class="flex items-center gap-1.5 mt-1 text-[10px] text-neutral-500 font-medium truncate flex-wrap">
                    {#if todo.dueDate}
                      <span class="flex items-center gap-0.5">
                        <Calendar size={9} />
                        {i18n.formatDate(new Date(todo.dueDate), 'short')}
                        {#if todo.dueDate.includes('T') && !todo.dueDate.includes('T00:00:00')}
                          <span class="opacity-40 text-[8px] mx-0.5">&bull;</span>
                          {i18n.formatTime(new Date(todo.dueDate))}
                        {/if}
                      </span>
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

        {#if todos.length === 0 && appleReminders.length === 0 && microsoftTodos.length === 0}
          <div class="flex flex-col items-center justify-center h-full text-center p-6 opacity-50">
            <Check size={48} class="mb-4 text-neutral-600" />
            <p class="text-sm font-medium text-neutral-400">{i18n.currentLang === 'de' ? 'Keine Aufgaben. Genieß den Tag!' : 'No tasks. Enjoy your day!'}</p>
          </div>
        {/if}
      </div>
  </div>
</WidgetCard>

<SettingsDialog
	title={i18n.t.todoSettings.title}
	bind:show={showSettings}
>
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<span class="text-sm font-semibold text-white">{i18n.t.todoSettings.deleteCompleted}</span>
			<CustomDropdown
				bind:value={autoDeleteProxy.value}
				options={[
					{ value: '0', label: i18n.t.todoSettings.immediately },
					{ value: '1', label: i18n.t.todoSettings.after1h },
					{ value: '24', label: i18n.t.todoSettings.after24h },
					{ value: 'null', label: i18n.t.todoSettings.never }
				]}
			/>
		</div>

		<div class="flex items-center justify-between mt-3">
			<span class="text-sm font-semibold text-white">{i18n.t.todoSettings.sortSameDay}</span>
			<CustomDropdown
				bind:value={sortMethodProxy.value}
				options={[
					{ value: 'time', label: i18n.t.todoSettings.time },
					{ value: 'priority', label: i18n.t.todoSettings.priority }
				]}
			/>
		</div>

		<hr class="border-white/5" />

		<div class="flex items-center justify-between">
			<span class="text-sm font-semibold text-white flex items-center gap-2">Apple Reminders</span>
			{#if isLoggedIn}
			<button
				onclick={() => {
          integrations.apple = !integrations.apple;
          if (integrations.apple) fetchExternalReminders('apple');
        }}
				class="w-10 h-5 rounded-full transition-colors relative {integrations.apple ? 'bg-blue-500' : 'bg-neutral-600'}"
			>
				<div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform {integrations.apple ? 'translate-x-5' : ''}"></div>
			</button>
			{/if}
		</div>

		{#if !isLoggedIn}
			<div class="bg-black/20 p-4 rounded-xl border border-white/10 mt-2">
				<p class="text-xs text-neutral-400 mb-3">{i18n.t.dashboardSettings.signInToSync}</p>
				<a href="/login" class="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors inline-block text-center w-full">
					{i18n.currentLang === 'de' ? 'Anmelden' : 'Sign in'}
				</a>
			</div>
		{:else if integrations.apple}
			<div transition:slide class="bg-black/20 p-4 rounded-xl border border-white/10 space-y-4 -mt-2">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-neutral-300">{i18n.t.todoSettings.yourWidgetUrl}</span>
					<button onclick={() => showTutorialApple = !showTutorialApple} class="text-[10px] uppercase tracking-widest font-bold text-blue-500 hover:text-blue-400 transition-colors">
						{showTutorialApple ? i18n.t.todoSettings.hideTutorial : i18n.t.todoSettings.howToSetup}
					</button>
				</div>

				<div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <input type="text" readonly value={endpointUrlApple} class="flex-1 rounded-lg border border-white/10 bg-black/40 p-3 text-xs font-mono text-white outline-none select-all" />
            <button onclick={() => copyUrl()} class="h-[42px] px-4 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-colors">
              {copiedApple ? i18n.t.todoSettings.copied : i18n.t.todoSettings.copy}
            </button>
          </div>
          <div class="flex justify-between items-center px-1">
            <span class="text-[10px] text-neutral-500">{i18n.t.todoSettings.urlLeaked}</span>
            <button onclick={() => rotateUrl()} class="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-widest flex items-center gap-1"><RefreshCw size={10} /> {i18n.t.todoSettings.rotateUrl}</button>
          </div>
				</div>

				{#if showTutorialApple}
					<div transition:slide class="bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-neutral-300 leading-relaxed">
						<p class="mb-3 font-semibold text-white">{i18n.t.todoSettings.tutorialIntro}</p>
						<p class="mb-2"><strong class="text-white">1.</strong> {i18n.t.todoSettings.tutorialStep1} <a href={SHORTCUT_URL_APPLE} target="_blank" class="text-blue-400 hover:underline">{i18n.t.todoSettings.installShortcut}</a></p>
						<p class="mb-2"><strong class="text-white">2.</strong> {i18n.t.todoSettings.tutorialStep2}</p>
						<p><strong class="text-white">3.</strong> {i18n.t.todoSettings.tutorialStep3}</p>
					</div>
				{/if}
			</div>
		{/if}

		<div class="flex items-center justify-between">
			<span class="text-sm font-semibold text-white flex items-center gap-2">Microsoft To-Do</span>
			{#if isLoggedIn}
			<button
				onclick={() => {
          integrations.microsoft = !integrations.microsoft;
          if (integrations.microsoft) fetchExternalReminders('microsoft');
        }}
				class="w-10 h-5 rounded-full transition-colors relative {integrations.microsoft ? 'bg-blue-500' : 'bg-neutral-600'}"
			>
				<div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform {integrations.microsoft ? 'translate-x-5' : ''}"></div>
			</button>
			{/if}
		</div>

		{#if !isLoggedIn}
			<div class="bg-black/20 p-4 rounded-xl border border-white/10 mt-2">
				<p class="text-xs text-neutral-400 mb-3">{i18n.t.dashboardSettings.signInToSync}</p>
				<a href="/login" class="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors inline-block text-center w-full">
					{i18n.currentLang === 'de' ? 'Anmelden' : 'Sign in'}
				</a>
			</div>
		{:else if integrations.microsoft}
			<div transition:slide class="bg-black/20 p-4 rounded-xl border border-white/10 space-y-4 -mt-2">
				{#if msNeedsLogin}
					<div class="flex items-center justify-between">
						<span class="text-xs text-red-400">{i18n.t.integrations.notConnected}</span>
						<a href="/settings" class="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors inline-block text-center">
							{i18n.t.todoSettings.connectAccount}
						</a>
					</div>
					<p class="text-[11px] text-neutral-400 mt-2">{i18n.t.todoSettings.connectAccountDesc}</p>
				{:else}
					<div class="flex items-center justify-between">
						<span class="text-xs text-green-400 font-medium flex items-center gap-1.5"><Check size={14}/> {i18n.t.todoSettings.successfullyConnected}</span>
						<a href="/settings" class="text-[10px] text-neutral-500 hover:text-white transition-colors">{i18n.t.todoSettings.manageAccount}</a>
					</div>
					<p class="text-[11px] text-neutral-400">{i18n.t.todoSettings.msSyncActive}</p>
				{/if}
			</div>
		{/if}
	</div>
</SettingsDialog>
