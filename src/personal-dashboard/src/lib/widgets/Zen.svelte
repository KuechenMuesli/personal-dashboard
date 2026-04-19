<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  let {
    id,
    isEditing,
    height,
    showSettings = $bindable(false),
    hidden = $bindable(true)
  } = $props<{
    id: string;
    isEditing: boolean;
    height: number;
    showSettings: boolean;
    hidden: boolean;
  }>();

  type Technique = { name: string; phases: { label: string; duration: number; scale: number }[] };

  const TECHNIQUES: Record<string, Technique> = {
    box: {
      name: "Box Breathing (4-4-4-4)",
      phases: [
        { label: "Inhale", duration: 4000, scale: 1 },
        { label: "Hold", duration: 4000, scale: 1 },
        { label: "Exhale", duration: 4000, scale: 0.4 },
        { label: "Hold", duration: 4000, scale: 0.4 }
      ]
    },
    relax: {
      name: "Deep Calm (4-7-8)",
      phases: [
        { label: "Inhale", duration: 4000, scale: 1 },
        { label: "Hold", duration: 7000, scale: 1 },
        { label: "Exhale", duration: 8000, scale: 0.4 }
      ]
    },
    awaken: {
      name: "Awaken (6-2)",
      phases: [
        { label: "Inhale", duration: 6000, scale: 1 },
        { label: "Exhale", duration: 2000, scale: 0.4 }
      ]
    }
  };

  const THEMES = [
    { id: "emerald", hex: "#10b981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.5)" },
    { id: "blue", hex: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.5)" },
    { id: "purple", hex: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)", border: "rgba(139, 92, 246, 0.5)" },
    { id: "rose", hex: "#f43f5e", bg: "rgba(244, 63, 94, 0.15)", border: "rgba(244, 63, 94, 0.5)" }
  ];

  let selectedTech = $state("box");
  let selectedTheme = $state("emerald");
  let isActive = $state(false);
  let phaseIndex = $state(0);

  let currentScale = $state(0.4);
  let transitionDuration = $state(0);
  let timer: ReturnType<typeof setTimeout>;
  let dialogEl = $state<HTMLDialogElement | null>(null);

  const activeTechnique = $derived(TECHNIQUES[selectedTech] || TECHNIQUES.box);
  const activeThemeObj = $derived(THEMES.find(t => t.id === selectedTheme) || THEMES[0]);
  const currentLabel = $derived(isActive ? activeTechnique.phases[phaseIndex].label : "Breathe");
  const isCompact = $derived(height <= 2);

  $effect(() => {
    hidden = false;
  });

  onMount(() => {
    const saved = localStorage.getItem(`breathe-settings-${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.selectedTech) selectedTech = parsed.selectedTech;
        if (parsed.selectedTheme) selectedTheme = parsed.selectedTheme;
      } catch (e) {}
    }
  });

  onDestroy(() => {
    clearTimeout(timer);
  });

  function saveSettings() {
    localStorage.setItem(`breathe-settings-${id}`, JSON.stringify({ selectedTech, selectedTheme }));
    showSettings = false;
    if (isActive) stopCycle();
  }

  function runPhase() {
    if (!isActive) return;

    const phase = activeTechnique.phases[phaseIndex];
    transitionDuration = phase.duration;

    // Slight delay to allow CSS to register the new transition duration before transforming
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!isActive) return;
        currentScale = phase.scale;

        timer = setTimeout(() => {
          phaseIndex = (phaseIndex + 1) % activeTechnique.phases.length;
          runPhase();
        }, phase.duration);
      });
    });
  }

  function startCycle() {
    isActive = true;
    phaseIndex = 0;

    // Pre-set to minimum scale instantly before starting
    transitionDuration = 0;
    currentScale = 0.4;

    setTimeout(() => {
      runPhase();
    }, 50);
  }

  function stopCycle() {
    isActive = false;
    clearTimeout(timer);
    transitionDuration = 1000;
    currentScale = 0.4;
    phaseIndex = 0;
  }

  function toggle() {
    if (isActive) stopCycle();
    else startCycle();
  }

  $effect(() => {
    if (showSettings && dialogEl) dialogEl.showModal();
    else if (dialogEl?.open) dialogEl.close();
  });
</script>

<div class="flex h-full w-full flex-col bg-neutral-800 font-sans text-white overflow-hidden transition-colors hover:bg-neutral-800/80">

	<header class="flex shrink-0 items-center justify-between p-3 pb-0">
		<h2 class="text-[10px] font-black uppercase tracking-widest text-neutral-500">
			Zen
		</h2>
		<button
				onclick={(e) => { e.stopPropagation(); showSettings = true; }}
				class="h-5 w-5 flex items-center justify-center rounded text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors z-20"
				title="Settings"
		>
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
			</svg>
		</button>
	</header>

	<div
			class="relative flex-grow flex items-center justify-center w-full h-full cursor-pointer select-none"
			onclick={toggle}
			role="button"
			tabindex="0"
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle(); }}
	>

		<div
				class="absolute rounded-full ease-linear will-change-transform shadow-2xl"
				style="
        width: {isCompact ? '90px' : '150px'};
        height: {isCompact ? '90px' : '150px'};
        transform: scale({currentScale});
        transition-property: transform;
        transition-duration: {transitionDuration}ms;
        background-color: {activeThemeObj.bg};
        border: 2px solid {activeThemeObj.border};
        box-shadow: 0 0 40px {activeThemeObj.bg};
      "
		></div>

		<div class="z-10 flex flex-col items-center justify-center pointer-events-none">
			<h3
					class="font-black uppercase tracking-[0.2em] transition-all duration-700
               {isCompact ? 'text-sm' : 'text-xl'}
               {isActive ? 'text-white drop-shadow-md' : 'text-neutral-400'}"
			>
				{currentLabel}
			</h3>

			<p
					class="absolute mt-8 text-[9px] uppercase tracking-widest transition-all duration-700
               {isActive ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0 text-neutral-500'}"
			>
				Click to relax
			</p>
		</div>

	</div>
</div>

<dialog
		bind:this={dialogEl}
		class="fixed left-1/2 top-1/2 m-0 w-[90vw] max-w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-800 bg-neutral-900 p-0 text-white shadow-2xl outline-none backdrop:bg-black/80 backdrop:backdrop-blur-sm"
		onclose={() => (showSettings = false)}
>
	<div class="flex flex-col gap-5 p-6">
		<header class="flex items-center justify-between shrink-0">
			<h3 class="text-lg font-bold">Zen Settings</h3>
			<button class="text-2xl text-neutral-500 hover:text-white leading-none" onclick={() => (showSettings = false)}>&times;</button>
		</header>

		<div class="space-y-5">
			<div class="space-y-2">
				<label class="block text-[10px] uppercase font-black text-neutral-500 tracking-widest">Breathing Technique</label>
				<select
						bind:value={selectedTech}
						class="w-full rounded-lg border border-neutral-800 bg-neutral-800 p-2.5 text-sm text-white outline-none focus:border-blue-500 appearance-none cursor-pointer"
				>
					{#each Object.entries(TECHNIQUES) as [key, tech]}
						<option value={key}>{tech.name}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-3">
				<label class="block text-[10px] uppercase font-black text-neutral-500 tracking-widest">Glow Color</label>
				<div class="flex gap-3">
					{#each THEMES as theme}
						<button
								class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 {selectedTheme === theme.id ? 'scale-110 ring-2 ring-white/20' : 'border-transparent'}"
								style="background-color: {theme.hex}; border-color: {selectedTheme === theme.id ? 'white' : 'transparent'};"
								onclick={() => selectedTheme = theme.id}
								aria-label={theme.id}
						></button>
					{/each}
				</div>
			</div>
		</div>

		<footer class="flex justify-end gap-2 shrink-0 border-t border-neutral-800 pt-4 mt-2">
			<button class="rounded-lg px-4 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors" onclick={() => (showSettings = false)}>Cancel</button>
			<button class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20" onclick={saveSettings}>Save Config</button>
		</footer>
	</div>
</dialog>
