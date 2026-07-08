<script lang="ts" generics="T">
    import { onMount, onDestroy } from 'svelte';
    import Sortable from 'sortablejs';

    let {
        items = $bindable(),
        onSort,
        itemClass = "",
        listClass = "",
        handleClass = "",
        children,
        animation = 150,
        ghostClass = "opacity-50"
    } = $props<{
        items: T[];
        onSort?: (items: T[]) => void;
        itemClass?: string;
        listClass?: string;
        handleClass?: string;
        children: import('svelte').Snippet<[T, number]>;
        animation?: number;
        ghostClass?: string;
    }>();

    let listRef = $state<HTMLElement | null>(null);
    let sortable: Sortable | null = null;

    onMount(() => {
        if (!listRef) return;
        sortable = new Sortable(listRef, {
            animation,
            ghostClass,
            forceFallback: true, // This forces a custom CSS-based drag avatar, preventing the ugly clipped native ghost image!
            fallbackClass: "opacity-80 scale-105 shadow-xl cursor-grabbing",
            handle: handleClass ? `.${handleClass}` : undefined,
            onEnd: (evt) => {
                const { oldIndex, newIndex } = evt;
                if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
                    
                    // Svelte array update
                    const movedItem = items[oldIndex];
                    items.splice(oldIndex, 1);
                    items.splice(newIndex, 0, movedItem);
                    
                    if (onSort) onSort(items);
                }
            }
        });
    });

    onDestroy(() => {
        if (sortable) sortable.destroy();
    });
</script>

<div bind:this={listRef} class={listClass}>
    {#each items as item, i}
        <div class={itemClass}>
            {@render children(item, i)}
        </div>
    {/each}
</div>
