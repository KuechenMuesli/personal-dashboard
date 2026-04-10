<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  let { id, height, width } = $props<{ id: string; height: number; width: number }>();

  let mode = $state<"timer" | "stopwatch">("timer");
  let isRunning = $state(false);
  let displayTime = $state("00:00:00");

  let inputMs = $state(5 * 60 * 1000);
  let targetTimestamp = $state<number | null>(null);
  let startTimestamp = $state<number | null>(null);
  let elapsedBeforePause = $state(0);

  let stepIndex = $state(1);
  const steps = [
    { label: '30s', ms: 30000 },
    { label: '1m', ms: 60000 },
    { label: '5m', ms: 300000 },
    { label: '1h', ms: 3600000 }
  ];
  const currentStep = $derived(steps[stepIndex]);

  let interval: ReturnType<typeof setInterval>;

  const isCompact = $derived(height <= 2);
  const isLarge = $derived(height >= 3);
  const isNarrow = $derived(width <= 2);

  onMount(() => {
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
        stepIndex = parsed.stepIndex || 1;
        if (isRunning) startLogic();
        else updateDisplay();
      } catch (e) { console.error(e); }
    }
  });

  function saveState() {
    localStorage.setItem(`timer-settings-${id}`, JSON.stringify({
      mode, isRunning, targetTimestamp, startTimestamp, elapsedBeforePause, inputMs, stepIndex
    }));
  }

  function updateDisplay() {
    let diff = 0;
    const now = Date.now();
    if (mode === "timer") {
      if (isRunning && targetTimestamp) {
        diff = Math.max(0, targetTimestamp - now);
        if (diff === 0) { isRunning = false; clearInterval(interval); }
      } else { diff = inputMs; }
    } else {
      if (isRunning && startTimestamp) diff = now - startTimestamp;
      else diff = elapsedBeforePause;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    displayTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function adjustTime(multiplier: number) {
    if (isRunning || mode !== 'timer') return;
    inputMs = Math.max(0, inputMs + (currentStep.ms * multiplier));
    updateDisplay();
    saveState();
  }

  function cycleStep() {
    stepIndex = (stepIndex + 1) % steps.length;
    saveState();
  }

  function startLogic() {
    clearInterval(interval);
    interval = setInterval(updateDisplay, 100);
  }

  function toggle() {
    isRunning = !isRunning;
    const now = Date.now();
    if (isRunning) {
      if (mode === "timer") targetTimestamp = now + inputMs;
      else startTimestamp = now - elapsedBeforePause;
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
    updateDisplay();
    saveState();
  }

  onDestroy(() => clearInterval(interval));
</script>

<div class="flex h-full w-full bg-neutral-800 font-sans text-white overflow-hidden transition-all {isCompact ? 'items-center px-4' : 'flex-col px-3 py-2'}">

	{#if isLarge}
		<div class="flex h-8 shrink-0 items-center justify-between border-b border-neutral-700/50 mb-2">
			<button
					class="rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-widest transition-all bg-neutral-600 text-white"
					onclick={cycleMode}
			>{mode}</button>

			{#if mode === 'timer' && !isRunning}
				<div class="flex items-center gap-1.5 bg-neutral-900/50 rounded px-1.5 py-0.5 border border-neutral-700/30">
					<button onclick={() => adjustTime(1)} class="text-[10px] font-bold hover:text-blue-400">+</button>
					<button onclick={cycleStep} class="text-[8px] font-black text-blue-500 uppercase tracking-tight">{currentStep.label}</button>
					<button onclick={() => adjustTime(-1)} class="text-[10px] font-bold hover:text-blue-400">-</button>
				</div>
			{/if}
		</div>
	{/if}

	<div class="flex {isCompact ? 'w-full justify-between items-center' : 'flex-col items-center justify-around flex-1'}">

		<div class="flex items-center">
			<button
					onclick={cycleMode}
					disabled={isRunning}
					class="font-normal tabular-nums tracking-tight transition-colors {isLarge ? 'text-xl' : 'text-lg'} {isRunning ? 'cursor-default' : 'hover:text-neutral-400'}"
			>
				{displayTime}
			</button>

			{#if mode === 'timer' && !isRunning && isCompact}
				<div class="ml-2 flex flex-col items-center bg-neutral-900/30 rounded p-0.5">
					<button onclick={() => adjustTime(1)} class="text-[8px] p-0.5 leading-none hover:text-blue-400">+</button>
					<button onclick={cycleStep} class="text-[7px] font-black text-blue-500/80 uppercase px-1 leading-none">{currentStep.label}</button>
					<button onclick={() => adjustTime(-1)} class="text-[8px] p-0.5 leading-none hover:text-blue-400">-</button>
				</div>
			{/if}
		</div>

		<button
				onclick={toggle}
				class="flex shrink-0 items-center justify-center rounded-lg bg-neutral-700 text-white transition-all hover:bg-neutral-600 active:scale-90 {isLarge ? 'h-8 w-8' : 'h-7 w-7'}"
		>
			{#if isRunning}
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
			{:else}
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
			{/if}
		</button>
	</div>
</div>
