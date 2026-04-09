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
        dashboardLayout = parsed.map((w: any) => ({
          ...w,
          showSettings: false
        }));
      } catch (e) {
        console.error("Failed to parse layout", e);
      }
    }
  });

  function save() {
    const toSave = dashboardLayout.map(({ showSettings, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }

  function isOverlapping(w1: StoredWidget, w2: StoredWidget) {
    return (
      w1.x < w2.x + w2.width &&
      w1.x + w1.width > w2.x &&
      w1.y < w2.y + w2.height &&
      w1.y + w1.height > w2.y
    );
  }

  function addWidget(type: string) {
    const config = widgets[type];
    const maxY = dashboardLayout.reduce((max, w) => Math.max(max, w.y + w.height), 0);
    const newWidget = {
      id: crypto.randomUUID() as any,
      type,
      x: 0,
      y: maxY,
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
    }
    else if (resizingId) {
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
      const snapped = { ...widget, x: Math.round(widget.x), y: Math.round(widget.y), width: Math.round(widget.width), height: Math.round(widget.height) };
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

<div id="grid-container" class="grid-container" bind:clientWidth={containerWidth} style="--cols: {columns};">
	{#if isEditing}
		<div class="grid-overlay">
			{#each Array(columns) as _}
				<div class="grid-line"></div>
			{/each}
		</div>
	{/if}

	{#each dashboardLayout as sw (sw.id)}
		{@const Widget = widgets[sw.type].component}

		<div
				class="widget-wrapper"
				class:dragging={draggingId === sw.id || resizingId === sw.id}
				class:editable={isEditing}
				style="
      width: {(sw.width / columns) * 100}%;
      height: {sw.height * ROW_HEIGHT}px;
      transform: translate3d({(sw.x / columns) * containerWidth}px, {sw.y * ROW_HEIGHT}px, 0);
    "
		>
			<div class="widget-content">
				{#if isEditing}
					<div class="widget-header">
						<button class="settings-btn" onclick={() => sw.showSettings = true}>⚙</button>
						<div class="drag-handle" onmousedown={(e) => startInteraction(e, sw.id, 'drag')} role="presentation">⠿</div>
						<button class="delete-btn" onclick={() => deleteWidget(sw.id)}>×</button>
					</div>
					<div class="resize-handle" onmousedown={(e) => startInteraction(e, sw.id, 'resize')} role="presentation"></div>
				{/if}

				<div class="inner-content">
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

<div class="fab-container">
	{#if isEditing}
		<button class="fab add-btn" onclick={() => pickerDialog.showModal()}>+</button>
	{/if}
	<button class="fab edit-btn" class:active={isEditing} onclick={() => isEditing = !isEditing}>
		{isEditing ? '✓' : '✎'}
	</button>
</div>

<dialog bind:this={pickerDialog} class="widget-picker">
	<div class="picker-content">
		<header class="picker-header">
			<h3>Add Widget</h3>
			<button class="close-x" onclick={() => pickerDialog.close()} aria-label="Close">
				&times;
			</button>
		</header>
		<div class="selection-grid">
			{#each Object.entries(widgets) as [type, config]}
				<button class="option-card" onclick={() => addWidget(type)}>
					<div class="preview-box">
						<div class="mini-rect" style="width: {config.defaultSize.width * 10}px; height: {config.defaultSize.height * 10}px;"></div>
					</div>
					<span class="type-label">{type}</span>
				</button>
			{/each}
		</div>
	</div>
</dialog>

<style>
  :global(body, html) {
    margin: 0; padding: 0; height: 100%;
    background: rgb(29, 30, 28);
    font-family: sans-serif; overflow: hidden;
    color: #e2e8f0;
  }

  .grid-container { position: relative; width: 100vw; height: 100vh; overflow-y: auto; overflow-x: hidden; }

  .grid-overlay { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(var(--cols), 1fr); pointer-events: none; }
  .grid-line { border-right: 1px solid rgba(255, 255, 255, 0.05); height: 100%; }

  .widget-wrapper {
    position: absolute; padding: 8px; box-sizing: border-box; z-index: 10;
    will-change: transform, width, height; transition: transform 0.2s, width 0.2s, height 0.2s;
  }
  .widget-wrapper.dragging { z-index: 100; transition: none; }
  .widget-wrapper.editable .widget-content { border: 1px dashed #3b82f6; }

  .widget-content {
    height: 100%;
    display: flex; flex-direction: column; position: relative;
    overflow: hidden;
  }

  .widget-header {
    display: flex; align-items: center; background: #1a1a1a; padding: 2px 8px;
    border-bottom: 1px solid #333; gap: 4px;
  }

  .drag-handle { cursor: grab; color: #525252; flex-grow: 1; text-align: center; user-select: none; font-size: 14px; }

  .settings-btn, .delete-btn {
    background: none; border: none; color: #737373; font-size: 16px; cursor: pointer;
    width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px;
    transition: all 0.2s;
  }

  .settings-btn:hover { background: #333; color: #e5e5e5; }
  .delete-btn:hover { background: #450a0a; color: #f87171; }

  .inner-content { flex: 1; overflow: hidden; }

  .resize-handle {
    position: absolute; bottom: 0; right: 0; width: 16px; height: 16px; cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 50%, #404040 50%);
    border-radius: 0 0 12px 0;
  }

  .fab-container { position: fixed; bottom: 2rem; right: 2rem; display: flex; flex-direction: column; gap: 1rem; z-index: 1000; }
  .fab { width: 56px; height: 56px; border-radius: 28px; border: none; color: white; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); transition: transform 0.2s; }
  .fab:hover { transform: scale(1.05); }

  .edit-btn { background: #3f3f46; }
  .edit-btn.active { background: #059669; }
  .add-btn { background: #2563eb; }

  .widget-picker {
    border: 1px solid #3f3f3f;
    border-radius: 16px; padding: 0; width: 90vw; max-width: 450px;
    background: #1a1a1a; color: white;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0;
  }
  .widget-picker::backdrop { background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(4px); }

  .picker-content { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

  .picker-header { display: flex; justify-content: space-between; align-items: center; }
  .picker-header h3 { margin: 0; font-size: 1.25rem; font-weight: 600; }

  .close-x {
    background: #2d2d2d; border: none; font-size: 1.5rem; cursor: pointer; color: #737373;
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    border-radius: 8px; transition: all 0.2s;
  }
  .close-x:hover { color: white; background: #404040; }

  .selection-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 1rem; }

  .option-card {
    background: #262626; border: 1px solid #3f3f3f; border-radius: 12px; padding: 1rem;
    cursor: pointer; color: #d4d4d8; transition: all 0.2s;
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    height: 140px; width: 100%;
  }
  .option-card:hover { border-color: #3b82f6; background: #2d2d2d; color: white; transform: translateY(-2px); }

  .preview-box {
    background: #404040; width: 60px; height: 40px; border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
  }
  .mini-rect { background: #525252; border-radius: 2px; }

  .type-label { font-size: 0.9rem; font-weight: 500; text-transform: capitalize; }
</style>
