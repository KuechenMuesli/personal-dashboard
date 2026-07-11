<script lang="ts">
  import { getContext } from 'svelte';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { marked } from 'marked';
  import { Plus, X, GripHorizontal, PenLine, Eye } from 'lucide-svelte';
  import WidgetCard from '$lib/components/WidgetCard.svelte';

  let { id, isEditing, onAddNote, onDelete, onDragStart, onResizeStart, width, height, showSettings, hidden } = $props<{
    id: string,
    isEditing?: boolean,
    onAddNote?: () => void,
    onDelete?: () => void,
    onDragStart?: (e: MouseEvent | TouchEvent) => void,
    onResizeStart?: (e: MouseEvent | TouchEvent) => void,
    width?: number,
    height?: number,
    showSettings?: boolean,
    hidden?: boolean
  }>();

  const getSecrets = getContext<() => Record<string, any>>('secrets');

  let content = $state("");
  let isMarkdownMode = $state(false);
  let saveTimeout: ReturnType<typeof setTimeout>;
  let isLoaded = $state(false);

  $effect(() => {
    const secrets = getSecrets();
    if (!isLoaded) {
      if (secrets[id]) {
        content = secrets[id].content || "";
        isMarkdownMode = secrets[id].isMarkdownMode || false;
      } else {
        const savedContent = localStorage.getItem(`note-settings-${id}`);
        if (savedContent) content = savedContent;

        const savedMode = localStorage.getItem(`note-mode-${id}`);
        if (savedMode !== null) {
          isMarkdownMode = savedMode === 'true';
        }
      }
      isLoaded = true;
    }
  });

  function saveToCloud() {
    fetch('/api/secrets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: id, key: { content, isMarkdownMode } })
    }).catch(console.error);
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    content = target.value;
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      localStorage.setItem(`note-settings-${id}`, content);
      saveToCloud();
    }, 500);
  }

  function handleKeyDown(e: KeyboardEvent) {
    const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const isMod: boolean = isMac ? e.metaKey : e.ctrlKey;

    if (isMod && e.key.toLowerCase() === 's') {
      e.preventDefault();

      const markdownTitle = extractTitle(content);
      const fileName = markdownTitle
        ? markdownTitle.replace(/\s+/g, '_') + '.md'
        : 'dashboard-note.md';

      const file = new File([content], fileName, { type: "text/markdown" });

      const exportUrl = URL.createObjectURL(file);
      const link = document.createElement('a');

      link.href = exportUrl;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(exportUrl);
    }
  }

  function toggleMode() {
    isMarkdownMode = !isMarkdownMode;
    localStorage.setItem(`note-mode-${id}`, String(isMarkdownMode));
    saveToCloud();
  }

  function handleDelete() {
    localStorage.removeItem(`note-settings-${id}`);
    localStorage.removeItem(`note-mode-${id}`);
    if (onDelete) onDelete();
  }

  function extractTitle(markdown: string): string | null {
    const match = markdown.match(/^#+\s*(.+)/);
    if (match) return match[1].trim();
    return null;
  }

  const renderedMarkdown = $derived(marked.parse(content));
</script>

<WidgetCard isConfigured={true} padding={false}>
	<div class="flex h-full w-full flex-col font-sans" onkeydown={handleKeyDown}>

		<div class="flex h-8 shrink-0 items-center gap-2 border-b border-black/20 bg-black/10 px-2">
			<button
					onclick={onAddNote}
					title="Add new note"
					class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-500 transition-colors hover:bg-black/20 hover:text-white"
			>
				<Plus size={14} strokeWidth={2.5} />
			</button>

			<button
					onclick={toggleMode}
					class="flex h-5 items-center gap-1.5 rounded px-2 text-[9px] font-bold uppercase tracking-wider transition-colors shrink-0
             {!isMarkdownMode ? 'bg-white/10 text-slate-200 shadow-sm' : 'bg-black/20 text-neutral-500 hover:text-white'}"
			>
				{#if isMarkdownMode}
					<PenLine size={10} strokeWidth={2.5} /> {i18n.t.w.note.editMode}
				{:else}
					<Eye size={10} strokeWidth={2.5} /> {i18n.t.w.note.viewMode}
				{/if}
			</button>

			<div
					onmousedown={onDragStart}
					ontouchstart={onDragStart}
					role="presentation"
					class="flex h-full flex-grow cursor-grab touch-none items-center justify-center text-neutral-600 transition-colors hover:text-neutral-400 active:cursor-grabbing"
			>
				<GripHorizontal size={14} strokeWidth={2.5} />
			</div>

			<button
					onclick={handleDelete}
					title="Delete note"
					class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
			>
				<X size={14} strokeWidth={2.5} />
			</button>
		</div>
		<div class="relative flex-grow overflow-hidden">
			{#if isMarkdownMode}
				<div class="prose prose-invert h-full w-full overflow-auto p-3.5 text-[13px] leading-relaxed text-slate-200
                   scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
					{@html renderedMarkdown}
				</div>
			{:else}
        <textarea
          value={content}
          oninput={handleInput}
          placeholder={i18n.t.w.note.placeholder}
          spellcheck="false"
          class="h-full w-full resize-none border-none bg-transparent p-3.5 font-mono text-[13px] leading-relaxed tracking-tight text-slate-200 outline-none placeholder:text-neutral-600
                scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent"
        ></textarea>
			{/if}

			<div
					onmousedown={onResizeStart}
					ontouchstart={onResizeStart}
					role="presentation"
					class="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize touch-none bg-gradient-to-br from-transparent from-50% to-black/30 to-50% transition-colors hover:to-black/50"
			></div>
		</div>
	</div>
</WidgetCard>

<style>
  textarea::-webkit-scrollbar-track { margin: 8px 0; }
  :global(.prose) { color: inherit !important; }
  :global(.prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6) { 
    color: inherit !important; 
    font-weight: bold; 
    margin-bottom: 0.5rem; 
  }
  :global(.prose h1) { font-size: 1.25rem; margin-top: 0.5rem; }
  :global(.prose h2) { font-size: 1.1rem; }
  :global(.prose p, .prose ul, .prose ol, .prose li, .prose blockquote, .prose strong, .prose em, .prose a, .prose code, .prose pre) { 
    color: inherit !important; 
  }
  :global(.prose a) { text-decoration: underline; opacity: 0.9; }
  :global(.prose blockquote) { 
    border-left-color: currentColor !important; 
    opacity: 0.8; 
  }
  :global(.prose p) { margin-bottom: 0.75rem; }
</style>
