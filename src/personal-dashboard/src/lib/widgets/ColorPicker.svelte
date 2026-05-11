<script lang="ts">
  import { onMount } from "svelte";
  import { Pipette, Copy, Check } from "lucide-svelte";
  import WidgetCard from "$lib/components/WidgetCard.svelte";

  let { id, height, width, showSettings = $bindable(false) } = $props<{
    id: string;
    height: number;
    width: number;
    showSettings: boolean;
  }>();

  let hexColor = $state("#FFFFFF");
  let rgbColor = $state("rgb(255, 255, 255)");
  let isEyeDropperSupported = $state(true);
  let copiedHex = $state(false);
  let copiedRgb = $state(false);

  const isCompactHeight = $derived(height <= 3);
  const isSmallWidth = $derived(width <= 1);

  const displayRgb = $derived(
    isSmallWidth ? rgbColor.replace(/^rgb\((.*)\)$/, '$1') : rgbColor
  );

  onMount(() => {
    isEyeDropperSupported = 'EyeDropper' in window;
    const saved = localStorage.getItem(`colorpicker-${id}`);
    if (saved) {
      updateColor(saved, false);
    }
  });

  function hexToRgb(hex: string): string | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`;
  }

  function rgbToHex(rgb: string): string | null {
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return null;
    const [r, g, b] = match.map(Number);
    if (r > 255 || g > 255 || b > 255) return null;
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }

  function updateColor(value: string, save = true) {
    let newHex = "";
    let newRgb = "";

    if (value.startsWith("#") || /^[0-9a-fA-F]{3,6}$/.test(value)) {
      const formattedHex = value.startsWith("#") ? value : "#" + value;
      const rgb = hexToRgb(formattedHex);
      if (rgb) { newHex = formattedHex.toUpperCase(); newRgb = rgb; }
    } else if (value.includes(",") || value.startsWith("rgb")) {
      const formattedRgb = value.startsWith("rgb") ? value : `rgb(${value})`;
      const hex = rgbToHex(formattedRgb);
      if (hex) { newHex = hex; newRgb = formattedRgb; }
    }

    if (newHex && newRgb) {
      hexColor = newHex;
      rgbColor = newRgb;
      if (save) localStorage.setItem(`colorpicker-${id}`, newHex);
    }
  }

  async function openEyeDropper() {
    if (!isEyeDropperSupported) return;
    try {
      // @ts-ignore
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      updateColor(result.sRGBHex);
    } catch (e) {}
  }

  async function copy(text: string, type: 'hex' | 'rgb') {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'hex') {
        copiedHex = true;
        setTimeout(() => copiedHex = false, 2000);
      } else {
        copiedRgb = true;
        setTimeout(() => copiedRgb = false, 2000);
      }
    } catch (err) {}
  }
</script>

<WidgetCard
		title={isCompactHeight ? undefined : "Color Picker"}
		isConfigured={true}
		bind:showSettings={showSettings}
		padding={true}
>
	<div class="flex h-full w-full items-stretch py-0.5 overflow-hidden {isSmallWidth ? 'gap-1.5' : 'gap-2.5'}">

		<button
				onclick={openEyeDropper}
				disabled={!isEyeDropperSupported}
				class="group relative shrink-0 rounded-full border border-black/40 shadow-inner transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed {isSmallWidth ? 'w-2.5' : 'w-3.5'}"
				style="background-color: {hexColor}"
				title={isEyeDropperSupported ? "Farbe vom Bildschirm wählen" : "Nicht unterstützt"}
		>
			<div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
				<Pipette size={10} class="text-white drop-shadow-md" />
			</div>
		</button>

		<div class="flex flex-col gap-2 flex-grow min-w-0 justify-center">

			<div class="relative min-w-0">
				<span class="absolute top-1 text-[7px] font-black text-neutral-500 uppercase tracking-widest leading-none z-10 pointer-events-none {isSmallWidth ? 'left-2' : 'left-2.5'}">HEX</span>
				<div class="relative flex items-center">
					<input
							type="text"
							value={hexColor}
							oninput={(e) => updateColor(e.currentTarget.value)}
							class="w-full bg-black/20 border border-white/5 rounded-lg pt-3.5 pb-1 text-[10px] font-mono text-white focus:border-blue-500/50 outline-none transition-all uppercase truncate {isSmallWidth ? 'pl-2 pr-6' : 'pl-2.5 pr-7'}"
							spellcheck="false"
					/>
					<button
							onclick={() => copy(hexColor, 'hex')}
							class="absolute right-0 top-0 bottom-0 flex items-center justify-center text-neutral-500 hover:text-white transition-colors {isSmallWidth ? 'px-1.5' : 'px-2.5'}"
							title="Kopieren"
					>
						{#if copiedHex}<Check size={11} class="text-emerald-400" />{:else}<Copy size={11} />{/if}
					</button>
				</div>
			</div>

			<div class="relative min-w-0">
				<span class="absolute top-1 text-[7px] font-black text-neutral-500 uppercase tracking-widest leading-none z-10 pointer-events-none {isSmallWidth ? 'left-2' : 'left-2.5'}">RGB</span>
				<div class="relative flex items-center">
					<input
							type="text"
							value={displayRgb}
							oninput={(e) => updateColor(e.currentTarget.value)}
							class="w-full bg-black/20 border border-white/5 rounded-lg pt-3.5 pb-1 text-[10px] font-mono text-white focus:border-blue-500/50 outline-none transition-all truncate {isSmallWidth ? 'pl-2 pr-6' : 'pl-2.5 pr-7'}"
							spellcheck="false"
					/>
					<button
							onclick={() => copy(rgbColor, 'rgb')}
							class="absolute right-0 top-0 bottom-0 flex items-center justify-center text-neutral-500 hover:text-white transition-colors {isSmallWidth ? 'px-1.5' : 'px-2.5'}"
							title="Kopieren"
					>
						{#if copiedRgb}<Check size={11} class="text-emerald-400" />{:else}<Copy size={11} />{/if}
					</button>
				</div>
			</div>

		</div>
	</div>
</WidgetCard>
