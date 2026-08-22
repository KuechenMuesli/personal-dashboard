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
    class="ds-dialog ds-panel m-auto w-[95vw] {maxWidth} p-0 text-primary outline-none"
    oncancel={handleCancel}
>
  <div class="relative flex flex-col gap-5 p-6 {fixedHeight ? 'h-[85vh]' : 'max-h-[85vh]'}">
    <header class="mb-2 flex shrink-0 items-center justify-between">
      <h3 class="text-lg font-semibold tracking-tight">{title}</h3>
    </header>

    <div class="ds-scroll flex-grow space-y-4 overflow-y-auto pr-2">
      {@render children()}
    </div>

    <footer class="mt-2 flex shrink-0 justify-end gap-2 border-t border-line pt-4">
      {#if onSave}
        <button class="ds-btn ds-btn-ghost" onclick={handleCancel}>{i18n.t.w.common.cancel}</button>
        <button class="ds-btn ds-btn-primary px-6" onclick={handleSave}>{i18n.t.w.common.save}</button>
      {:else}
        <button class="ds-btn ds-btn-secondary px-6" onclick={handleCancel}>{i18n.t.w.common.close}</button>
      {/if}
    </footer>
  </div>

  {#if showConfirm}
    <div class="ds-scrim absolute inset-0 z-50 flex items-center justify-center rounded-xl">
      <div class="ds-panel w-[90%] max-w-sm p-6">
        <h4 class="mb-2 text-lg font-semibold text-primary">{i18n.t.w.common.discardChanges}</h4>
        <p class="mb-6 text-sm text-secondary">{i18n.t.w.common.discardMsg}</p>
        <div class="flex justify-end gap-2">
          <button class="ds-btn ds-btn-ghost" onclick={() => showConfirm = false}>{i18n.t.w.common.keepEditing}</button>
          <button class="ds-btn ds-btn-danger" onclick={confirmCancel}>{i18n.t.w.common.discard}</button>
        </div>
      </div>
    </div>
  {/if}
</dialog>
