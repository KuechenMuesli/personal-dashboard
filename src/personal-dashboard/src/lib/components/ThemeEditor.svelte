<script lang="ts">
  import { Save, Trash2, X, Palette, Layout, Type, MousePointer2 } from 'lucide-svelte';
  import { onDestroy } from 'svelte';
  
  let { theme, onSave, onCancel, onDelete } = $props<{
    theme: { id?: string, name: string, css_variables: string | { raw: string } } | null,
    onSave: (theme: { id?: string, name: string, css_variables: string }) => void,
    onCancel: () => void,
    onDelete?: (id: string) => void
  }>();

  let name = $state(theme?.name || 'New Custom Theme');
  
  // Parse existing CSS or use defaults
  const rawCss = typeof theme?.css_variables === 'object' ? theme.css_variables.raw : (theme?.css_variables || '');
  
  function extractColor(variable: string, fallback: string) {
    if (!rawCss) return fallback;
    const match = rawCss.match(new RegExp(`${variable}:\\s*([^;]+);`));
    return match ? match[1].trim() : fallback;
  }

  let colors = $state({
    bg: extractColor('--theme-body-bg', '#1a1a2e'),
    card: extractColor('--color-neutral-800', '#16213e'),
    inner: extractColor('--color-neutral-900', '#0f3460'),
    accent: extractColor('--color-blue-500', '#e94560'),
    text: extractColor('--color-widget-text', '#ffffff'),
    muted: extractColor('--color-neutral-400', '#a1a1aa')
  });

  let generatedCss = $derived(`
  --theme-body-bg: ${colors.bg};
  --color-neutral-600: ${colors.inner};
  --color-neutral-700: ${colors.inner};
  --color-neutral-800: ${colors.card};
  --color-neutral-900: ${colors.inner};
  --color-neutral-950: ${colors.inner};
  --color-blue-500: ${colors.accent};
  --color-widget-text: ${colors.text};
  --color-white: ${colors.text};
  --color-slate-200: ${colors.text};
  --color-neutral-300: ${colors.text};
  --color-slate-300: ${colors.muted};
  --color-slate-400: ${colors.muted};
  --color-neutral-400: ${colors.muted};
  --color-neutral-500: ${colors.muted};
  --tw-shadow-color: rgba(0,0,0,0.4);
  color-scheme: light;
  `);

  $effect(() => {
    if (typeof document !== 'undefined') {
      let styleTag = document.getElementById('theme-editor-live-preview');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'theme-editor-live-preview';
        document.head.appendChild(styleTag);
      }
      // Apply directly to body with high specificity to override existing themes while editing
      styleTag.innerHTML = `body { ${generatedCss} }`;
    }
  });

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      const styleTag = document.getElementById('theme-editor-live-preview');
      if (styleTag) styleTag.remove();
    }
  });

  function handleSave() {
    onSave({ id: theme?.id, name, css_variables: generatedCss });
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
  <div class="flex max-h-full w-full max-w-3xl flex-col rounded-[24px] border border-neutral-700 bg-neutral-900 shadow-2xl overflow-hidden">
    <div class="flex items-center justify-between border-b border-neutral-800 p-6 bg-black/20">
      <h2 class="text-xl font-bold text-white flex items-center gap-3">
        <Palette class="text-blue-500" />
        {theme?.id ? 'Edit Theme' : 'Create Custom Theme'}
      </h2>
      <button onclick={onCancel} class="rounded-full p-2 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors">
        <X size={20} />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-6 space-y-8 bg-neutral-900">
      <div>
        <label class="block text-sm font-bold text-neutral-400 mb-2">Theme Name</label>
        <input 
          type="text" 
          bind:value={name} 
          class="w-full rounded-xl border border-neutral-700 bg-black/40 p-4 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. Neon Cyberpunk"
        />
      </div>

      <div>
        <label class="block text-sm font-bold text-neutral-400 mb-4">Color Palette</label>
        <p class="text-xs text-neutral-500 mb-6">Select your colors below. The dashboard behind this window will update in real-time to show you a preview.</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <!-- Background -->
          <div class="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-black/20">
            <div class="flex items-center gap-4">
              <div class="relative w-12 h-12 rounded-lg border border-neutral-700 shadow-inner flex items-center justify-center overflow-hidden" style="background-color: {colors.bg}">
                <Layout size={16} class="text-black/20 mix-blend-overlay" />
                <input type="color" bind:value={colors.bg} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div>
                <div class="font-bold text-white text-sm">Background</div>
                <div class="text-xs text-neutral-500">App wallpaper</div>
              </div>
            </div>
            <div class="text-xs font-mono text-neutral-500">{colors.bg}</div>
          </div>

          <!-- Cards -->
          <div class="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-black/20">
            <div class="flex items-center gap-4">
              <div class="relative w-12 h-12 rounded-lg border border-neutral-700 shadow-lg flex items-center justify-center overflow-hidden" style="background-color: {colors.card}">
                <div class="w-6 h-6 rounded bg-black/10"></div>
                <input type="color" bind:value={colors.card} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div>
                <div class="font-bold text-white text-sm">Cards</div>
                <div class="text-xs text-neutral-500">Widget surfaces</div>
              </div>
            </div>
            <div class="text-xs font-mono text-neutral-500">{colors.card}</div>
          </div>

          <!-- Inner -->
          <div class="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-black/20">
            <div class="flex items-center gap-4">
              <div class="relative w-12 h-12 rounded-lg border border-neutral-700 flex items-center justify-center overflow-hidden" style="background-color: {colors.card}">
                <div class="w-8 h-4 rounded-sm border border-black/20" style="background-color: {colors.inner}"></div>
                <input type="color" bind:value={colors.inner} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div>
                <div class="font-bold text-white text-sm">Inputs & Inner</div>
                <div class="text-xs text-neutral-500">Searchbar, inputs</div>
              </div>
            </div>
            <div class="text-xs font-mono text-neutral-500">{colors.inner}</div>
          </div>

          <!-- Accent -->
          <div class="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-black/20">
            <div class="flex items-center gap-4">
              <div class="relative w-12 h-12 rounded-lg border border-neutral-700 flex items-center justify-center overflow-hidden" style="background-color: {colors.card}">
                <div class="px-2 py-1 rounded text-[8px] font-bold text-white shadow-md" style="background-color: {colors.accent}">Btn</div>
                <input type="color" bind:value={colors.accent} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div>
                <div class="font-bold text-white text-sm">Accent Color</div>
                <div class="text-xs text-neutral-500">Buttons, highlights</div>
              </div>
            </div>
            <div class="text-xs font-mono text-neutral-500">{colors.accent}</div>
          </div>

          <!-- Text Primary -->
          <div class="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-black/20">
            <div class="flex items-center gap-4">
              <div class="relative w-12 h-12 rounded-lg border border-neutral-700 flex items-center justify-center overflow-hidden" style="background-color: {colors.card}">
                <Type size={20} style="color: {colors.text}" />
                <input type="color" bind:value={colors.text} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div>
                <div class="font-bold text-white text-sm">Primary Text</div>
                <div class="text-xs text-neutral-500">Headings, icons</div>
              </div>
            </div>
            <div class="text-xs font-mono text-neutral-500">{colors.text}</div>
          </div>

          <!-- Text Muted -->
          <div class="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-black/20">
            <div class="flex items-center gap-4">
              <div class="relative w-12 h-12 rounded-lg border border-neutral-700 flex items-center justify-center overflow-hidden" style="background-color: {colors.card}">
                <Type size={14} style="color: {colors.muted}" />
                <input type="color" bind:value={colors.muted} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div>
                <div class="font-bold text-white text-sm">Muted Text</div>
                <div class="text-xs text-neutral-500">Descriptions, borders</div>
              </div>
            </div>
            <div class="text-xs font-mono text-neutral-500">{colors.muted}</div>
          </div>

        </div>
      </div>
    </div>

    <div class="flex items-center justify-between border-t border-neutral-800 p-6 bg-black/40">
      {#if theme?.id && onDelete}
        <button 
          onclick={() => onDelete(theme.id!)}
          class="flex items-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-6 py-3 font-bold text-red-500 transition-colors hover:bg-red-500/20"
        >
          <Trash2 size={18} /> Delete
        </button>
      {:else}
        <div></div>
      {/if}
      
      <div class="flex gap-3">
        <button 
          onclick={onCancel}
          class="rounded-xl px-6 py-3 font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button 
          onclick={handleSave}
          class="flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 font-bold text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-105 hover:bg-blue-400 active:scale-95"
        >
          <Save size={18} /> Save Theme
        </button>
      </div>
    </div>
  </div>
</div>
