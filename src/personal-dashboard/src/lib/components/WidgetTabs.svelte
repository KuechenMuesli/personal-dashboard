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
    class="ds-segment-item {fullWidth ? 'flex-1 text-center' : ''}"
    aria-pressed={selected === option.value}
    onclick={() => selectOption(option.value)}
  >
    {option.label}
  </button>
{/each}
