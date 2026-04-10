<script lang="ts">
  import { marked } from 'marked';

  let { id, isEditing, onAddNote, onDragStart, onResizeStart } = $props<{
    id: string,
    isEditing: boolean,
    onAddNote?: () => void,
    onDragStart?: (e: MouseEvent | TouchEvent) => void,
    onResizeStart?: (e: MouseEvent | TouchEvent) => void
  }>();

  let content = $state("");
  let isMarkdownMode = $state(true);
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
	<div class="flex h-8 shrink-0 items-center border-b border-white/5 bg-neutral-900/50 px-2">
		<button
				onclick={() => isMarkdownMode = !isMarkdownMode}
				class="h-5 flex items-center rounded px-2 text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0
               {!isMarkdownMode ? 'bg-neutral-600 text-white' : 'bg-neutral-700/50 text-neutral-400 hover:text-white'}"
		>
			{isMarkdownMode ? 'Edit' : 'View'}
		</button>

		<div
				onmousedown={onDragStart}
				ontouchstart={onDragStart}
				role="presentation"
				class="flex h-full flex-grow cursor-grab touch-none items-center justify-center text-neutral-600 transition-colors hover:text-neutral-400 active:cursor-grabbing"
		>
			<span class="text-xs">⠿</span>
		</div>

		<button
				onclick={onAddNote}
				class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-neutral-700 text-lg leading-none text-neutral-300 transition-colors hover:bg-neutral-600 hover:text-white"
		>
			<span class="mb-0.5">+</span>
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
				ontouchstart={onResizeStart}
				role="presentation"
				class="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize touch-none bg-gradient-to-br from-transparent from-50% to-white/5 to-50% transition-colors hover:to-white/20"
		></div>
	</div>
</div>

<style>
  textarea::-webkit-scrollbar-track { margin: 8px 0; }
  :global(.prose h1) { font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem; color: #fff; }
  :global(.prose p) { margin-bottom: 0.75rem; }
</style>
