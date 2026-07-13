<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { page } from '$app/stores';
  import WidgetCard from '$lib/components/WidgetCard.svelte';
  import SettingsDialog from '$lib/components/SettingsDialog.svelte';
  import DraggableList from '$lib/components/DraggableList.svelte';
  import CustomDropdown from '$lib/components/CustomDropdown.svelte';
  import { Plus, Trash2, Pencil, GripVertical, Check } from 'lucide-svelte';
  import { i18n } from '$lib/i18n/i18n.svelte';

  let { id, isEditing, showSettings = $bindable() } = $props<{
    id: string,
    isEditing?: boolean,
    showSettings?: boolean
  }>();

  let supabase = $derived($page.data.supabase);
  let session = $derived($page.data.session);

  let layouts = $state<any[]>([]);
  let currentLayoutId = $state<string | null>(null);
  let isLoading = $state(true);

  let editingLayout = $state<any>(null);
  let editName = $state("");
  let editTheme = $state("theme-default");

  let isDropdownOpen = $state(false);
  let dropdownRef: HTMLElement;
  let dropdownMenuRef: HTMLElement;
  let dropdownStyle = $state("");

  function handleWindowClick(e: MouseEvent) {
    if (isDropdownOpen && dropdownRef && !dropdownRef.contains(e.target as Node)) {
      if (dropdownMenuRef && dropdownMenuRef.contains(e.target as Node)) return;
      isDropdownOpen = false;
    }
  }

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy() { node.remove(); } };
  }

  function updateDropdownPosition() {
    if (!dropdownRef) return;
    const rect = dropdownRef.getBoundingClientRect();
    
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(layouts.length * 45 + 20, 300);
    
    if (spaceBelow < estimatedHeight && rect.top > spaceBelow) {
      dropdownStyle = `position: fixed; bottom: ${window.innerHeight - rect.top + 6}px; left: ${rect.left}px; min-width: 12rem; max-height: ${rect.top - 16}px; overflow-y: auto; z-index: 99999;`;
    } else {
      dropdownStyle = `position: fixed; top: ${rect.bottom + 6}px; left: ${rect.left}px; min-width: 12rem; max-height: ${spaceBelow - 16}px; overflow-y: auto; z-index: 99999;`;
    }
  }

  $effect(() => {
    if (isDropdownOpen) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  });

  let customThemes = $state<any[]>([]);

  let THEMES = $derived([
    { id: 'theme-default', name: i18n.t.themes.default },
    { id: 'theme-oled', name: i18n.t.themes.oled },
    { id: 'theme-midnight', name: i18n.t.themes.midnight },
    { id: 'theme-forest', name: i18n.t.themes.hacker },
    { id: 'theme-sunset', name: i18n.t.themes.sunset },
    { id: 'theme-light', name: i18n.t.themes.light },
    { id: 'theme-paper', name: i18n.t.themes.paper },
    ...customThemes.map(t => ({ id: `custom_${t.id}`, name: t.name }))
  ]);

  const dashboardActions = getContext<any>('dashboardActions');

  async function loadLayouts() {
    if (!session || !supabase) return;
    const { data } = await supabase
      .from('layouts')
      .select('id, name, is_active, theme')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });
    
    const { data: cThemes } = await supabase.from('custom_themes').select('*');
    if (cThemes) customThemes = cThemes;

    if (data) {
      layouts = data.sort((a: any, b: any) => (a.theme?.order || 0) - (b.theme?.order || 0));
      const active = data.find((l: any) => l.is_active);
      if (active) currentLayoutId = active.id;
    }
    isLoading = false;
  }

  onMount(() => {
    loadLayouts();
  });
  
  $effect(() => {
    if (showSettings) {
      loadLayouts();
    }
  });

  async function handleSwitch(layoutId: string) {
    if (layoutId === currentLayoutId) return;
    
    isLoading = true;
    await dashboardActions.switchLayout(layoutId);
    currentLayoutId = layoutId;
    isLoading = false;
    await loadLayouts(); // Refresh names and themes just in case
  }

  async function createWorkspace() {
    if (!session || !supabase) return;
    const newName = `Workspace ${layouts.length + 1}`;
    
    const { data } = await supabase.from('layouts').insert({
      user_id: session.user.id,
      name: newName,
      is_active: false,
      theme: { order: layouts.length, theme: 'theme-default' }
    }).select('id').single();

    if (data) {
      await loadLayouts();
    }
  }

  async function deleteWorkspace(layoutId: string) {
    if (layouts.length <= 1) {
      alert("You cannot delete your only workspace.");
      return;
    }
    if (layoutId === currentLayoutId) {
      alert("Please switch to another workspace before deleting this one.");
      return;
    }
    
    const confirmed = confirm("Are you sure you want to delete this workspace?");
    if (!confirmed) return;

    await supabase.from('layouts').delete().eq('id', layoutId);
    await loadLayouts();
  }

  let originalTheme = $state("");

  function startEdit(layout: any) {
    editingLayout = layout;
    editName = layout.name;
    editTheme = layout.theme?.theme || 'theme-default';
    originalTheme = editTheme;
  }

  $effect(() => {
    if (editingLayout && editingLayout.id === currentLayoutId && editTheme) {
       document.body.className = editTheme;
       localStorage.setItem('dashboard-theme', editTheme);
       if (editTheme.startsWith('custom_')) {
          const themeId = editTheme.replace('custom_', '');
          const theme = customThemes.find(t => t.id === themeId);
          if (theme) {
             let styleTag = document.getElementById('custom-theme-style');
             if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = 'custom-theme-style';
                document.head.appendChild(styleTag);
             }
             styleTag.innerHTML = `.${editTheme} {\n${theme.css_variables.raw}\n}`;
          }
       }
    }
  });

  async function saveEdit() {
    if (!editingLayout || !supabase) return;
    
    const newThemeObj = { ...editingLayout.theme, theme: editTheme };

    await supabase.from('layouts').update({
      name: editName,
      theme: newThemeObj
    }).eq('id', editingLayout.id);

    const wasCurrent = editingLayout.id === currentLayoutId;

    editingLayout = null;
    await loadLayouts();
    
    // Theme is already previewed/applied by the effect above
  }

  function cancelEdit() {
    if (editingLayout?.id === currentLayoutId && editTheme !== originalTheme) {
        editTheme = originalTheme;
    }
    isEditing = false;
    editingLayout = null;
  }

  async function saveOrder() {
    if (!supabase) return;
    const updates = layouts.map((l, idx) => {
      const newThemeObj = { ...l.theme, order: idx };
      return { id: l.id, theme: newThemeObj };
    });
    
    // update one by one for simplicity
    for (const up of updates) {
      await supabase.from('layouts').update({ theme: up.theme }).eq('id', up.id);
    }
    await loadLayouts();
  }

