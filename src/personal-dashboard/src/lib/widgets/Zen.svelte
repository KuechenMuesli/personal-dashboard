<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Settings } from "lucide-svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";

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
</script>

{#snippet headerButtons()}
	<button
			onclick={(e) => { e.stopPropagation(); showSettings = true; }}
			class="h-5 w-5 flex items-center justify-center rounded text-neutral-500 hover:text-white hover:bg-black/40 transition-colors z-20"
			title="Settings"
	>
		<Settings size={12} strokeWidth={2.5} />
	</button>
{/snippet}

<WidgetCard
		title="Zen"
		bind:showSettings={showSettings}
		isConfigured={true}
		headerActions={headerButtons}
		padding={true}
>
	<div
			class="relative flex-grow flex items-center justify-center w-full h-full cursor-pointer select-none rounded-lg transition-colors hover:bg-black/10"
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
</WidgetCard>

<SettingsDialog title="Zen Settings" bind:show={showSettings} onSave={saveSettings}>
	<div class="space-y-5">

		<div class="space-y-2">
			<label class="block text-[10px] uppercase font-black text-neutral-500 tracking-widest">Breathing Technique</label>
			<select
					bind:value={selectedTech}
					class="w-full rounded-lg border border-black/40 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 appearance-none cursor-pointer"
			>
				{#each Object.entries(TECHNIQUES) as [key, tech]}
					<option value={key} class="bg-neutral-800 text-white">{tech.name}</option>
				{/each}
			</select>
		</div>

		<div class="space-y-3">
			<label class="block text-[10px] uppercase font-black text-neutral-500 tracking-widest">Glow Color</label>
			<div class="flex gap-3">
				{#each THEMES as theme}
					<button
							class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 shadow-sm {selectedTheme === theme.id ? 'scale-110 ring-2 ring-white/20' : 'border-transparent'}"
							style="background-color: {theme.hex}; border-color: {selectedTheme === theme.id ? 'white' : 'transparent'};"
							onclick={() => selectedTheme = theme.id}
							aria-label={theme.id}
					></button>
				{/each}
			</div>
		</div>

	</div>
</SettingsDialog>
