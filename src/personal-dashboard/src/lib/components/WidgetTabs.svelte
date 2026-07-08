<script lang="ts">
  let {
    options,
    selected = $bindable(),
    onChange,
    fullWidth = false
  }: {
    options: { value: string; label: string }[];
    selected: string;
    onChange?: () => void;
    fullWidth?: boolean;
  } = $props();

  function selectOption(val: string) {
    selected = val;
    if (onChange) onChange();
  }
</script>

{#each options as option}
  <button
    class="rounded px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors {fullWidth ? 'flex-1 text-center' : ''} {selected === option.value ? 'bg-white/10 text-slate-200 shadow-sm' : 'text-neutral-500 hover:text-white'}"
    onclick={() => selectOption(option.value)}
  >
    {option.label}
  </button>
{/each}
