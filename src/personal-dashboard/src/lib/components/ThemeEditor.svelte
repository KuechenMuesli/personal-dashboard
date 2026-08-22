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

  // Helligkeit der Hintergrundfarbe entscheidet ueber color-scheme. Vorher war
  // hier `light` fest verdrahtet -- dunkle Custom-Themes bekamen dadurch helle
  // Scrollbars und Formular-Steuerelemente vom Browser.
  function isLight(hex: string): boolean {
    const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
    if (!m) return false;
    const n = parseInt(m[1], 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
  }

  let light = $derived(isLight(colors.bg));

  // Beide Schichten schreiben: die Palette-Slots fuer noch nicht migrierte
  // Widgets, die --ds-*-Tokens fuer alles Migrierte.
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
  --ds-surface-raised: ${colors.card};
  --ds-text-secondary: ${colors.muted};
  --ds-text-muted: ${colors.muted};
  --ds-fill: rgb(${light ? '0 0 0' : '255 255 255'} / 0.05);
  --ds-fill-strong: rgb(${light ? '0 0 0' : '255 255 255'} / 0.09);
  --ds-border: rgb(${light ? '0 0 0' : '255 255 255'} / ${light ? '0.09' : '0.07'});
  --ds-border-strong: rgb(${light ? '0 0 0' : '255 255 255'} / ${light ? '0.14' : '0.12'});
  color-scheme: ${light ? 'light' : 'dark'};
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

<div class="ds-scrim fixed inset-0 z-50 flex items-center justify-center p-4">
  <div class="ds-panel flex max-h-full w-full max-w-3xl flex-col overflow-hidden">
    <div class="flex items-center justify-between border-b border-line bg-fill p-6">
      <h2 class="flex items-center gap-3 text-xl font-semibold tracking-tight text-primary">
        <Palette class="text-accent" />
        {theme?.id ? 'Edit Theme' : 'Create Custom Theme'}
      </h2>
      <button onclick={onCancel} class="ds-icon-btn rounded-full p-2">
        <X size={20} />
      </button>
    </div>

    <div class="ds-scroll flex-1 space-y-8 overflow-y-auto p-6">
      <div>
        <label class="ds-label mb-2 block">Theme Name</label>
        <input 
          type="text" 
          bind:value={name} 
          class="ds-input p-4"
          placeholder="e.g. Neon Cyberpunk"
        />
      </div>

      <div>
        <label class="ds-label mb-4 block">Color Palette</label>
        <p class="ds-caption mb-6">Select your colors below. The dashboard behind this window will update in real-time to show you a preview.</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <!-- Background -->
          <div class="ds-well flex items-center justify-between p-4">
            <div class="flex items-center gap-4">
              <div class="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-line-strong" style="background-color: {colors.bg}">
                <Layout size={16} class="opacity-30 mix-blend-overlay" />
                <input type="color" bind:value={colors.bg} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div>
                <div class="text-sm font-semibold text-primary">Background</div>
                <div class="ds-caption">App wallpaper</div>
              </div>
            </div>
            <div class="ds-caption font-mono">{colors.bg}</div>
          </div>

          <!-- Cards -->
          <div class="ds-well flex items-center justify-between p-4">
            <div class="flex items-center gap-4">
              <div class="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-line-strong" style="background-color: {colors.card}">
                <div class="h-6 w-6 rounded bg-fill"></div>
                <input type="color" bind:value={colors.card} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div>
                <div class="text-sm font-semibold text-primary">Cards</div>
                <div class="ds-caption">Widget surfaces</div>
              </div>
            </div>
            <div class="ds-caption font-mono">{colors.card}</div>
          </div>

          <!-- Inner -->
          <div class="ds-well flex items-center justify-between p-4">
            <div class="flex items-center gap-4">
              <div class="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-line-strong" style="background-color: {colors.card}">
                <div class="h-4 w-8 rounded-sm border border-line" style="background-color: {colors.inner}"></div>
                <input type="color" bind:value={colors.inner} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div>
                <div class="text-sm font-semibold text-primary">Inputs & Inner</div>
                <div class="ds-caption">Searchbar, inputs</div>
              </div>
            </div>
            <div class="ds-caption font-mono">{colors.inner}</div>
          </div>

          <!-- Accent -->
          <div class="ds-well flex items-center justify-between p-4">
            <div class="flex items-center gap-4">
              <div class="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-line-strong" style="background-color: {colors.card}">
                <div class="rounded px-2 py-1 text-[8px] font-bold text-on-accent" style="background-color: {colors.accent}">Btn</div>
                <input type="color" bind:value={colors.accent} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div>
                <div class="text-sm font-semibold text-primary">Accent Color</div>
                <div class="ds-caption">Buttons, highlights</div>
              </div>
            </div>
            <div class="ds-caption font-mono">{colors.accent}</div>
          </div>

          <!-- Text Primary -->
          <div class="ds-well flex items-center justify-between p-4">
            <div class="flex items-center gap-4">
              <div class="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-line-strong" style="background-color: {colors.card}">
                <Type size={20} style="color: {colors.text}" />
                <input type="color" bind:value={colors.text} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div>
                <div class="text-sm font-semibold text-primary">Primary Text</div>
                <div class="ds-caption">Headings, icons</div>
              </div>
            </div>
            <div class="ds-caption font-mono">{colors.text}</div>
          </div>

          <!-- Text Muted -->
          <div class="ds-well flex items-center justify-between p-4">
            <div class="flex items-center gap-4">
              <div class="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-line-strong" style="background-color: {colors.card}">
                <Type size={14} style="color: {colors.muted}" />
                <input type="color" bind:value={colors.muted} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div>
                <div class="text-sm font-semibold text-primary">Muted Text</div>
                <div class="ds-caption">Descriptions, borders</div>
              </div>
            </div>
            <div class="ds-caption font-mono">{colors.muted}</div>
          </div>

        </div>
      </div>
    </div>

    <div class="flex items-center justify-between border-t border-line bg-fill p-6">
      {#if theme?.id && onDelete}
        <button 
          onclick={() => onDelete(theme.id!)}
          class="ds-btn ds-btn-danger px-6 py-3"
        >
          <Trash2 size={18} /> Delete
        </button>
      {:else}
        <div></div>
      {/if}
      
      <div class="flex gap-3">
        <button 
          onclick={onCancel}
          class="ds-btn ds-btn-ghost px-6 py-3"
        >
          Cancel
        </button>
        <button 
          onclick={handleSave}
          class="ds-btn ds-btn-primary px-6 py-3 active:scale-95"
        >
          <Save size={18} /> Save Theme
        </button>
      </div>
    </div>
  </div>
</div>
