<script lang="ts">
  import { Check, Search, Sun, Copy } from "lucide-svelte";

  let {
    suggestions,
    selectedIndex,
    expandedItemId,
    copiedId,
    dropdownStyle,
  } = $props<{
    suggestions: any[];
    selectedIndex: number;
    expandedItemId: string | null;
    copiedId: string | null;
    dropdownStyle: string;
  }>();

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy() { node.remove(); } };
  }

  function getBadgeColor(badge: string) {
    switch (badge) {
      case 'FAV': return 'text-yellow-500';
      case 'CALENDAR': return 'text-purple-400';
      case 'REMINDER': return 'text-orange-400';
      case 'HISTORY': return 'text-slate-400';
      case 'WEB': return 'text-blue-400';
      case 'FACT': return 'text-emerald-400';
      case 'CALC': return 'text-pink-400';
      case 'CONV': return 'text-cyan-400';
      case 'WEATHER': return 'text-sky-400';
      case 'TIME': return 'text-indigo-400';
      case 'TRANSLATE': return 'text-violet-400';
      default: return 'text-emerald-400';
    }
  }
</script>

<div
  use:portal
  style={dropdownStyle}
  class="overflow-hidden rounded-xl border border-black/40 bg-neutral-900 shadow-2xl font-sans z-[99999]"
>
  {#each suggestions as item, i}
    <button
      onmousedown={(e) => e.preventDefault()}
      class="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors group {i === selectedIndex ? 'bg-black/40' : 'hover:bg-black/20'}"
      onclick={() => item.action()}
    >
      <div class="flex min-w-0 flex-col pr-2">
        <span class="whitespace-pre-wrap break-words text-[12px] {item.badge === 'FACT' ? 'font-normal' : 'font-semibold'} leading-snug mb-0.5 {i === selectedIndex ? 'text-white' : 'text-slate-300'} {item.expandable && expandedItemId !== item.id ? (item.badge === 'FACT' ? 'line-clamp-3' : 'line-clamp-1') : ''}">
          {#if item.icon}<svelte:component this={item.icon} size={14} class="inline-block mr-1.5 shrink-0 translate-y-[1px]" />{/if}
          <span>{item.title}</span>
        </span>
        {#if item.description && expandedItemId === item.id}
          <div class="text-[12px] font-normal mt-1.5 text-neutral-400 leading-relaxed whitespace-pre-wrap">
             {item.description}
          </div>
        {/if}
        <span class="flex items-center gap-1 truncate text-[10px] {i === selectedIndex ? 'text-blue-400' : getBadgeColor(item.badge)}">
          {#if copiedId === item.id}
            <Check size={10} strokeWidth={3} /> Copied!
          {:else}
            {#if item.badge === 'FACT'}
              <Search size={10} strokeWidth={3} />
            {:else if item.badge === 'HISTORY'}
              <Search size={10} strokeWidth={3} />
            {:else if item.badge === 'CALENDAR'}
              <Search size={10} strokeWidth={3} />
            {:else if item.badge === 'WEATHER'}
              <Sun size={10} strokeWidth={3} />
            {/if}
            {#if item.url}
               <a href={item.url} target="_blank" rel="noopener noreferrer"
                  onmousedown={(e) => e.stopPropagation()}
                  onclick={(e) => e.stopPropagation()}
                  class="hover:underline hover:text-blue-300 transition-colors z-10 relative">
                 {item.subtitle} ↗
               </a>
            {:else}
               {item.subtitle}
            {/if}
            {#if item.expandable}
              <span class="opacity-50 mx-1">•</span>
              {expandedItemId === item.id ? 'Click to collapse' : 'Click to read more'}
            {/if}
          {/if}
        </span>
      </div>
      <div class="flex items-center shrink-0 relative justify-end">
        <div class="shrink-0 rounded-md bg-black/30 border border-black/20 px-1.5 py-0.5 text-[8px] font-bold tracking-wider {getBadgeColor(item.badge)} transition-opacity duration-200 {item.onCopy || item.onDelete ? 'group-hover:opacity-0' : ''}">
          {item.badge}
        </div>
        {#if item.onCopy || item.onDelete}
          <div class="absolute right-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {#if item.onCopy}
              <div
                role="button" tabindex="0" onkeydown={(e) => { if(e.key==='Enter'){ e.stopPropagation(); item.onCopy!(); } }}
                onmousedown={(e) => e.preventDefault()}
                onclick={(e) => { e.stopPropagation(); item.onCopy!(); }}
                class="text-neutral-500 hover:text-white p-1 transition-colors cursor-pointer"
                title="Copy details"
              >
                <Copy size={12} strokeWidth={2.5} />
              </div>
            {/if}
            {#if item.onDelete}
              <div
                role="button" tabindex="0" onkeydown={(e) => { if(e.key==='Enter'){ e.stopPropagation(); item.onDelete!(); } }}
                onmousedown={(e) => e.preventDefault()}
                onclick={(e) => { e.stopPropagation(); item.onDelete!(); }}
                class="text-neutral-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                title="Delete from history"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </button>
  {/each}
</div>