</script>

<svelte:window onclick={handleWindowClick} />

<WidgetCard bind:showSettings={showSettings} isConfigured={true} transparent={true} padding={false}>
  <div class="flex h-full w-full items-center pl-1 relative">
    {#if isLoading}
      <div class="h-8 w-48 animate-pulse bg-white/5 rounded-lg"></div>
    {:else}
      <div class="relative flex items-center group" bind:this={dropdownRef}>
        <button 
          class="flex items-center gap-2 bg-transparent border-none text-lg sm:text-xl font-bold text-white outline-none focus:ring-0 cursor-pointer tracking-tight"
          onclick={() => isDropdownOpen = !isDropdownOpen}
        >
          {layouts.find(l => l.id === currentLayoutId)?.name || 'Workspace'}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-neutral-400 opacity-50 group-hover:opacity-100 transition-opacity {isDropdownOpen ? 'rotate-180' : ''}"><path d="m6 9 6 6 6-6"/></svg>
        </button>

        {#if isDropdownOpen}
          <div 
            bind:this={dropdownMenuRef}
            use:portal 
            style={dropdownStyle} 
            class="bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl font-sans"
          >
            <div class="flex flex-col">
              {#each layouts as layout}
                <button 
                  class="w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                  onclick={(e) => { e.stopPropagation(); handleSwitch(layout.id); isDropdownOpen = false; }}
                >
                  {layout.name}
                  {#if layout.id === currentLayoutId}
                    <Check size={14} class="text-blue-500" />
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</WidgetCard>

<SettingsDialog title="Workspaces" bind:show={showSettings}>
  <div class="space-y-4">
    
    {#if editingLayout}
      <div class="bg-black/20 p-4 rounded-xl border border-white/10 space-y-4">
        <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-widest">Edit Workspace</h4>
        
        <div class="space-y-3 pt-2">
          <div class="space-y-1">
            <label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">{i18n.t.w.common.name}</label>
            <input type="text" bind:value={editName} class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" />
          </div>
          <div class="space-y-1">
            <label class="text-[10px] uppercase font-black text-neutral-500 tracking-widest">{i18n.t.settings.appearance.theme}</label>
            <CustomDropdown 
              bind:value={editTheme} 
              options={THEMES.map(t => ({ value: t.id, label: t.name }))} 
            />
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button onclick={cancelEdit} class="flex-1 rounded-lg bg-transparent py-2.5 text-sm font-bold text-neutral-400 hover:text-white transition-colors">Cancel</button>
          <button onclick={saveEdit} class="flex-1 rounded-lg bg-black/40 py-2.5 text-sm font-bold text-white hover:bg-black/60 transition-colors border border-black/40">Save</button>
        </div>
      </div>
    {:else}
      <DraggableList
        bind:items={layouts}
        onSort={saveOrder}
        handleClass="drag-handle"
        listClass="flex flex-col gap-2"
        itemClass="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5"
      >
        {#snippet children(layout, i)}
            <div class="flex items-center gap-3">
              <div class="drag-handle cursor-grab active:cursor-grabbing text-neutral-500 hover:text-white transition-colors shrink-0 px-1">
                <GripVertical size={16} strokeWidth={2.5} />
              </div>
              <div>
                <span class="text-sm font-bold text-white flex items-center gap-2">
                  {layout.name}
                  {#if layout.id === currentLayoutId}
                    <span class="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Active</span>
                  {/if}
                </span>
                <span class="text-xs text-neutral-500 capitalize">{THEMES.find(t => t.id === (layout.theme?.theme || 'theme-default'))?.name || 'Default'}</span>
              </div>
            </div>
            
            <div class="flex items-center gap-1">
              <button onclick={() => startEdit(layout)} class="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <Pencil size={14} />
              </button>
              <button onclick={() => deleteWorkspace(layout.id)} class="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" disabled={layouts.length <= 1}>
                <Trash2 size={14} />
              </button>
            </div>
        {/snippet}
      </DraggableList>

      <button onclick={createWorkspace} class="w-full rounded-lg bg-black/40 py-2.5 text-sm font-bold text-white hover:bg-black/60 transition-colors border border-black/40 flex items-center justify-center gap-2 mt-4">
        <Plus size={14} /> New Workspace
      </button>
    {/if}
  </div>
</SettingsDialog>
