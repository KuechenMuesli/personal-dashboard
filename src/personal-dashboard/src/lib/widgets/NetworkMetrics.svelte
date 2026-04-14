<script lang="ts">
  import { onMount } from 'svelte';

  let { id, isEditing, width = 1, height = 1, hidden, showSettings = $bindable() } = $props();

  let loadTime = $state<number | null>(null);
  let domReadyTime = $state<number | null>(null);
  let ttfb = $state<number | null>(null);

  onMount(() => {
    setTimeout(() => {
      const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];

      if (entries.length > 0) {
        const nav = entries[0];
        loadTime = Math.round(nav.loadEventEnd - nav.startTime);
        domReadyTime = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
        ttfb = Math.round(nav.responseStart - nav.requestStart);
      }
    }, 0);
  });

  let is1x1 = $derived(width === 1 && height === 1);
  let isWide = $derived(width > 1 && height === 1);
</script>

<div class="flex h-full w-full flex-col justify-center bg-neutral-800 p-2 sm:p-3 font-sans">

	{#if is1x1}
		<div class="flex w-full items-center justify-center">
			<div class="flex items-center gap-1.5 sm:gap-2">
				<span class="text-[10px] font-medium text-neutral-400 sm:text-xs">Total Load</span>
				<span class="font-mono text-sm font-bold {loadTime && loadTime < 500 ? 'text-emerald-400' : 'text-yellow-400'}">
          {loadTime !== null ? `${loadTime}ms` : '...'}
        </span>
			</div>
		</div>

	{:else if isWide}
		<div class="flex w-full flex-row items-center justify-around px-1">
			<div class="flex flex-col items-center gap-0.5 sm:gap-1">
				<span class="text-[10px] font-medium text-neutral-400">Total Load</span>
				<span class="font-mono text-xs sm:text-sm {loadTime && loadTime < 500 ? 'text-emerald-400' : 'text-yellow-400'}">
          {loadTime !== null ? `${loadTime}ms` : '...'}
        </span>
			</div>

			<div class="flex flex-col items-center gap-0.5 sm:gap-1">
				<span class="text-[10px] font-medium text-neutral-400">DOM Ready</span>
				<span class="font-mono text-xs text-blue-400 sm:text-sm">
          {domReadyTime !== null ? `${domReadyTime}ms` : '...'}
        </span>
			</div>

			<div class="flex flex-col items-center gap-0.5 sm:gap-1">
				<span class="text-[10px] font-medium text-neutral-400">TTFB</span>
				<span class="font-mono text-xs text-purple-400 sm:text-sm">
          {ttfb !== null ? `${ttfb}ms` : '...'}
        </span>
			</div>
		</div>

	{:else}
		<div class="flex flex-col gap-0 divide-y divide-neutral-800/50 overflow-hidden rounded bg-neutral-900/50">

			<div class="flex items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2">
				<span class="text-[10px] font-medium text-neutral-400 sm:text-xs">Total Load</span>
				<span class="font-mono text-xs sm:text-sm {loadTime && loadTime < 500 ? 'text-emerald-400' : 'text-yellow-400'}">
          {loadTime !== null ? `${loadTime}ms` : '...'}
        </span>
			</div>

			<div class="flex items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2">
				<span class="text-[10px] font-medium text-neutral-400 sm:text-xs">DOM Ready</span>
				<span class="font-mono text-xs text-blue-400 sm:text-sm">
          {domReadyTime !== null ? `${domReadyTime}ms` : '...'}
        </span>
			</div>

			<div class="flex items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2">
				<span class="text-[10px] font-medium text-neutral-400 sm:text-xs">TTFB</span>
				<span class="font-mono text-xs text-purple-400 sm:text-sm">
          {ttfb !== null ? `${ttfb}ms` : '...'}
        </span>
			</div>

		</div>
	{/if}

</div>
