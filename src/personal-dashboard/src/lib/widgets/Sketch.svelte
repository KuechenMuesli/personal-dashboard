<script lang="ts">
  import { onMount, tick } from "svelte";
  import {Copy, Eraser, Maximize2, MousePointer2, Pencil, Plus, Redo, Type, Undo, X} from "lucide-svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";

  let { id, width, height, isEditing } = $props();

  let canvas = $state<HTMLCanvasElement>();
  let dialogCanvas = $state<HTMLCanvasElement>();
  let sketchDialog = $state<HTMLDialogElement>();

  let mode = $state<'draw' | 'select' | 'erase' | 'text'>('draw');
  let toolSize = $state(4);
  let isDrawing = false;
  let isFullscreen = $state(false);
  let color = $state("#3b82f6");
  let lastDataURL = $state<string | null>(null);

  let history = $state<string[]>([]);
  let historyIndex = $state(-1);

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#ffffff", "#000000"];

  let selection = $state<{
    x: number, y: number, w: number, h: number,
    active: boolean, dragging: boolean, resizing: boolean,
    buffer: HTMLCanvasElement | null
  } | null>(null);

  let textInput = $state<{ x: number, y: number, active: boolean } | null>(null);
  let textInputRef = $state<HTMLDivElement>();

  let startX = 0;
  let startY = 0;

  let isCompact = $derived(width < 3 || height < 3);
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  $effect(() => {
    if (textInput?.active && textInputRef) {
      setTimeout(() => textInputRef?.focus(), 10);
    }
  });

  function initCanvas(c: HTMLCanvasElement) {
    if (!c) return;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (lastDataURL) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = lastDataURL;
    }
  }

  function saveState(c: HTMLCanvasElement) {
    if (!c) return;
    const data = c.toDataURL();
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    history.push(data);
    if (history.length > 40) history.shift();
    else historyIndex++;
    lastDataURL = data;
  }

  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      applyHistoryState();
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      applyHistoryState();
    }
  }

  function applyHistoryState() {
    const activeCanvas = isFullscreen ? dialogCanvas : canvas;
    if (!activeCanvas) return;
    const ctx = activeCanvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, activeCanvas.width / dpr, activeCanvas.height / dpr);
      ctx.drawImage(img, 0, 0, activeCanvas.width / dpr, activeCanvas.height / dpr);
      lastDataURL = history[historyIndex];
    };
    img.src = history[historyIndex];
  }

  async function openExpanded() {
    if (canvas) saveState(canvas);
    isFullscreen = true;
    sketchDialog?.showModal();
    await tick();
    if (dialogCanvas) initCanvas(dialogCanvas);
  }

  function closeExpanded() {
    if (dialogCanvas) saveState(dialogCanvas);
    isFullscreen = false;
    sketchDialog?.close();
    setTimeout(() => {
      if (canvas) initCanvas(canvas);
    }, 50);
  }

  function finalizeTextInput() {
    if (!textInput?.active || !textInputRef) return;

    const text = textInputRef.innerText || '';
    if (!text.trim()) {
      textInput = null;
      return;
    }

    const activeCanvas = isFullscreen ? dialogCanvas : canvas;
    if (!activeCanvas) return;

    const fontSize = toolSize * 5;
    const lines = text.split('\n');
    const dpr = window.devicePixelRatio || 1;

    const tempCtx = activeCanvas.getContext('2d')!;
    tempCtx.font = `${fontSize}px sans-serif`;

    let maxWidth = 0;
    const lineHeight = fontSize * 1.2;
    for (const line of lines) {
      maxWidth = Math.max(maxWidth, tempCtx.measureText(line).width);
    }

    const w = maxWidth + 4;
    const h = lines.length * lineHeight + 4;

    const temp = document.createElement('canvas');
    temp.width = w * dpr;
    temp.height = h * dpr;
    const tCtx = temp.getContext('2d')!;
    tCtx.scale(dpr, dpr);
    tCtx.font = `${fontSize}px sans-serif`;
    tCtx.fillStyle = color;
    tCtx.textBaseline = 'top';

    lines.forEach((line, i) => {
      tCtx.fillText(line, 2, i * lineHeight + 2);
    });

    mode = 'select';
    selection = {
      x: textInput.x,
      y: textInput.y,
      w, h,
      active: true,
      dragging: false,
      resizing: false,
      buffer: temp
    };

    textInput = null;
  }

  function handleInteractionStart(e: MouseEvent | TouchEvent, targetCanvas: HTMLCanvasElement) {
    if (isEditing || !targetCanvas) return;

    const rect = targetCanvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY) - rect.top;

    if (mode === 'text') {
      if (textInput?.active) {
        finalizeTextInput();
        return;
      }
      textInput = { x, y, active: true };
      return;
    }

    if (mode === 'select') {
      const handleSize = 20;
      const isOnResizeHandle = selection?.active &&
        x > (selection.x + selection.w - handleSize) && x < (selection.x + selection.w + handleSize) &&
        y > (selection.y + selection.h - handleSize) && y < (selection.y + selection.h + handleSize);

      const isInside = selection?.active &&
        x > selection.x && x < selection.x + selection.w &&
        y > selection.y && y < selection.y + selection.h;

      if (isOnResizeHandle) {
        selection!.resizing = true;
        startX = x;
        startY = y;
      } else if (isInside) {
        selection!.dragging = true;
        startX = x - selection!.x;
        startY = y - selection!.y;

        if (!selection!.buffer) {
          const dpr = window.devicePixelRatio || 1;
          const temp = document.createElement('canvas');
          temp.width = selection!.w * dpr;
          temp.height = selection!.h * dpr;
          const tCtx = temp.getContext('2d')!;
          tCtx.drawImage(targetCanvas, selection!.x * dpr, selection!.y * dpr, selection!.w * dpr, selection!.h * dpr, 0, 0, selection!.w * dpr, selection!.h * dpr);
          selection!.buffer = temp;

          const ctx = targetCanvas.getContext("2d")!;
          ctx.clearRect(selection!.x, selection!.y, selection!.w, selection!.h);
        }
      } else {
        if (selection?.buffer) finalizeMove(targetCanvas);
        selection = { x, y, w: 0, h: 0, active: true, dragging: true, resizing: false, buffer: null };
        startX = x;
        startY = y;
      }
    } else {
      isDrawing = true;
      const ctx = targetCanvas.getContext("2d")!;
      ctx.lineWidth = toolSize;
      if (mode === 'erase') {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
      }
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }

  function handleInteractionMove(e: MouseEvent | TouchEvent, targetCanvas: HTMLCanvasElement) {
    if (isEditing || !targetCanvas) return;

    if (e instanceof MouseEvent && e.buttons !== 1) {
      if (isDrawing || selection?.dragging || selection?.resizing) {
        handleInteractionEnd(targetCanvas);
      }
      return;
    }

    const rect = targetCanvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY) - rect.top;

    if (mode === 'select' && selection?.active) {
      if (selection.resizing) {
        selection.w = Math.max(10, x - selection.x);
        selection.h = Math.max(10, y - selection.y);
      } else if (selection.dragging) {
        if (!selection.buffer) {
          selection.w = x - startX;
          selection.h = y - startY;
        } else {
          selection.x = x - startX;
          selection.y = y - startY;
        }
      }
    } else if (isDrawing) {
      const ctx = targetCanvas.getContext("2d")!;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  function handleInteractionEnd(targetCanvas: HTMLCanvasElement) {
    if (!targetCanvas) return;
    if (isDrawing) {
      isDrawing = false;
      const ctx = targetCanvas.getContext("2d")!;
      ctx.globalCompositeOperation = "source-over";
      saveState(targetCanvas);
    }
    if (selection?.active) {
      selection.dragging = false;
      selection.resizing = false;
      if (!selection.buffer) {
        if (selection.w < 0) { selection.x += selection.w; selection.w = Math.abs(selection.w); }
        if (selection.h < 0) { selection.y += selection.h; selection.h = Math.abs(selection.h); }
        if (Math.abs(selection.w) < 5 && Math.abs(selection.h) < 5) selection = null;
      }
    }
  }

  function finalizeMove(targetCanvas: HTMLCanvasElement) {
    if (selection?.buffer) {
      const ctx = targetCanvas.getContext("2d")!;
      ctx.drawImage(selection.buffer, selection.x, selection.y, selection.w, selection.h);
      selection.buffer = null;
      saveState(targetCanvas);
    }
  }

  async function handleCopy(e?: ClipboardEvent) {
    if (textInput?.active) return;
    if (e) e.preventDefault();

    const activeCanvas = isFullscreen ? dialogCanvas : canvas;
    if (!activeCanvas) return;

    let sourceCanvas = activeCanvas;
    if (selection?.active && Math.abs(selection.w) > 5) {
      const tempCanvas = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      const sw = Math.abs(selection.w);
      const sh = Math.abs(selection.h);
      tempCanvas.width = sw * dpr;
      tempCanvas.height = sh * dpr;
      const tempCtx = tempCanvas.getContext('2d')!;

      if (selection.buffer) {
        tempCtx.drawImage(selection.buffer, 0, 0, sw * dpr, sh * dpr);
      } else {
        tempCtx.drawImage(activeCanvas, selection.x * dpr, selection.y * dpr, sw * dpr, sh * dpr, 0, 0, sw * dpr, sh * dpr);
      }
      sourceCanvas = tempCanvas;
    }

    try {
      const item = new ClipboardItem({
        "image/png": new Promise((resolve, reject) => {
          sourceCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Blob failed"));
          }, "image/png");
        })
      });
      await navigator.clipboard.write([item]);
    } catch (err) {
      console.error(err);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (textInput?.active) return;

    const isMod = isMac ? e.metaKey : e.ctrlKey;
    const activeCanvas = isFullscreen ? dialogCanvas : canvas;

    if (!isMod) {
      if (e.key === '1') { if(activeCanvas && selection?.buffer) finalizeMove(activeCanvas); mode = 'draw'; selection = null; }
      if (e.key === '2') { if(activeCanvas && selection?.buffer) finalizeMove(activeCanvas); mode = 'text'; selection = null; }
      if (e.key === '3') { if(activeCanvas && selection?.buffer) finalizeMove(activeCanvas); mode = 'erase'; selection = null; }
      if (e.key === '4') { mode = 'select'; }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        toolSize = Math.min(50, toolSize + 1);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        toolSize = Math.max(1, toolSize - 1);
      }
    }

    if (isMod && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      if (!activeCanvas) return;
      if (selection?.buffer) finalizeMove(activeCanvas);

      const rect = activeCanvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      const temp = document.createElement('canvas');
      temp.width = activeCanvas.width;
      temp.height = activeCanvas.height;
      const tCtx = temp.getContext('2d')!;
      tCtx.drawImage(activeCanvas, 0, 0);

      const ctx = activeCanvas.getContext("2d")!;
      ctx.clearRect(0, 0, rect.width, rect.height);

      mode = 'select';
      selection = {
        x: 0,
        y: 0,
        w: rect.width,
        h: rect.height,
        active: true,
        dragging: false,
        resizing: false,
        buffer: temp
      };
    } else if (isMod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    } else if (isMod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    } else if ((e.key === 'Backspace' || e.key === 'Delete') && selection?.active) {
      if (!activeCanvas) return;
      if (!selection.buffer) {
        const ctx = activeCanvas.getContext("2d")!;
        ctx.clearRect(selection.x, selection.y, selection.w, selection.h);
      }
      selection = null;
      saveState(activeCanvas);
    }
  }

  function handlePaste(e: ClipboardEvent) {
    if (textInput?.active) return;

    const items = e.clipboardData?.items;
    const activeCanvas = isFullscreen ? dialogCanvas : canvas;
    if (!items || !activeCanvas) return;

    for (const item of items) {
      if (item.type.includes("image")) {
        const blob = item.getAsFile();
        if (!blob) continue;
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const rect = activeCanvas.getBoundingClientRect();
            const ratio = Math.min((rect.width * 0.8) / img.width, (rect.height * 0.8) / img.height);
            const w = img.width * ratio;
            const h = img.height * ratio;

            const dpr = window.devicePixelRatio || 1;
            const temp = document.createElement('canvas');
            temp.width = w * dpr;
            temp.height = h * dpr;
            const tCtx = temp.getContext('2d')!;
            tCtx.drawImage(img, 0, 0, w * dpr, h * dpr);

            mode = 'select';
            selection = {
              x: (rect.width - w) / 2,
              y: (rect.height - h) / 2,
              w, h,
              active: true,
              dragging: false,
              resizing: false,
              buffer: temp
            };
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(blob);
      }
    }
  }

  onMount(() => { if (canvas) initCanvas(canvas); });
