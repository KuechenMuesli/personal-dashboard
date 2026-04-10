<script lang="ts">
  import { onMount } from "svelte";
  import type { StoredWidget } from '../types/stored-widget';
  import { widgets } from "$lib/widgets.js";

  const STORAGE_KEY = "dashboard-layout";

  let dashboardLayout = $state<(StoredWidget & { showSettings?: boolean })[]>([]);
  let draggingId = $state<string | null>(null);
  let resizingId = $state<string | null>(null);
  let isEditing = $state(false);
  let pickerDialog: HTMLDialogElement;

  let containerWidth = $state(0);
  let columns = $derived(containerWidth < 640 ? 2 : 9);
  let colPixelWidth = $derived(containerWidth / columns);
  const ROW_HEIGHT = 50;

  let grabOffset = { x: 0, y: 0 };
  let initialPos = { x: 0, y: 0, w: 0, h: 0 };

  onMount(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dashboardLayout = parsed.map((w: any) => ({ ...w, showSettings: false }));
      } catch (e) { console.error("Failed to parse layout", e); }
    }
  });

  function save() {
    const toSave = dashboardLayout.map(({ showSettings, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }

  function isOverlapping(w1: StoredWidget, w2: StoredWidget) {
    return (w1.x < w2.x + w2.width && w1.x + w1.width > w2.x && w1.y < w2.y + w2.height && w1.y + w1.height > w2.y);
  }

  function addWidget(type: string) {
    const config = widgets[type];
    const maxY = dashboardLayout.reduce((max, w) => Math.max(max, w.y + w.height), 0);
    const newWidget = {
      id: crypto.randomUUID() as any,
      type, x: 0, y: maxY,
      width: config.defaultSize.width,
      height: config.defaultSize.height,
      showSettings: false
    };
    dashboardLayout.push(newWidget);
    save();
    pickerDialog.close();
  }

  function deleteWidget(id: string) {
    dashboardLayout = dashboardLayout.filter(w => w.id !== id);
    save();
  }

  function startInteraction(e: MouseEvent, id: string, mode: 'drag' | 'resize') {
    if (!isEditing) return;
    e.preventDefault();
    const widget = dashboardLayout.find(w => w.id === id);
    if (!widget) return;

    initialPos = { x: widget.x, y: widget.y, w: widget.width, h: widget.height };

    if (mode === 'drag') {
      const rect = (e.currentTarget as HTMLElement).closest('.widget-wrapper')?.getBoundingClientRect();
      if (!rect) return;
      draggingId = id;
      grabOffset.x = e.clientX - rect.left;
      grabOffset.y = e.clientY - rect.top;
    } else {
      resizingId = id;
      grabOffset.x = e.clientX;
      grabOffset.y = e.clientY;
    }

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopInteraction);
  }

  function handleMove(e: MouseEvent) {
    const container = document.getElementById('grid-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const index = dashboardLayout.findIndex(w => w.id === (draggingId || resizingId));
    if (index === -1) return;

    if (draggingId) {
      let targetX = (e.clientX - rect.left - grabOffset.x) / colPixelWidth;
      let targetY = (e.clientY - rect.top - grabOffset.y) / ROW_HEIGHT;
      dashboardLayout[index].x = Math.max(0, Math.min(targetX, columns - dashboardLayout[index].width));
      dashboardLayout[index].y = Math.max(0, targetY);
    } else if (resizingId) {
      const deltaX = (e.clientX - grabOffset.x) / colPixelWidth;
      const deltaY = (e.clientY - grabOffset.y) / ROW_HEIGHT;
      dashboardLayout[index].width = Math.max(1, Math.min(initialPos.w + deltaX, columns - dashboardLayout[index].x));
      dashboardLayout[index].height = Math.max(1, initialPos.h + deltaY);
    }
  }

  function stopInteraction() {
    const id = draggingId || resizingId;
    if (id) {
      const index = dashboardLayout.findIndex(w => w.id === id);
      const widget = dashboardLayout[index];
      const snapped = {
        ...widget,
        x: Math.round(widget.x),
        y: Math.round(widget.y),
        width: Math.round(widget.width),
        height: Math.round(widget.height)
      };
      const hasCollision = dashboardLayout.some(w => w.id !== id && isOverlapping(snapped, w));

      if (hasCollision) {
        Object.assign(dashboardLayout[index], initialPos);
      } else {
        Object.assign(dashboardLayout[index], { x: snapped.x, y: snapped.y, width: snapped.width, height: snapped.height });
        save();
      }
    }
    draggingId = null;
    resizingId = null;
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', stopInteraction);
  }
</script>

<div
		id="grid-container"
		class="relative h-screen w-screen overflow-x-hidden overflow-y-auto bg-neutral-900 font-sans text-slate-200"
		bind:clientWidth={containerWidth}
>
	{#if isEditing}
		<div
				class="pointer-events-none absolute inset-0 grid h-full w-full"
				style="grid-template-columns: repeat({columns}, 1fr);"
		>
			{#each Array(columns) as _}
				<div class="h-full border-r border-white/5"></div>
			{/each}
		</div>
	{/if}

	{#each dashboardLayout as sw (sw.id)}
		{@const Widget = widgets[sw.type].component}
		<div
				class="widget-wrapper absolute p-2 box-border will-change-[transform,width,height]
             {draggingId === sw.id || resizingId === sw.id ? 'z-[100] transition-none' : 'z-10 transition-[transform,width,height] duration-200'}"
				style="
        width: {(sw.width / columns) * 100}%;
        height: {sw.height * ROW_HEIGHT}px;
        transform: translate3d({(sw.x / columns) * containerWidth}px, {sw.y * ROW_HEIGHT}px, 0);
      "
		>
			<div class="relative flex h-full flex-col overflow-hidden rounded-lg {isEditing ? 'border border-dashed border-blue-500 bg-neutral-900/50' : ''}">

				{#if isEditing}
					<div class="z-30 flex items-center gap-1 border-b border-neutral-800 bg-neutral-900 px-2 py-0.5">
						<button
								class="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-white"
								onclick={() => sw.showSettings = true}
						>⚙</button>
						<div
								class="flex-grow cursor-grab text-center text-sm font-bold text-neutral-600 select-none active:cursor-grabbing pointer-events-auto"
								onmousedown={(e) => startInteraction(e, sw.id, 'drag')}
								role="presentation"
						>⠿</div>
						<button
								class="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-red-900/50 hover:text-red-400"
								onclick={() => deleteWidget(sw.id)}
						>×</button>
					</div>

					<div
							class="absolute bottom-0 right-0 z-30 h-4 w-4 cursor-nwse-resize rounded-br-lg bg-gradient-to-br from-transparent from-50% to-neutral-600 to-50%"
							onmousedown={(e) => startInteraction(e, sw.id, 'resize')}
							role="presentation"
					></div>
				{/if}

				<div class="flex-1 overflow-hidden">
					<Widget
							id={sw.id}
							isEditing={isEditing}
							bind:showSettings={sw.showSettings}
					/>
				</div>
			</div>
		</div>
	{/each}
</div>

<div class="fixed bottom-8 right-8 z-[1000] flex flex-col gap-4">
	{#if isEditing}
		<button
				class="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-2xl transition-transform hover:scale-105"
				onclick={() => pickerDialog.showModal()}
		>+</button>
	{/if}
	<button
			class="flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-2xl transition-all hover:scale-105
           {isEditing ? 'bg-emerald-600' : 'bg-neutral-700'}"
			onclick={() => isEditing = !isEditing}
	>
		{isEditing ? '✓' : '✎'}
	</button>
</div>

<dialog
		bind:this={pickerDialog}
		class="fixed left-1/2 top-1/2 m-0 w-[90vw] max-w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-800 bg-neutral-900 p-0 text-white shadow-2xl outline-none backdrop:bg-black/80 backdrop:backdrop-blur-sm"
>
	<div class="flex flex-col gap-4 p-6">
		<header class="flex items-center justify-between">
			<h3 class="text-xl font-semibold">Add Widget</h3>
			<button class="text-2xl text-neutral-500 hover:text-white" onclick={() => pickerDialog.close()}>&times;</button>
		</header>

		<div class="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-4">
			{#each Object.entries(widgets) as [type, config]}
				<button
						class="flex h-[140px] flex-col items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-800/50 p-4 transition-all hover:border-blue-500 hover:bg-neutral-800"
						onclick={() => addWidget(type)}
				>
					<div class="flex h-10 w-16 items-center justify-center rounded bg-neutral-700">
						<div class="rounded-sm bg-neutral-500" style="width: {config.defaultSize.width * 10}px; height: {config.defaultSize.height * 10}px;"></div>
					</div>
					<span class="text-sm font-medium capitalize">{type}</span>
				</button>
			{/each}
		</div>
	</div>
</dialog>

<style>
  :global(body, html) {
    margin: 0; padding: 0; height: 100%;
    overflow: hidden;
  }
</style>
