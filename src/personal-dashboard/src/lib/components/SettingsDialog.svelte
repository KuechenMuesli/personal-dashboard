<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { i18n } from '$lib/i18n/i18n.svelte';

  let {
    title,
    show = $bindable(false),
    onSave,
    data,
    onRevert,
    maxWidth = 'max-w-[450px]',
    fixedHeight = false,
    children
  }: {
    title: string;
    show: boolean;
    onSave?: () => void;
    data?: T;
    onRevert?: (restored: T) => void;
    maxWidth?: string;
    fixedHeight?: boolean;
    children: Snippet;
  } = $props();

  let dialogEl = $state<HTMLDialogElement | null>(null);
  let initialSnapshot = $state<string>('');
  let showConfirm = $state(false);

  $effect(() => {
    if (show && dialogEl && !dialogEl.open) {
      if (data !== undefined) initialSnapshot = JSON.stringify(data);
      dialogEl.showModal();
    }
    else if (!show && dialogEl?.open) {
      dialogEl.close();
      showConfirm = false;
    }
  });

  function handleSave() {
    if (onSave) onSave();
    show = false;
  }

  function handleCancel(e?: Event) {
    if (e) e.preventDefault();
    if (data !== undefined && onRevert) {
      const current = JSON.stringify(data);
      if (current !== initialSnapshot) {
        showConfirm = true;
        return;
      }
    }
    show = false;
  }

  function confirmCancel() {
    if (onRevert) onRevert(JSON.parse(initialSnapshot));
    show = false;
  }
</script>

<dialog
    bind:this={dialogEl}
    class="m-auto w-[95vw] {maxWidth} rounded-2xl border border-black/50 bg-neutral-800 p-0 text-slate-200 shadow-2xl outline-none backdrop:bg-neutral-950/80 backdrop:backdrop-blur-sm"
    oncancel={handleCancel}
>
  <div class="relative flex flex-col gap-5 p-6 {fixedHeight ? 'h-[85vh]' : 'max-h-[85vh]'} bg-neutral-800 text-slate-200 rounded-2xl">
    <header class="flex items-center justify-between shrink-0 mb-2">
      <h3 class="text-lg font-bold">{title}</h3>
    </header>

    <div class="flex-grow overflow-y-auto space-y-4 scrollbar-thin pr-2">
      {@render children()}
    </div>

    <footer class="flex justify-end gap-2 shrink-0 border-t border-black/20 pt-4 mt-2">
      {#if onSave}
        <button class="rounded-lg bg-transparent px-4 py-2.5 text-sm font-bold text-neutral-400 hover:text-white transition-colors" onclick={handleCancel}>{i18n.t.w.common.cancel}</button>
        <button class="rounded-lg bg-black/40 px-6 py-2.5 text-sm font-bold text-white hover:bg-black/60 transition-colors border border-black/40 shadow-lg shadow-black/20" onclick={handleSave}>{i18n.t.w.common.save}</button>
      {:else}
        <button class="rounded-lg bg-black/40 px-6 py-2.5 text-sm font-bold text-white hover:bg-black/60 transition-colors border border-black/40 shadow-lg shadow-black/20" onclick={handleCancel}>{i18n.t.w.common.close}</button>
      {/if}
    </footer>
  </div>

  {#if showConfirm}
    <div class="absolute inset-0 z-50 flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm rounded-2xl">
      <div class="bg-neutral-800 border border-black/40 rounded-xl p-6 shadow-2xl max-w-sm w-[90%]">
        <h4 class="text-lg font-bold text-white mb-2">{i18n.t.w.common.discardChanges}</h4>
        <p class="text-sm text-neutral-400 mb-6">{i18n.t.w.common.discardMsg}</p>
        <div class="flex justify-end gap-2">
          <button class="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:bg-black/40 hover:text-white transition-colors" onclick={() => showConfirm = false}>{i18n.t.w.common.keepEditing}</button>
          <button class="px-4 py-2 rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-500 shadow-lg shadow-red-900/20 transition-colors" onclick={confirmCancel}>{i18n.t.w.common.discard}</button>
        </div>
      </div>
    </div>
  {/if}
</dialog>
