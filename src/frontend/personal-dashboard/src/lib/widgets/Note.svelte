<script lang="ts">
  import { marked } from 'marked';

  let { id, isEditing, onAddNote, onDragStart, onResizeStart } = $props<{
    id: string,
    isEditing: boolean,
    onAddNote?: () => void,
    onDragStart?: (e: MouseEvent) => void,
    onResizeStart?: (e: MouseEvent) => void
  }>();

  let content = $state("");
  let isMarkdownMode = $state(false);
  let saveTimeout: ReturnType<typeof setTimeout>;

  $effect(() => {
    const saved = localStorage.getItem(`note-settings-${id}`);
    if (saved) content = saved;
  });

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    content = target.value;
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      localStorage.setItem(`note-settings-${id}`, content);
    }, 500);
  }

  const renderedMarkdown = $derived(marked.parse(content));
</script>

<div class="flex h-full w-full flex-col overflow-hidden rounded-xl bg-neutral-800 ring-1 ring-white/5">
	<div class="flex h-8 items-center justify-between border-b border-white/5 bg-neutral-900/50 px-2">
		<div class="flex items-center gap-2">
			<button
					onclick={() => isMarkdownMode = !isMarkdownMode}
					class="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors
               {isMarkdownMode ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-400 hover:text-white'}"
			>
				{isMarkdownMode ? 'View' : 'Edit'}
			</button>

			<div
					onmousedown={onDragStart}
					role="presentation"
					class="cursor-grab text-neutral-600 hover:text-neutral-400 active:cursor-grabbing px-2 py-1 text-xs transition-colors"
			>
				⠿
			</div>
		</div>

		<button
				onclick={onAddNote}
				class="flex h-5 w-5 items-center justify-center rounded bg-neutral-700 text-lg text-neutral-300 hover:bg-neutral-600 hover:text-white"
		>
			+
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
					placeholder="Write something..."
					spellcheck="false"
					class="h-full w-full resize-none border-none bg-transparent p-3.5 font-mono text-[13px] leading-relaxed tracking-tight text-slate-200 outline-none placeholder:text-neutral-600
               scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent"
			></textarea>
		{/if}

		<div
				onmousedown={onResizeStart}
				role="presentation"
				class="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize bg-gradient-to-br from-transparent from-50% to-white/10 to-50% hover:to-white/30"
		></div>
	</div>
</div>

<style>
  textarea::-webkit-scrollbar-track {
    margin: 8px 0;
  }
  :global(.prose h1) { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; }
  :global(.prose p) { margin-bottom: 0.75rem; }
</style>
