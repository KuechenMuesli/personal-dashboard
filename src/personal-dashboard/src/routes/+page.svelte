<script lang="ts">
  import { onMount } from "svelte";
  import type { StoredWidget } from '../types/stored-widget';
  import {Check, GripHorizontal, Pencil, Plus, Settings, X} from "lucide-svelte";

  export const widgets = {
    searchbar:        { name: "Searchbar", load: () => import("$lib/widgets/Searchbar.svelte"), defaultSize: { width: 2, height: 2 } },
    favorites:        { name: "Favorites", load: () => import("$lib/widgets/Favorites.svelte"), defaultSize: { width: 2, height: 4 } },
    note:             { name: "Sticky Note", load: () => import("$lib/widgets/Note.svelte"), defaultSize: { width: 1, height: 3 }},
    parcel:           { name: "Parcel Tracker", load: () => import("$lib/widgets/Parcel.svelte"), defaultSize: { width: 1, height: 5 } },
    trmnl:            { name: "TRMNL Current Screen", load: () => import("$lib/widgets/Trmnl.svelte"), defaultSize: { width: 2, height: 5 } },
    clockWeatherDate: { name: "Clock & Weather", load: () => import("$lib/widgets/ClockWeatherDate.svelte"), defaultSize: { width: 2, height: 1 } },
    embed:            { name: "Web Embed", load: () => import("$lib/widgets/Embed.svelte"), defaultSize: { width: 3, height: 5 } },
    TimerStopwatch:   { name: "Timer / Stopwatch", load: () => import("$lib/widgets/TimerStopwatch.svelte"), defaultSize: { width: 1, height: 3 } },
    sketch:           { name: "Whiteboard", load: () => import("$lib/widgets/Sketch.svelte"), defaultSize: { width: 3, height: 5 } },
		newtorkMetrics:   { name: "Network Metrics", load: () => import("$lib/widgets/NetworkMetrics.svelte"), defaultSize: { width: 1, height: 3 } ,},
		calendar:					{ name: "Calendar", load: () => import("$lib/widgets/Calendar.svelte"), defaultSize: { width: 2, height: 4 } },
    zen:          		{ name: "Zen", load: () => import("$lib/widgets/Zen.svelte"), defaultSize: { width: 1, height: 4 } },
  }

  const STORAGE_KEY = "dashboard-layout";

  let dashboardLayout = $state<(StoredWidget & { showSettings?: boolean })[]>([]);
  let draggingId = $state<string | null>(null);
  let resizingId = $state<string | null>(null);
  let isEditing = $state(false);
  let pickerDialog: HTMLDialogElement;
  let widgetStates = $state<Record<string, { hidden: boolean }>>({});

  let containerWidth = $state(0);
  let columns = $derived(containerWidth < 640 ? 2 : 9);
  let colPixelWidth = $derived(containerWidth / columns);
  const ROW_HEIGHT = 50;
  const PREVIEW_UNIT_W = 16;
  const PREVIEW_UNIT_H = 4;

  let grabOffset = { x: 0, y: 0 };
  let initialPos = { x: 0, y: 0, w: 0, h: 0 };
  let lastProcessedTime = 0;


  let activeLayout = $derived.by(() => {
    if (columns >= 9) return dashboardLayout;

    let packedLayout: (typeof dashboardLayout[0])[] = [];

    const sorted = [...dashboardLayout].sort((a, b) => a.y - b.y || a.x - b.x);

    for (const w of sorted) {
      const mobileWidget = { ...w, width: Math.min(w.width, columns) };

      let y = 0;
      let placed = false;

      while (!placed) {
        for (let x = 0; x <= columns - mobileWidget.width; x++) {
          const potential = { ...mobileWidget, x, y };
          const hasCollision = packedLayout.some(existing => isOverlapping(potential, existing));

          if (!hasCollision) {
            mobileWidget.x = x;
            mobileWidget.y = y;
            packedLayout.push(mobileWidget);
            placed = true;
            break;
          }
        }
        if (!placed) y++;
      }
    }

    return packedLayout;
  });

  $effect(() => {
    if (containerWidth > 0 && containerWidth < 640 && isEditing) {
      isEditing = false;
      if (pickerDialog?.open) pickerDialog.close();
    }
  });

  onMount(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dashboardLayout = parsed.map((w: any) => ({ ...w, showSettings: false }));
      } catch (e) { console.error(e); }
    } else {
      const welcomeId = crypto.randomUUID();
      const hintId = crypto.randomUUID();

      localStorage.setItem(`note-settings-${welcomeId}`,
        "# Welcome to your Dashboard! \n\n" +
        "You can customize this space exactly how *you* like it. \n\n" +
        "- **Add Widgets**: Use the '+' button.\n" +
        "- **Rearrange**: Click the 'Edit' (✎) button to drag and resize.\n" +
        "- **Markdown**: This note supports **bold**, *italics*, lists and more! \n\n" +
				"Connect with me on [LinkedIn](https://www.linkedin.com/in/paul-simon-470477272) or [GitHub](https://github.com/KuechenMuesli) " +
				"or [contribute to this project yourself!](https://github.com/KuechenMuesli/personal-dashboard)"
      );
      localStorage.setItem(`note-mode-${welcomeId}`, "true");

      localStorage.setItem(`note-settings-${hintId}`,
        "## Start Here! \n\n" +
        "Click the **pencil icon** in the bottom right corner to enter **edit** mode and **add** widgets."
      );
      localStorage.setItem(`note-mode-${hintId}`, "true");

      dashboardLayout = [
        {
          id: welcomeId,
          type: 'note',
          x: 0,
          y: 0,
          width: 3,
          height: 6,
          showSettings: false
        },
        {
          id: hintId,
          type: 'note',
          x: columns - 2,
          y: Math.floor(window.innerHeight / ROW_HEIGHT) - 5,
          width: 2,
          height: 4,
          showSettings: false
        }
      ];

      save();
    }
  });

  function save() {
    const toSave = dashboardLayout.map(({ showSettings, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }

  function isOverlapping(w1: any, w2: any) {
    return (w1.x < w2.x + w2.width && w1.x + w1.width > w2.x && w1.y < w2.y + w2.height && w1.y + w1.height > w2.y);
  }

  function findFirstAvailableSpace(width: number, height: number): { x: number, y: number } {
    let y = 0;
    while (true) {
      for (let x = 0; x <= columns - width; x++) {
        const potential = { x, y, width, height };
        const hasCollision = dashboardLayout.some(existing => isOverlapping(potential, existing));
        if (!hasCollision) return { x, y };
      }
      y++;
      if (y > 1000) return { x: 0, y: 0 };
    }
  }

  function addWidget(type: string) {
    const config = widgets[type as keyof typeof widgets];
    const { width, height } = config.defaultSize;
    const { x, y } = findFirstAvailableSpace(width, height);

    const newWidget = {
      id: crypto.randomUUID() as any,
      type, x, y, width, height,
      showSettings: false
    };

    dashboardLayout.push(newWidget);
    save();
    if (pickerDialog?.open) pickerDialog.close();
  }

  function deleteWidget(id: string) {
    dashboardLayout = dashboardLayout.filter(w => w.id !== id);

    if (widgetStates[id]) delete widgetStates[id];

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(id)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    save();
  }

  function startInteraction(e: MouseEvent | TouchEvent, id: string, mode: 'drag' | 'resize') {
    if (e.cancelable) e.preventDefault();
    if (containerWidth < 640) return;

    const widget = dashboardLayout.find(w => w.id === id);
    if (!widget) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    initialPos = { x: widget.x, y: widget.y, w: widget.width, h: widget.height };

    if (mode === 'drag') {
      const rect = (e.target as HTMLElement).closest('.widget-wrapper')?.getBoundingClientRect();
      if (!rect) return;
      draggingId = id;
      grabOffset.x = clientX - rect.left;
      grabOffset.y = clientY - rect.top;
    } else {
      resizingId = id;
      grabOffset.x = clientX;
      grabOffset.y = clientY;
    }

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopInteraction);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', stopInteraction);
  }

  function handleInternalDrag(e: MouseEvent | TouchEvent, id: string) {
    startInteraction(e, id, 'drag');
  }

  function handleInternalResize(e: MouseEvent | TouchEvent, id: string) {
    startInteraction(e, id, 'resize');
  }

  function handleMove(e: MouseEvent | TouchEvent) {
    const container = document.getElementById('grid-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const index = dashboardLayout.findIndex(w => w.id === (draggingId || resizingId));
    if (index === -1) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (draggingId) {
      let targetX = (clientX - rect.left - grabOffset.x) / colPixelWidth;
      let targetY = (clientY - rect.top - grabOffset.y) / ROW_HEIGHT;
      dashboardLayout[index].x = Math.max(0, Math.min(targetX, columns - dashboardLayout[index].width));
      dashboardLayout[index].y = Math.max(0, targetY);
    } else if (resizingId) {
      const deltaX = (clientX - grabOffset.x) / colPixelWidth;
      const deltaY = (clientY - grabOffset.y) / ROW_HEIGHT;
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
        dashboardLayout[index].x = initialPos.x;
        dashboardLayout[index].y = initialPos.y;
        dashboardLayout[index].width = initialPos.w;
        dashboardLayout[index].height = initialPos.h;
      } else {
        dashboardLayout[index].x = snapped.x;
        dashboardLayout[index].y = snapped.y;
        dashboardLayout[index].width = snapped.width;
        dashboardLayout[index].height = snapped.height;
        save();
      }
    }
    draggingId = null;
    resizingId = null;
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', stopInteraction);
    window.removeEventListener('touchmove', handleMove);
    window.removeEventListener('touchend', stopInteraction);
  }

  function debounceAction(fn: () => void) {
    const now = Date.now();
    if (now - lastProcessedTime < 300) return;
    lastProcessedTime = now;
    fn();
  }

  function toggleSettings(id: string) {
    const index = dashboardLayout.findIndex(w => w.id === id);
    if (index !== -1) {
      dashboardLayout[index].showSettings = !dashboardLayout[index].showSettings;
    }
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

	{#each activeLayout as sw (sw.id)}
		{@const widgetDef = widgets[sw.type as keyof typeof widgets]}
		{@const isHidden = widgetStates[sw.id]?.hidden && !isEditing}

		<div
				class="widget-wrapper absolute p-2 box-border will-change-[transform,width,height]
             {draggingId === sw.id || resizingId === sw.id ? 'z-[100] transition-none' : 'z-10 transition-[transform,width,height] duration-200'}
             {isHidden ? 'pointer-events-none' : ''}"
				style="
        width: {(sw.width / columns) * 100}%;
        height: {sw.height * ROW_HEIGHT}px;
        transform: translate3d({(sw.x / columns) * containerWidth}px, {sw.y * ROW_HEIGHT}px, 0);
        display: {isHidden ? 'none' : 'block'};
      "
		>
			<div class="relative flex h-full flex-col overflow-hidden rounded-lg {isEditing ? 'border border-dashed border-blue-500/40 bg-neutral-900/50' : ''}">

				{#if isEditing}
					<div class="absolute top-0 left-0 right-0 z-50 flex items-center gap-1 border-b border-white/5 bg-neutral-950/80 backdrop-blur-md px-2 py-1">
						<button
								class="pointer-events-auto flex h-6 w-6 items-center justify-center rounded text-lg leading-none text-neutral-400 hover:bg-neutral-800 hover:text-white"
								onclick={() => debounceAction(() => toggleSettings(sw.id))}
						>
							<Settings size={16} strokeWidth={1} />
						</button>
						<GripHorizontal
								size={16}
								strokeWidth={1}
								onmousedown={(e) => startInteraction(e, sw.id, 'drag')}
								ontouchstart={(e) => startInteraction(e, sw.id, 'drag')}
								class="flex-grow cursor-grab touch-none text-center text-xs font-bold text-neutral-500 select-none active:cursor-grabbing pointer-events-auto"
						/>
						<button
								class="pointer-events-auto flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-red-900/40 hover:text-red-400"
								onclick={() => debounceAction(() => deleteWidget(sw.id))}
						>
							<X size={16} />
						</button>
					</div>

					<div
							class="absolute bottom-0 right-0 z-50 h-5 w-5 cursor-nwse-resize touch-none rounded-br-lg bg-gradient-to-br from-transparent from-50% to-blue-500/40 to-50%"
							onmousedown={(e) => startInteraction(e, sw.id, 'resize')}
							ontouchstart={(e) => startInteraction(e, sw.id, 'resize')}
							role="presentation"
					></div>
				{/if}

				<div class="h-full w-full overflow-hidden">
					{#await widgetDef.load() then module}
						{@const Widget = module.default}
						<Widget
								id={sw.id}
								isEditing={isEditing}
								width={sw.width}
								height={sw.height}
								onDragStart={(e) => handleInternalDrag(e, sw.id)}
								onResizeStart={(e) => handleInternalResize(e, sw.id)}
								onAddNote={() => addWidget('note')}
								onDelete={() => debounceAction(() => deleteWidget(sw.id))}
								bind:showSettings={sw.showSettings}
								bind:hidden={() => widgetStates[sw.id]?.hidden ?? false, (v) => {
             if(!widgetStates[sw.id]) widgetStates[sw.id] = { hidden: false };
             widgetStates[sw.id].hidden = v;
           }}
						/>
					{:catch error}
						<div class="flex h-full w-full flex-col items-center justify-center gap-2 text-red-500 text-sm p-4 text-center bg-red-900/10">
							<span class="font-bold">Fehler</span>
							<span class="text-xs text-red-400">Widget konnte nicht geladen werden.</span>
						</div>
					{/await}
				</div>
			</div>
		</div>
	{/each}
</div>

{#if containerWidth >= 640}
	<div class="fixed bottom-8 right-8 z-[1000] flex flex-col gap-4">
		{#if isEditing}
			<button
					class="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-2xl transition-transform hover:scale-105"
					onclick={() => debounceAction(() => pickerDialog.showModal())}
			><Plus size={20} /></button>
		{/if}
		<button
				class="flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-2xl transition-all hover:scale-105
             {isEditing ? 'bg-emerald-600' : 'bg-neutral-700'}"
				onclick={() => debounceAction(() => isEditing = !isEditing)}
		>
			{#if isEditing}
				<Check size={20} />
			{:else}
				<Pencil size={20} />
			{/if}
		</button>
	</div>
{/if}

<dialog
		bind:this={pickerDialog}
		class="fixed left-1/2 top-1/2 m-0 w-[90vw] max-w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-800 bg-neutral-900 p-0 text-white shadow-2xl outline-none backdrop:bg-black/80 backdrop:backdrop-blur-sm"
>
	<div class="flex flex-col gap-4 p-6">
		<header class="flex items-center justify-between">
			<h3 class="text-xl font-semibold">Add Widget</h3>
			<button
					class="text-3xl text-neutral-500 hover:text-white px-2"
					onclick={() => debounceAction(() => pickerDialog.close())}
			>
				&times;
			</button>
		</header>

		<div class="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-4">
			{#each Object.entries(widgets) as [type, config]}
				<button
						class="flex h-[140px] flex-col items-center justify-between rounded-xl border border-neutral-800 bg-neutral-800/50 p-4 transition-all active:border-blue-500 active:bg-neutral-800 hover:border-blue-500"
						onclick={() => debounceAction(() => addWidget(type))}
				>
					<div class="pointer-events-none flex flex-1 items-center justify-center w-full">
						<div
								class="rounded-md border-2 border-blue-500/50 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.1)]"
								style="width: {config.defaultSize.width * PREVIEW_UNIT_W}px; height: {config.defaultSize.height * PREVIEW_UNIT_H}px;"
						></div>
					</div>
					<span class="pointer-events-none mt-3 text-sm font-medium text-center text-neutral-300">{config.name}</span>
				</button>
			{/each}
		</div>
	</div>
</dialog>
