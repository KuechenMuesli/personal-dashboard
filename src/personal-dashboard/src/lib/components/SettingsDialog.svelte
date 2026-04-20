<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    show = $bindable(false),
    onSave,
    children
  }: {
    title: string;
    show: boolean;
    onSave?: () => void;
    children: Snippet;
  } = $props();

  let dialogEl = $state<HTMLDialogElement | null>(null);

  $effect(() => {
    if (show && dialogEl && !dialogEl.open) dialogEl.showModal();
    else if (!show && dialogEl?.open) dialogEl.close();
  });

  function handleSave() {
    if (onSave) onSave();
    show = false;
  }
</script>

<dialog
		bind:this={dialogEl}
		class="fixed left-1/2 top-1/2 m-0 w-[90vw] max-w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-black/50 bg-neutral-800 p-0 text-slate-200 shadow-2xl outline-none backdrop:bg-black/80 backdrop:backdrop-blur-sm"
		onclose={() => (show = false)}
>
	<div class="flex flex-col gap-5 p-6 max-h-[85vh] bg-neutral-800 text-slate-200">
		<header class="flex items-center justify-between shrink-0">
			<h3 class="text-lg font-bold">{title}</h3>
			<button class="text-2xl text-neutral-500 hover:text-white leading-none transition-colors" onclick={() => (show = false)}>&times;</button>
		</header>

		<div class="flex-grow overflow-y-auto space-y-4 scrollbar-thin pr-2">
			{@render children()}
		</div>

		<footer class="flex justify-end gap-2 shrink-0 border-t border-black/20 pt-4 mt-2">
			<button class="rounded-lg px-4 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors" onclick={() => (show = false)}>Cancel</button>
			{#if onSave}
				<button class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20" onclick={handleSave}>Save</button>
			{/if}
		</footer>
	</div>
</dialog>
