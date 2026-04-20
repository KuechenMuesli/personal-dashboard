<script lang="ts">
  import { onMount } from 'svelte';
  import { Activity, AppWindow, Server } from 'lucide-svelte';
  import WidgetCard from '$lib/components/WidgetCard.svelte';

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

<WidgetCard bind:showSettings={showSettings} isConfigured={true} padding={false}>
	<div class="flex h-full w-full flex-col justify-center p-2 sm:p-3">

		{#if is1x1}
			<div class="flex w-full items-center justify-center">
				<div class="flex items-center gap-1.5 sm:gap-2">
					<Activity size={14} strokeWidth={2.5} class="text-neutral-500" />
					<span class="font-mono text-sm font-bold {loadTime && loadTime < 500 ? 'text-emerald-400' : 'text-yellow-400'}">
        {loadTime !== null ? `${loadTime}ms` : '...'}
      </span>
				</div>
			</div>

		{:else if isWide}
			<div class="flex h-full w-full flex-row items-center justify-around px-1">
				<div class="flex flex-col items-center gap-1">
					<div class="flex items-center gap-1 text-neutral-500">
						<Activity size={10} strokeWidth={2.5} />
						<span class="text-[9px] font-black uppercase tracking-widest">Load</span>
					</div>
					<span class="font-mono text-xs sm:text-sm font-semibold {loadTime && loadTime < 500 ? 'text-emerald-400' : 'text-yellow-400'}">
        {loadTime !== null ? `${loadTime}ms` : '...'}
      </span>
				</div>

				<div class="flex flex-col items-center gap-1">
					<div class="flex items-center gap-1 text-neutral-500">
						<AppWindow size={10} strokeWidth={2.5} />
						<span class="text-[9px] font-black uppercase tracking-widest">DOM</span>
					</div>
					<span class="font-mono text-xs text-blue-400 sm:text-sm font-semibold">
        {domReadyTime !== null ? `${domReadyTime}ms` : '...'}
      </span>
				</div>

				<div class="flex flex-col items-center gap-1">
					<div class="flex items-center gap-1 text-neutral-500">
						<Server size={10} strokeWidth={2.5} />
						<span class="text-[9px] font-black uppercase tracking-widest">TTFB</span>
					</div>
					<span class="font-mono text-xs text-purple-400 sm:text-sm font-semibold">
        {ttfb !== null ? `${ttfb}ms` : '...'}
      </span>
				</div>
			</div>

		{:else}
			<div class="flex flex-col gap-0 divide-y divide-black/20 overflow-hidden rounded-lg bg-black/20 border border-black/10">

				<div class="flex items-center justify-between px-3 py-2 sm:py-2.5">
					<div class="flex items-center gap-1.5 text-neutral-500">
						<Activity size={12} strokeWidth={2.5} />
						<span class="text-[9px] font-black uppercase tracking-widest mt-0.5">Total Load</span>
					</div>
					<span class="font-mono text-xs sm:text-sm font-semibold {loadTime && loadTime < 500 ? 'text-emerald-400' : 'text-yellow-400'}">
        {loadTime !== null ? `${loadTime}ms` : '...'}
      </span>
				</div>

				<div class="flex items-center justify-between px-3 py-2 sm:py-2.5">
					<div class="flex items-center gap-1.5 text-neutral-500">
						<AppWindow size={12} strokeWidth={2.5} />
						<span class="text-[9px] font-black uppercase tracking-widest mt-0.5">DOM Ready</span>
					</div>
					<span class="font-mono text-xs text-blue-400 sm:text-sm font-semibold">
        {domReadyTime !== null ? `${domReadyTime}ms` : '...'}
      </span>
				</div>

				<div class="flex items-center justify-between px-3 py-2 sm:py-2.5">
					<div class="flex items-center gap-1.5 text-neutral-500">
						<Server size={12} strokeWidth={2.5} />
						<span class="text-[9px] font-black uppercase tracking-widest mt-0.5">TTFB</span>
					</div>
					<span class="font-mono text-xs text-purple-400 sm:text-sm font-semibold">
        {ttfb !== null ? `${ttfb}ms` : '...'}
      </span>
				</div>

			</div>
		{/if}

	</div>
</WidgetCard>