</script>

<WidgetCard isConfigured={true} padding={false} transparent={isCompact}>
	<div
			class="group relative flex h-full w-full flex-col outline-none select-none focus-within:ring-1 focus-within:ring-blue-500/50"
			tabindex="0"
			onpaste={handlePaste}
			oncopy={handleCopy}
			onkeydown={handleKeyDown}
	>
		{#if isCompact}
			<div class="flex h-full w-full items-center justify-center p-4">
				<button class="flex items-center justify-center rounded-lg bg-black/20 border border-black/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:bg-black/40 hover:text-white transition-all" onclick={openExpanded}>
					<Pencil size={15} strokeWidth={2.5} />
					Open Sketch
				</button>
			</div>
		{:else}
			<div class="flex items-center justify-between border-b border-black/20 bg-black/10 p-2">
				<div class="flex items-center gap-2">
					<div class="flex bg-black/20 rounded p-0.5 border border-black/20">
						<button class="px-2 py-1 rounded text-neutral-500 transition-colors {mode === 'draw' ? 'bg-black/40 text-white shadow-sm' : 'hover:text-white'}" onclick={() => { if(canvas && selection?.buffer) finalizeMove(canvas); mode = 'draw'; selection = null}} title="Draw (1)">
							<Pencil size={12} strokeWidth={2.5} />
						</button>
						<button class="px-2 py-1 rounded text-neutral-500 transition-colors {mode === 'text' ? 'bg-black/40 text-white shadow-sm' : 'hover:text-white'}" onclick={() => { if(canvas && selection?.buffer) finalizeMove(canvas); mode = 'text'; selection = null}} title="Text (2)">
							<Type size={12} strokeWidth={2.5} />
						</button>
						<button class="px-2 py-1 rounded text-neutral-500 transition-colors {mode === 'erase' ? 'bg-black/40 text-white shadow-sm' : 'hover:text-white'}" onclick={() => { if(canvas && selection?.buffer) finalizeMove(canvas); mode = 'erase'; selection = null}} title="Erase (3)">
							<Eraser size={12} strokeWidth={2.5} />
						</button>
						<button class="px-2 py-1 rounded text-neutral-500 transition-colors {mode === 'select' ? 'bg-black/40 text-white shadow-sm' : 'hover:text-white'}" onclick={() => mode = 'select'} title="Select (4)">
							<MousePointer2 size={12} strokeWidth={2.5} />
						</button>
					</div>
					<input type="range" min="1" max="20" bind:value={toolSize} class="w-12 h-1 accent-blue-500 bg-black/30 border border-black/20 rounded-lg appearance-none cursor-pointer" />
					<div class="flex gap-1 ml-1 items-center">
						{#each colors as c}
							<button class="h-3 w-3 rounded-full border border-black/40 {color === c ? 'ring-1 ring-white' : ''}" style="background: {c}" onclick={() => {color = c; mode = 'draw';}}></button>
						{/each}
						<div class="rainbow-picker h-4 w-4 border border-black/40">
							<input type="color" bind:value={color} oninput={() => mode = 'draw'} />
						</div>
					</div>
				</div>
				<div class="flex items-center gap-1.5">
					<button onclick={undo} disabled={historyIndex <= 0} class="p-1 text-neutral-500 hover:text-white disabled:opacity-20 transition-colors"><Undo size={14} strokeWidth={2.5} /></button>
					<button onclick={redo} disabled={historyIndex >= history.length - 1} class="p-1 text-neutral-500 hover:text-white disabled:opacity-20 transition-colors"><Redo size={14} strokeWidth={2.5} /></button>
					<button onclick={() => handleCopy()} class="p-1 text-neutral-500 hover:text-white transition-colors" title="Copy"><Copy size={14} strokeWidth={2.5} /></button>
					<button onclick={openExpanded} class="p-1 text-neutral-500 hover:text-white transition-colors" title="Fullscreen"><Maximize2 size={14} strokeWidth={2.5} /></button>
				</div>
			</div>

			<div class="relative flex-grow overflow-hidden bg-transparent">
				<canvas
						bind:this={canvas}
						onmousedown={(e) => handleInteractionStart(e, canvas!)}
						onmousemove={(e) => handleInteractionMove(e, canvas!)}
						onmouseup={() => handleInteractionEnd(canvas!)}
						onmouseleave={() => handleInteractionEnd(canvas!)}
						class="h-full w-full touch-none select-none {mode === 'select' ? (selection?.resizing ? 'cursor-nwse-resize' : selection?.dragging ? 'cursor-grabbing' : 'cursor-cell') : mode === 'text' ? 'cursor-text' : 'cursor-crosshair'}"
				></canvas>

				{#if selection?.active}
					<div class="absolute border border-dashed border-blue-400 bg-blue-400/10 pointer-events-none select-none" style="left: {selection.w < 0 ? selection.x + selection.w : selection.x}px; top: {selection.h < 0 ? selection.y + selection.h : selection.y}px; width: {Math.abs(selection.w)}px; height: {Math.abs(selection.h)}px;">
						{#if selection.buffer}
							<img src={selection.buffer.toDataURL()} alt="" draggable="false" class="h-full w-full object-fill opacity-90 select-none pointer-events-none" />
						{/if}
						<div class="absolute -bottom-1.5 -right-1.5 h-3 w-3 bg-blue-500 border border-white pointer-events-none"></div>
					</div>
				{/if}

				{#if textInput?.active && !isFullscreen}
					<div
							bind:this={textInputRef}
							contenteditable="true"
							onblur={finalizeTextInput}
							onmousedown={(e) => e.stopPropagation()}
							style="position: absolute; left: {textInput.x}px; top: {textInput.y}px; color: {color}; font-size: {toolSize * 5}px; font-family: sans-serif; line-height: 1.2; min-width: 20px; outline: none; white-space: pre-wrap; word-break: break-word;"
							class="border border-dashed border-blue-400 bg-blue-500/10 z-50 cursor-text min-h-[1.2em]"
					></div>
				{/if}
			</div>
		{/if}
	</div>
</WidgetCard>

<dialog
		bind:this={sketchDialog}
		class="m-0 h-[85vh] w-[90vw] max-w-5xl rounded-2xl border border-black/50 bg-neutral-800 p-0 text-slate-200 shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 outline-none select-none"
		onclose={closeExpanded}
>
	<div class="flex h-full flex-col bg-neutral-800" onpaste={handlePaste} oncopy={handleCopy} onkeydown={handleKeyDown} tabindex="-1">

		<header class="flex items-center justify-between border-b border-black/30 p-4 bg-black/20 shrink-0">
			<div class="flex items-center gap-4">
				<div class="flex bg-black/30 rounded-lg p-1 border border-black/20">
					<button class="p-1.5 rounded-md hover:bg-black/40 text-neutral-400 hover:text-white disabled:opacity-20 transition-colors" onclick={undo} disabled={historyIndex <= 0}><Undo size={16} strokeWidth={2.5}/></button>
					<button class="p-1.5 rounded-md hover:bg-black/40 text-neutral-400 hover:text-white disabled:opacity-20 transition-colors" onclick={redo} disabled={historyIndex >= history.length - 1}><Redo size={16} strokeWidth={2.5}/></button>
				</div>
				<div class="flex bg-black/30 rounded-lg p-1 border border-black/20">
					<button class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors {mode === 'draw' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}" onclick={() => { if(dialogCanvas && selection?.buffer) finalizeMove(dialogCanvas); mode = 'draw'; selection = null}}><Pencil size={12} strokeWidth={2.5}/> Pencil</button>
					<button class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors {mode === 'text' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}" onclick={() => { if(dialogCanvas && selection?.buffer) finalizeMove(dialogCanvas); mode = 'text'; selection = null}}><Type size={12} strokeWidth={2.5}/> Text</button>
					<button class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors {mode === 'erase' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}" onclick={() => { if(dialogCanvas && selection?.buffer) finalizeMove(dialogCanvas); mode = 'erase'; selection = null}}><Eraser size={12} strokeWidth={2.5}/> Eraser</button>
					<button class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors {mode === 'select' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}" onclick={() => mode = 'select'}><MousePointer2 size={12} strokeWidth={2.5}/> Select</button>
				</div>
				<div class="flex items-center gap-3 bg-black/30 px-3 py-2 rounded-lg border border-black/20">
					<input type="range" min="1" max="50" bind:value={toolSize} class="w-24 h-1.5 accent-blue-500 bg-black/40 border border-black/20 rounded-lg appearance-none cursor-pointer" />
				</div>
				<div class="flex gap-2 items-center">
					{#each colors as c}
						<button class="h-6 w-6 rounded-full border border-black/40 {color === c ? 'ring-2 ring-white shadow-md' : ''}" style="background: {c}" onclick={() => {color = c; mode = 'draw';}}></button>
					{/each}
					<div class="rainbow-picker h-7 w-7 shadow-inner border border-black/40">
						<input type="color" bind:value={color} oninput={() => mode = 'draw'} class="scale-150" />
						<Plus size={12} strokeWidth={3} class="pointer-events-none drop-shadow-md text-white" />
					</div>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<button onclick={() => handleCopy()} class="flex h-9 w-9 items-center justify-center rounded-lg bg-black/30 text-neutral-400 border border-black/20 hover:bg-black/50 hover:text-white transition-colors" title="Copy"><Copy size={16} strokeWidth={2.5}/></button>
				<button class="h-9 w-9 flex items-center justify-center rounded-lg bg-black/30 text-neutral-400 border border-black/20 hover:bg-red-500/20 hover:text-red-400 transition-colors" onclick={closeExpanded}><X size={16} strokeWidth={2.5}/></button>
			</div>
		</header>

		<div class="relative flex-grow bg-[#0f0f0f] p-4 sm:p-6">
			<div class="relative h-full w-full bg-neutral-800 shadow-2xl overflow-hidden rounded-xl border border-black/40">
				<canvas
						bind:this={dialogCanvas}
						onmousedown={(e) => handleInteractionStart(e, dialogCanvas!)}
						onmousemove={(e) => handleInteractionMove(e, dialogCanvas!)}
						onmouseup={() => handleInteractionEnd(dialogCanvas!)}
						onmouseleave={() => handleInteractionEnd(dialogCanvas!)}
						class="h-full w-full touch-none select-none {mode === 'select' ? (selection?.resizing ? 'cursor-nwse-resize' : selection?.dragging ? 'cursor-grabbing' : 'cursor-cell') : mode === 'text' ? 'cursor-text' : 'cursor-crosshair'}"
				></canvas>

				{#if selection?.active}
					<div class="absolute border-2 border-dashed border-blue-500 bg-blue-500/5 pointer-events-none select-none" style="left: {selection.w < 0 ? selection.x + selection.w : selection.x}px; top: {selection.h < 0 ? selection.y + selection.h : selection.y}px; width: {Math.abs(selection.w)}px; height: {Math.abs(selection.h)}px;">
						{#if selection.buffer}
							<img src={selection.buffer.toDataURL()} alt="" draggable="false" class="h-full w-full object-fill opacity-90 select-none pointer-events-none" />
						{/if}
						<div class="absolute -bottom-2 -right-2 h-4 w-4 bg-blue-500 border-2 border-white pointer-events-none"></div>
					</div>
				{/if}

				{#if textInput?.active && isFullscreen}
					<div
							bind:this={textInputRef}
							contenteditable="true"
							onblur={finalizeTextInput}
							onmousedown={(e) => e.stopPropagation()}
							style="position: absolute; left: {textInput.x}px; top: {textInput.y}px; color: {color}; font-size: {toolSize * 5}px; font-family: sans-serif; line-height: 1.2; min-width: 20px; outline: none; white-space: pre-wrap; word-break: break-word;"
							class="border border-dashed border-blue-400 bg-blue-500/10 z-50 cursor-text min-h-[1.2em]"
					></div>
				{/if}
			</div>
		</div>
	</div>
</dialog>

<style>
  canvas { image-rendering: -webkit-optimize-contrast; display: block; background-color: transparent; }
  input[type=range]::-webkit-slider-thumb { appearance: none; height: 12px; width: 12px; border-radius: 100%; background: #3b82f6; cursor: pointer; border: 2px solid rgba(0,0,0,0.4); }

  .rainbow-picker {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    overflow: hidden;
    background: conic-gradient(
        from 0deg,
        red, yellow, lime, aqua, blue, magenta, red
    );
  }

  .rainbow-picker input[type=color] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
</style>
