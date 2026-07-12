<script lang="ts">
  import { getContext } from 'svelte';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { Plus, X, Check, Circle, Trash2, Calendar, AlertCircle, Tag, GripHorizontal, FileText, ChevronDown, ChevronUp } from 'lucide-svelte';
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
  };

  let todos = $state<Todo[]>([]);
  let isLoaded = $state(false);
  let saveTimeout: ReturnType<typeof setTimeout>;
  
  // New Todo Form State
  let showAddForm = $state(false);
  let newTitle = $state("");
  let newDueDate = $state("");
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
      isLoaded = true;
    }
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
    newDueDate = "";
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
    todos = todos.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t);
    saveTodos();
  }

  function deleteTodo(todoId: string) {
    todos = todos.filter(t => t.id !== todoId);
    saveTodos();
  }
  
  function toggleExpand(todoId: string) {
    expandedTodos[todoId] = !expandedTodos[todoId];
  }

  let sortedTodos = $derived([...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.priority !== b.priority) {
      const pMap = { 'high': 3, 'medium': 2, 'low': 1, null: 0 };
      return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
    }
    return 0;
  }));
</script>

{#snippet headerButtons()}
  <button onclick={() => showAddForm = true} class="h-5 w-5 flex items-center justify-center rounded text-neutral-500 hover:text-white hover:bg-black/40 transition-colors">
    <Plus size={12} strokeWidth={2.5} />
  </button>
{/snippet}

<WidgetCard title={i18n.currentLang === 'de' ? 'Aufgaben' : 'Tasks'} headerActions={headerButtons}>
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
        {#each sortedTodos as todo (todo.id)}
          <div class="group flex flex-col bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all {todo.completed ? 'opacity-50' : ''}">
            <div class="relative flex items-start gap-3 p-3 pr-8">
              <button onclick={() => toggleTodo(todo.id)} class="shrink-0 mt-0.5 text-neutral-400 hover:text-white transition-colors">
                {#if todo.completed}
                  <Check size={18} class="text-blue-400" />
                {:else}
                  <Circle size={18} />
                {/if}
              </button>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-medium truncate {todo.completed ? 'line-through text-neutral-500' : 'text-slate-200'}">
                    {todo.title}
                  </span>
                  <div class="flex items-center gap-2 shrink-0">
                    {#if todo.priority}
                      <span class="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border
                        {todo.priority === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                         todo.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 
                         'bg-blue-500/20 text-blue-400 border-blue-500/30'}">
                        {todo.priority === 'high' ? '!' : todo.priority === 'medium' ? '=' : '-'} 
                        {i18n.currentLang === 'de' ? (todo.priority === 'high' ? 'HOCH' : todo.priority === 'medium' ? 'MITTEL' : 'NIEDRIG') : todo.priority.toUpperCase()}
                      </span>
                    {/if}
                  </div>
                </div>
                
              <button onclick={() => deleteTodo(todo.id)} class="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all">
                <Trash2 size={14} />
              </button>
                
                {#if todo.dueDate || todo.tags.length > 0 || todo.notes}
                  <div class="flex items-center gap-3 mt-1.5 flex-wrap">
                    {#if todo.dueDate}
                      <span class="flex items-center gap-1 text-[10px] text-neutral-500 font-medium">
                        <Calendar size={10} /> {new Date(todo.dueDate).toLocaleDateString(i18n.currentLang)}
                      </span>
                    {/if}
                    {#if todo.tags.length > 0}
                      <div class="flex gap-1 flex-wrap">
                        {#each todo.tags as tag}
                          <span class="text-[9px] font-bold px-1.5 py-0.5 bg-black/40 text-neutral-400 rounded-md">#{tag}</span>
                        {/each}
                      </div>
                    {/if}
                    {#if todo.notes}
                      <button onclick={() => toggleExpand(todo.id)} class="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white font-medium ml-auto">
                        <FileText size={10} /> {i18n.currentLang === 'de' ? 'Notizen' : 'Notes'}
                        {#if expandedTodos[todo.id]}
                          <ChevronUp size={10} />
                        {:else}
                          <ChevronDown size={10} />
                        {/if}
                      </button>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
            
            {#if expandedTodos[todo.id] && todo.notes}
              <div class="px-3 pb-3 pt-0 text-xs text-neutral-400 border-t border-white/5 mt-1 pt-2">
                {todo.notes}
              </div>
            {/if}
          </div>
        {/each}
        
        {#if todos.length === 0}
          <div class="flex flex-col items-center justify-center h-full text-center p-6 opacity-50">
            <Check size={48} class="mb-4 text-neutral-600" />
            <p class="text-sm font-medium text-neutral-400">{i18n.currentLang === 'de' ? 'Keine Aufgaben. Genieß den Tag!' : 'No tasks. Enjoy your day!'}</p>
          </div>
        {/if}
      </div>
  </div>
</WidgetCard>
