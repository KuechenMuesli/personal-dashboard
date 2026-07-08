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
        ghostClass = "sortable-ghost",
        fallbackClass = "sortable-fallback"
    } = $props<{
        items: T[];
        onSort?: (items: T[]) => void;
        itemClass?: string;
        listClass?: string;
        handleClass?: string;
        children: import('svelte').Snippet<[T, number]>;
        animation?: number;
        ghostClass?: string;
        fallbackClass?: string;
    }>();

    let listRef = $state<HTMLElement | null>(null);
    let sortable: Sortable | null = null;

    onMount(() => {
        if (!listRef) return;
        sortable = new Sortable(listRef, {
            animation,
            ghostClass,
            forceFallback: true, // This forces a custom CSS-based drag avatar, preventing the ugly clipped native ghost image!
            fallbackClass,
            handle: handleClass ? `.${handleClass}` : undefined,
            onEnd: (evt) => {
                const { oldIndex, newIndex } = evt;
                if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
                    const newItems = [...items];
                    const [moved] = newItems.splice(oldIndex, 1);
                    newItems.splice(newIndex, 0, moved);
                    items = newItems;
                    
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
    {#each items as item, i (item)}
        <div class={itemClass}>
            {@render children(item, i)}
        </div>
    {/each}
</div>

<style>
    :global(.sortable-ghost) {
        opacity: 0.3 !important;
    }
    :global(.sortable-fallback) {
        opacity: 0.8 !important;
        transform: scale(1.05) !important;
        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.2) !important;
        cursor: grabbing !important;
    }
</style>
