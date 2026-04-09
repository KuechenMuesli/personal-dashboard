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

<div class="note-container">
  <textarea
			value={content}
			oninput={handleInput}
			placeholder="Write something..."
			spellcheck="false"
	></textarea>
</div>

<style>
  .note-container {
    width: 100%;
    height: 100%;
    background: #262626;
    display: flex;
    border-radius: 12px;
    overflow: hidden;
  }

  textarea {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    resize: none;
    color: #e2e8f0;
    padding: 14px;
    /* Monospaced font stack */
    font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, 'Consolas', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    letter-spacing: -0.01em;
    outline: none;
    border-radius: 12px;
  }

  textarea::placeholder {
    color: #525252;
  }

  /* Scrollbar styling */
  textarea::-webkit-scrollbar {
    width: 6px;
  }
  textarea::-webkit-scrollbar-thumb {
    background: #404040;
    border-radius: 10px;
  }
  textarea::-webkit-scrollbar-track {
    margin: 8px 0;
  }
</style>
