<script lang="ts">
  let { id, isEditing } = $props<{ id: string, isEditing: boolean }>();

  let content = $state("");
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
</script>

<div class="h-full w-full overflow-hidden rounded-xl bg-neutral-800">
  <textarea
			value={content}
			oninput={handleInput}
			placeholder="Write something..."
			spellcheck="false"
			class="h-full w-full resize-none border-none bg-transparent p-3.5 font-mono text-[13px] leading-relaxed tracking-tight text-slate-200 outline-none placeholder:text-neutral-600
           scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent"
	></textarea>
</div>

<style>
  textarea::-webkit-scrollbar-track {
    margin: 8px 0;
  }
</style>
