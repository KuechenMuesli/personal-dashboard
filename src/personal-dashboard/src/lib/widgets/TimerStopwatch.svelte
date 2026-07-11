<script lang="ts">
  import { onMount, onDestroy, getContext } from "svelte";
  import { Play, Pause, Timer, Clock } from "lucide-svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import { i18n } from "$lib/i18n/i18n.svelte";

  let { id, height, width } = $props<{ id: string; height: number; width: number }>();

  const getSecrets = getContext<() => Record<string, any>>('secrets');

  let mode = $state<"timer" | "stopwatch">("timer");
  let isRunning = $state(false);

  let hStr = $state("00");
  let mStr = $state("00");
  let sStr = $state("00");
  let displayTime = $state("00:00:00");

  let inputMs = $state(5 * 60 * 1000);
  let targetTimestamp = $state<number | null>(null);
  let startTimestamp = $state<number | null>(null);
  let elapsedBeforePause = $state(0);

  let interval: ReturnType<typeof setInterval>;

  // Editing state
  let isEditingTime = $state(false);
  let editH = $state("");
  let editM = $state("");
  let editS = $state("");
  
  let inputHEl = $state<HTMLInputElement | null>(null);
  let inputMEl = $state<HTMLInputElement | null>(null);
  let inputSEl = $state<HTMLInputElement | null>(null);
  
  let wheelAccumulator = 0;
  let isLoaded = $state(false);

  const isCompact = $derived(height <= 2);
  const isLarge = $derived(height >= 3);
  const isNarrow = $derived(width <= 1);
  const isFinished = $derived(mode === "timer" && !isRunning && targetTimestamp !== null && (targetTimestamp - Date.now() <= 0));

  $effect(() => {
    const secrets = getSecrets();
    if (!isLoaded) {
      if (secrets[id]) {
        const parsed = secrets[id];
        mode = parsed.mode || "timer";
        isRunning = parsed.isRunning || false;
        targetTimestamp = parsed.targetTimestamp || null;
        startTimestamp = parsed.startTimestamp || null;
        elapsedBeforePause = parsed.elapsedBeforePause || 0;
        inputMs = parsed.inputMs || (5 * 60 * 1000);
        if (isRunning) startLogic();
        else updateDisplay();
      } else {
        const saved = localStorage.getItem(`timer-settings-${id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            mode = parsed.mode || "timer";
            isRunning = parsed.isRunning || false;
            targetTimestamp = parsed.targetTimestamp || null;
            startTimestamp = parsed.startTimestamp || null;
            elapsedBeforePause = parsed.elapsedBeforePause || 0;
            inputMs = parsed.inputMs || (5 * 60 * 1000);
            if (isRunning) startLogic();
            else updateDisplay();
          } catch (e) { console.error(e); }
        } else {
          updateDisplay();
        }
      }
      isLoaded = true;
    }
  });

  onMount(() => {
    return () => clearInterval(interval);
  });

  function saveState() {
    const state = {
      mode, isRunning, targetTimestamp, startTimestamp, elapsedBeforePause, inputMs
    };
    localStorage.setItem(`timer-settings-${id}`, JSON.stringify(state));
    
    fetch('/api/secrets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: id, key: state })
    }).catch(() => {});
  }

  function updateDisplay() {
    let diff = 0;
    const now = Date.now();
    if (mode === "timer") {
      if (isRunning && targetTimestamp) {
        diff = Math.max(0, targetTimestamp - now);
        if (diff === 0) {
          isRunning = false;
          clearInterval(interval);
        }
      } else { diff = inputMs; }
    } else {
      if (isRunning && startTimestamp) diff = now - startTimestamp;
      else diff = elapsedBeforePause;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    
    hStr = h.toString().padStart(2, '0');
    mStr = m.toString().padStart(2, '0');
    sStr = s.toString().padStart(2, '0');
    displayTime = `${hStr}:${mStr}:${sStr}`;
  }

  function adjustWheel(e: WheelEvent, unit: 'h' | 'm' | 's') {
    if (isRunning || mode !== 'timer') return;
    e.preventDefault();

    wheelAccumulator += e.deltaY;
    if (Math.abs(wheelAccumulator) < 25) return;
    
    const dir = wheelAccumulator < 0 ? 1 : -1;
    
    wheelAccumulator = 0;

    let h = Math.floor(inputMs / 3600000);
    let m = Math.floor((inputMs % 3600000) / 60000);
    let s = Math.floor((inputMs % 60000) / 1000);

    if (unit === 'h') h = Math.max(0, h + dir);
    if (unit === 'm') m = Math.max(0, Math.min(59, m + dir));
    if (unit === 's') s = Math.max(0, Math.min(59, s + dir));

    inputMs = (h * 3600 + m * 60 + s) * 1000;
    updateDisplay();
    saveState();
  }

  function startEditingTime(part: 'h' | 'm' | 's') {
    if (isRunning || mode !== "timer") return;
    editH = hStr;
    editM = mStr;
    editS = sStr;
    isEditingTime = true;
    
    setTimeout(() => {
      if (part === 'h' && inputHEl) { inputHEl.focus(); inputHEl.select(); }
      if (part === 'm' && inputMEl) { inputMEl.focus(); inputMEl.select(); }
      if (part === 's' && inputSEl) { inputSEl.focus(); inputSEl.select(); }
    }, 10);
  }

  function handlePartInput(e: Event, part: 'h' | 'm' | 's') {
    const el = e.currentTarget as HTMLInputElement;
    let val = el.value.replace(/[^\d]/g, '').slice(0, 2);
    el.value = val;
    
    if (part === 'h') editH = val;
    if (part === 'm') editM = val;
    if (part === 's') editS = val;

    if (val.length === 2 && (e as InputEvent).inputType === 'insertText') {
      if (part === 'h' && inputMEl) { inputMEl.focus(); inputMEl.select(); }
      if (part === 'm' && inputSEl) { inputSEl.focus(); inputSEl.select(); }
      if (part === 's') { inputSEl?.blur(); }
    }
  }

  function handlePartBlur() {
    setTimeout(() => {
      if (document.activeElement !== inputHEl && document.activeElement !== inputMEl && document.activeElement !== inputSEl) {
        commitEdit();
      }
    }, 10);
  }

  function commitEdit() {
    isEditingTime = false;
    let h = parseInt(editH || '0', 10);
    let m = parseInt(editM || '0', 10);
    let s = parseInt(editS || '0', 10);

    let ms = (h * 3600 + m * 60 + s) * 1000;
    if (!isNaN(ms)) {
      inputMs = Math.max(0, ms);
      updateDisplay();
      saveState();
    }
  }

  function handlePartKeyDown(e: KeyboardEvent, part: 'h' | 'm' | 's') {
    if (e.key === 'Enter') {
      (e.currentTarget as HTMLInputElement).blur();
      return;
    }
    if (e.key === 'Backspace' && (e.currentTarget as HTMLInputElement).value === '') {
      e.preventDefault();
      if (part === 'm' && inputHEl) { inputHEl.focus(); inputHEl.select(); }
      if (part === 's' && inputMEl) { inputMEl.focus(); inputMEl.select(); }
    }
  }

  function startLogic() {
    clearInterval(interval);
    interval = setInterval(updateDisplay, 100);
  }

  function toggle() {
    isRunning = !isRunning;
    const now = Date.now();

    if (isRunning) {
      if (mode === "timer") {
        targetTimestamp = now + inputMs;
      } else {
        startTimestamp = now - elapsedBeforePause;
      }
      startLogic();
    } else {
      clearInterval(interval);
      if (mode === "stopwatch" && startTimestamp) elapsedBeforePause = now - startTimestamp;
    }
    saveState();
  }

  function cycleMode() {
    if (isRunning) return;
    mode = mode === "timer" ? "stopwatch" : "timer";
    elapsedBeforePause = 0;
    targetTimestamp = null;
    updateDisplay();
    saveState();
  }

  onDestroy(() => clearInterval(interval));
</script>

<WidgetCard isConfigured={true} padding={false}>
	<div class="flex h-full w-full font-sans text-slate-200 overflow-hidden transition-all duration-500
    {isFinished ? 'bg-red-900/80 animate-pulse' : 'bg-transparent'}
    {isCompact ? (isNarrow ? 'items-center justify-center px-1' : 'items-center px-2') : 'flex-col px-3 py-2'}">

		{#if isLarge}
			<div class="flex h-8 w-full shrink-0 items-center justify-between border-b border-black/20 mb-2">
				<button
						class="rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-widest transition-all
          {mode === 'timer' ? 'bg-white/10 text-white shadow-sm' : 'bg-black/20 text-neutral-500 hover:text-white'}
          disabled:opacity-50"
						onclick={cycleMode}
            disabled={isRunning}
				>{mode}</button>
			</div>
		{/if}

		<div class="flex w-full {isCompact ? 'justify-between items-center' : 'flex-col items-center justify-around flex-1'} {isNarrow && isCompact ? 'gap-1' : ''}">

			<div class="flex items-center">
				<div class="font-normal tabular-nums tracking-tight {isLarge ? 'text-2xl' : (isNarrow ? 'text-sm' : 'text-base')} flex items-center transition-colors {mode !== 'timer' || isRunning ? 'opacity-80' : ''}">
					{#if mode === 'timer'}
						{#if isEditingTime}
							<input bind:this={inputHEl} bind:value={editH} oninput={(e) => handlePartInput(e, 'h')} onblur={handlePartBlur} onkeydown={(e) => handlePartKeyDown(e, 'h')} class="bg-black/30 text-white font-inherit {isLarge ? 'text-2xl' : (isNarrow ? 'text-sm' : 'text-base')} tabular-nums tracking-tight rounded outline-none text-center border-none focus:ring-1 ring-blue-500/50 p-0 m-0 w-[1.4em] h-[1.2em] leading-none" /><span class="opacity-50 w-[0.5em] text-center inline-block">:</span><!--
							--><input bind:this={inputMEl} bind:value={editM} oninput={(e) => handlePartInput(e, 'm')} onblur={handlePartBlur} onkeydown={(e) => handlePartKeyDown(e, 'm')} class="bg-black/30 text-white font-inherit {isLarge ? 'text-2xl' : (isNarrow ? 'text-sm' : 'text-base')} tabular-nums tracking-tight rounded outline-none text-center border-none focus:ring-1 ring-blue-500/50 p-0 m-0 w-[1.4em] h-[1.2em] leading-none" /><span class="opacity-50 w-[0.5em] text-center inline-block">:</span><!--
							--><input bind:this={inputSEl} bind:value={editS} oninput={(e) => handlePartInput(e, 's')} onblur={handlePartBlur} onkeydown={(e) => handlePartKeyDown(e, 's')} class="bg-black/30 text-white font-inherit {isLarge ? 'text-2xl' : (isNarrow ? 'text-sm' : 'text-base')} tabular-nums tracking-tight rounded outline-none text-center border-none focus:ring-1 ring-blue-500/50 p-0 m-0 w-[1.4em] h-[1.2em] leading-none" />
						{:else}
							<span class="{isRunning ? '' : 'cursor-ns-resize hover:text-blue-400'} transition-colors rounded inline-block text-center w-[1.4em] h-[1.2em] leading-none" onwheel={(e) => adjustWheel(e, 'h')} onclick={() => startEditingTime('h')} role="presentation">{hStr}</span><span class="opacity-50 w-[0.5em] text-center inline-block">:</span><!--
							--><span class="{isRunning ? '' : 'cursor-ns-resize hover:text-blue-400'} transition-colors rounded inline-block text-center w-[1.4em] h-[1.2em] leading-none" onwheel={(e) => adjustWheel(e, 'm')} onclick={() => startEditingTime('m')} role="presentation">{mStr}</span><span class="opacity-50 w-[0.5em] text-center inline-block">:</span><!--
							--><span class="{isRunning ? '' : 'cursor-ns-resize hover:text-blue-400'} transition-colors rounded inline-block text-center w-[1.4em] h-[1.2em] leading-none" onwheel={(e) => adjustWheel(e, 's')} onclick={() => startEditingTime('s')} role="presentation">{sStr}</span>
						{/if}
					{:else}
						<span class="inline-block text-center w-[1.4em] h-[1.2em] leading-none">{hStr}</span><span class="opacity-50 w-[0.5em] text-center inline-block">:</span><span class="inline-block text-center w-[1.4em] h-[1.2em] leading-none">{mStr}</span><span class="opacity-50 w-[0.5em] text-center inline-block">:</span><span class="inline-block text-center w-[1.4em] h-[1.2em] leading-none">{sStr}</span>
					{/if}
				</div>
			</div>

			<div class="flex items-center gap-0.5">
				{#if isCompact}
					<button onclick={cycleMode} disabled={isRunning} class="flex {isNarrow ? 'h-6 w-6' : 'h-7 w-7'} items-center justify-center rounded-lg bg-black/20 text-neutral-400 hover:bg-black/40 hover:text-white transition-colors disabled:opacity-50 shrink-0" title="Switch Mode">
						{#if mode === 'timer'}
							<Timer size={isNarrow ? 10 : 12} strokeWidth={2.5} />
						{:else}
							<Clock size={isNarrow ? 10 : 12} strokeWidth={2.5} />
						{/if}
					</button>
				{/if}

				<button
						onclick={toggle}
						class="flex shrink-0 items-center justify-center rounded-lg transition-all active:scale-90
					{isFinished ? 'bg-white text-red-900 shadow-lg' : 'bg-black/30 text-slate-200 hover:bg-black/40 hover:text-white'}
					{isLarge ? 'h-10 w-10 mt-2' : (isNarrow ? 'h-6 w-6' : 'h-7 w-7')}"
				>
					{#if isRunning}
						<Pause size={isLarge ? 16 : (isNarrow ? 10 : 12)} strokeWidth={2.5} fill="currentColor" />
					{:else}
						<Play size={isLarge ? 16 : (isNarrow ? 10 : 12)} strokeWidth={2.5} fill="currentColor" class="ml-0.5" />
					{/if}
				</button>
			</div>
		</div>
	</div>
</WidgetCard>

<style>
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.85; }
  }
</style>
