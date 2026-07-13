<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { ChevronDown, Check } from "lucide-svelte";

  let {
    options,
    value = $bindable(),
    placeholder = "Select...",
    class: className = ""
  } = $props<{
    options: { value: string; label: string }[];
    value: string;
    placeholder?: string;
    class?: string;
  }>();

  let isOpen = $state(false);
  let dropdownRef: HTMLElement;
  let dropdownMenuRef: HTMLElement;
  let dropdownStyle = $state("");

  function handleWindowClick(e: MouseEvent) {
    if (isOpen && dropdownRef && !dropdownRef.contains(e.target as Node)) {
      if (dropdownMenuRef && dropdownMenuRef.contains(e.target as Node)) return;
      isOpen = false;
    }
  }

  function portal(node: HTMLElement) {
    let target = document.body;
    const dialog = dropdownRef?.closest('dialog');
    if (dialog && dialog.open) {
      target = dialog;
    }
    target.appendChild(node);
    return { 
      destroy() { 
        node.remove(); 
      } 
    };
  }

  function updatePosition() {
    if (!dropdownRef) return;
    const rect = dropdownRef.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = Math.min(options.length * 40 + 16, 250);

    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      dropdownStyle = `position: fixed; bottom: ${window.innerHeight - rect.top + 6}px; left: ${rect.left}px; width: ${rect.width}px; max-height: ${spaceAbove - 16}px; overflow-y: auto; z-index: 99999;`;
    } else {
      dropdownStyle = `position: fixed; top: ${rect.bottom + 6}px; left: ${rect.left}px; width: ${rect.width}px; max-height: ${spaceBelow - 16}px; overflow-y: auto; z-index: 99999;`;
    }
  }

  $effect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  });

  const selectedLabel = $derived(options.find(o => o.value === value)?.label || placeholder);
</script>

<svelte:window onclick={handleWindowClick} />

<div class="relative w-full {className}">
  <button
    bind:this={dropdownRef}
    type="button"
    class="w-full flex items-center justify-between rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white hover:bg-black/20 transition-colors focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
    onclick={(e) => { e.stopPropagation(); isOpen = !isOpen; }}
  >
    <span class="truncate pr-4">{selectedLabel}</span>
    <ChevronDown size={14} class="shrink-0 text-neutral-400 transition-transform {isOpen ? 'rotate-180' : ''}" />
  </button>

  {#if isOpen}
    <div
      bind:this={dropdownMenuRef}
      use:portal
      style={dropdownStyle}
      class="bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl font-sans"
    >
      <div class="flex flex-col py-1">
        {#each options as option}
          <button
            type="button"
            class="w-full text-left px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors flex items-center justify-between"
            onclick={(e) => { e.stopPropagation(); value = option.value; isOpen = false; }}
          >
            <span class="truncate">{option.label}</span>
            {#if value === option.value}
              <Check size={14} class="text-blue-500 shrink-0" />
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
