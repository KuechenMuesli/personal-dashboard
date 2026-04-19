<script lang="ts">
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";

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

  type Habit = {
    id: string;
    name: string;
    color: string;
    completions: string[];
    created: string;
  };

  let habits = $state<Habit[]>([]);
  let dialogEl = $state<HTMLDialogElement | null>(null);
  let expandedHabitId = $state<string | null>(null);

  // Settings form
  let editingId = $state<string | null>(null);
  let newHabitName = $state("");
  let newHabitColor = $state("#10b981");

  const THEMES = [
    "#10b981", // Emerald
    "#3b82f6", // Blue
    "#8b5cf6", // Purple
    "#f43f5e", // Rose
    "#f59e0b", // Amber
    "#06b6d4", // Cyan
  ];

  const isCompact = $derived(height <= 2);
  const isLarge = $derived(height >= 4);

  $effect(() => {
    hidden = false;
  });

  onMount(() => {
    const saved = localStorage.getItem(`habits-widget-${id}`);
    if (saved) {
      try {
        habits = JSON.parse(saved);
      } catch (e) {}
    }

    if (habits.length === 0) {
      const today = getLocalIsoDate(new Date());
      const yesterday = getLocalIsoDate(new Date(Date.now() - 86400000));
      habits = [
        { id: crypto.randomUUID(), name: "Read 10 Pages", color: "#10b981", completions: [today], created: yesterday },
        { id: crypto.randomUUID(), name: "Drink Water", color: "#3b82f6", completions: [today, yesterday], created: yesterday },
      ];
      saveData();
    }
  });

  function saveData() {
    localStorage.setItem(`habits-widget-${id}`, JSON.stringify(habits));
  }

  function getLocalIsoDate(d: Date) {
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
  }

  const pastDays = $derived.by(() => {
    const days = [];
    const numDays = isCompact ? 5 : 7;
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        date: getLocalIsoDate(d),
        label: i === 0 ? 'T' : d.toLocaleDateString([], { weekday: 'narrow' })
      });
    }
    return days;
  });

  function toggleHabit(habitId: string, dateStr: string) {
    const hIdx = habits.findIndex(h => h.id === habitId);
    if (hIdx === -1) return;

    const habit = habits[hIdx];
    const cIdx = habit.completions.indexOf(dateStr);

    if (cIdx === -1) {
      habit.completions.push(dateStr);
    } else {
      habit.completions.splice(cIdx, 1);
    }

    habits[hIdx] = { ...habit };
    saveData();
  }

  // --- Stats Logic ---
  function getStats(habit: Habit) {
    if (!habit.completions.length) return { current: 0, best: 0, total: 0 };

    const days = habit.completions.map(d => Math.floor(new Date(d).getTime() / 86400000)).sort((a,b)=>a-b);
    let best = 1;
    let currentTemp = 1;

    for (let i = 1; i < days.length; i++) {
      if (days[i] === days[i-1] + 1) {
        currentTemp++;
        best = Math.max(best, currentTemp);
      } else if (days[i] !== days[i-1]) {
        currentTemp = 1;
      }
    }

    let currentStreak = 0;
    let d = new Date();
    let todayStr = getLocalIsoDate(d);

    if (!habit.completions.includes(todayStr)) {
      d.setDate(d.getDate() - 1);
      let yestStr = getLocalIsoDate(d);
      if (habit.completions.includes(yestStr)) {
        currentStreak = countBackwards(habit.completions, d);
      }
    } else {
      currentStreak = countBackwards(habit.completions, d);
    }

    return { current: currentStreak, best: Math.max(best, currentStreak), total: habit.completions.length };
  }

  function countBackwards(comps: string[], startDate: Date) {
    let count = 0;
    let d = new Date(startDate);
    while(true) {
      if (comps.includes(getLocalIsoDate(d))) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }

  // --- Settings Form Logic ---
  function saveHabitForm() {
    if (!newHabitName.trim()) return;

    if (editingId) {
      const idx = habits.findIndex(h => h.id === editingId);
      if (idx !== -1) {
        habits[idx].name = newHabitName.trim();
        habits[idx].color = newHabitColor;
      }
    } else {
      habits = [...habits, {
        id: crypto.randomUUID(),
        name: newHabitName.trim(),
        color: newHabitColor,
        completions: [],
        created: getLocalIsoDate(new Date())
      }];
    }
    resetForm();
    saveData();
  }

  function editHabit(habit: Habit) {
    editingId = habit.id;
    newHabitName = habit.name;
    newHabitColor = habit.color;
  }

  function deleteHabit(habitId: string) {
    if (confirm("Delete this habit and all its history?")) {
      habits = habits.filter(h => h.id !== habitId);
      if (editingId === habitId) resetForm();
      saveData();
    }
  }

  function resetForm() {
    editingId = null;
    newHabitName = "";
    newHabitColor = THEMES[0];
  }

  $effect(() => {
    if (showSettings && dialogEl) {
      dialogEl.showModal();
    } else if (dialogEl?.open) {
      dialogEl.close();
      resetForm();
    }
  });
</script>

<div class="flex flex-col h-full w-full bg-neutral-800 font-sans text-white p-3 overflow-hidden transition-colors hover:bg-neutral-800/80">

	<header class="flex shrink-0 items-center justify-between mb-3 border-b border-white/10 pb-1.5">
		<h2 class="text-[10px] font-black uppercase tracking-widest text-neutral-500">
			Habits
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

	<div class="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent pr-1 space-y-2">
		{#if habits.length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center pb-4 text-neutral-500">
				<span class="text-2xl mb-2 opacity-50">🌱</span>
				<p class="text-xs font-medium">No habits tracked.</p>
				<button
						onclick={() => showSettings = true}
						class="mt-3 rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-black/20 text-neutral-400 hover:text-white border border-white/5 transition-colors"
				>
					Add Habit
				</button>
			</div>
		{:else}

			<div class="flex justify-end pr-[2px]">
				<div class="flex gap-1">
					{#each pastDays as day}
						<div class="w-6 text-center text-[9px] font-bold {day.label === 'T' ? 'text-white' : 'text-neutral-600'}">
							{day.label}
						</div>
					{/each}
				</div>
			</div>

			{#each habits as habit (habit.id)}
				{@const stats = getStats(habit)}
				<div class="flex flex-col rounded-lg bg-neutral-900/30 border border-transparent hover:border-white/5 transition-colors overflow-hidden">

					<div class="flex items-center justify-between p-1.5">
						<button
								class="flex flex-col min-w-0 pr-2 pl-1 flex-1 text-left outline-none cursor-pointer group"
								onclick={() => expandedHabitId = expandedHabitId === habit.id ? null : habit.id}
						>
							<div class="flex items-center gap-1.5">
								<span class="truncate text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{habit.name}</span>
								<span class="text-[8px] text-neutral-600 transition-transform duration-200 {expandedHabitId === habit.id ? 'rotate-180' : ''}">▼</span>
							</div>
							{#if isLarge && expandedHabitId !== habit.id}
                <span class="text-[9px] font-medium mt-0.5 {stats.current >= 3 ? 'text-orange-400' : 'text-neutral-500'}">
                  {stats.current} {stats.current === 1 ? 'day' : 'days'} streak
									{#if stats.current >= 3}🔥{/if}
                </span>
							{/if}
						</button>

						<div class="flex gap-1 shrink-0">
							{#each pastDays as day}
								{@const isDone = habit.completions.includes(day.date)}
								<button
										onclick={() => toggleHabit(habit.id, day.date)}
										class="w-6 h-6 rounded-md transition-all duration-200 flex items-center justify-center outline-none hover:scale-110 active:scale-90"
										style="
                    background-color: {isDone ? habit.color : 'rgba(255,255,255,0.05)'};
                    box-shadow: {isDone ? `0 0 10px ${habit.color}40` : 'none'};
                  "
										title={day.date}
								>
									{#if isDone}
										<svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									{/if}
								</button>
							{/each}
						</div>
					</div>

					{#if expandedHabitId === habit.id}
						<div transition:slide={{ duration: 200 }} class="px-2 pb-2 pt-1">
							<div class="flex items-center justify-around bg-black/20 rounded-md p-2 border border-white/5">
								<div class="flex flex-col items-center">
									<span class="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Current</span>
									<span class="text-xs font-black text-white flex items-center gap-1">
                    {stats.current} <span class="text-[10px]">🔥</span>
                  </span>
								</div>
								<div class="w-px h-6 bg-white/10"></div>
								<div class="flex flex-col items-center">
									<span class="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Best</span>
									<span class="text-xs font-black text-white flex items-center gap-1">
                    {stats.best} <span class="text-[10px]">🏆</span>
                  </span>
								</div>
								<div class="w-px h-6 bg-white/10"></div>
								<div class="flex flex-col items-center">
									<span class="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Total</span>
									<span class="text-xs font-black text-white flex items-center gap-1">
                    {stats.total} <span class="text-[10px]">⭐</span>
                  </span>
								</div>
							</div>
						</div>
					{/if}

				</div>
			{/each}
		{/if}
	</div>
</div>

<dialog
		bind:this={dialogEl}
		class="fixed left-1/2 top-1/2 m-0 w-[90vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-800 bg-neutral-900 p-0 text-white shadow-2xl outline-none backdrop:bg-black/80 backdrop:backdrop-blur-sm"
		onclose={() => (showSettings = false)}
>
	<div class="flex flex-col gap-5 p-6 max-h-[85vh]">
		<header class="flex items-center justify-between shrink-0">
			<h3 class="text-lg font-bold">Habit Configuration</h3>
			<button class="text-2xl text-neutral-500 hover:text-white leading-none outline-none" onclick={() => (showSettings = false)}>&times;</button>
		</header>

		<div class="flex-grow overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent pr-2">

			<div class="space-y-3 bg-neutral-800/50 p-4 rounded-xl border {editingId ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-white/5'}">
				<div class="flex justify-between items-center">
					<label class="block text-[10px] uppercase font-black {editingId ? 'text-blue-400' : 'text-neutral-500'} tracking-widest">
						{editingId ? 'Edit Habit' : 'Create New Habit'}
					</label>
					{#if editingId}
						<button onclick={resetForm} class="text-[10px] font-bold text-neutral-400 hover:text-white uppercase tracking-wider">Cancel Edit</button>
					{/if}
				</div>

				<input
						bind:value={newHabitName}
						onkeydown={(e) => { if (e.key === 'Enter') saveHabitForm(); }}
						placeholder="e.g. Meditate for 10 min"
						class="w-full rounded-lg border border-neutral-700 bg-neutral-900 p-2.5 text-sm text-white outline-none focus:border-blue-500"
				/>

				<div class="flex items-center justify-between mt-2">
					<div class="flex gap-2">
						{#each THEMES as hex}
							<button
									class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 {newHabitColor === hex ? 'scale-110 ring-2 ring-white/20' : 'border-transparent'}"
									style="background-color: {hex}; border-color: {newHabitColor === hex ? 'white' : 'transparent'};"
									onclick={() => newHabitColor = hex}
							></button>
						{/each}
					</div>
					<button
							onclick={saveHabitForm}
							disabled={!newHabitName.trim()}
							class="rounded bg-blue-600 px-4 py-1.5 text-[11px] font-bold text-white transition-opacity hover:bg-blue-500 disabled:opacity-50"
					>
						{editingId ? 'Update' : 'Add'}
					</button>
				</div>
			</div>

			<div class="space-y-2">
				<label class="block text-[10px] uppercase font-black text-neutral-500 tracking-widest">Manage Habits</label>
				{#if habits.length === 0}
					<p class="text-xs text-neutral-500 italic">No habits added yet.</p>
				{:else}
					<div class="flex flex-col gap-2">
						{#each habits as habit}
							<div class="flex items-center justify-between gap-3 rounded-lg bg-neutral-800/50 p-2.5 border border-white/5 {editingId === habit.id ? 'ring-1 ring-blue-500/50' : ''}">
								<div class="flex items-center gap-2 overflow-hidden">
									<div class="w-3 h-3 rounded-full shrink-0" style="background-color: {habit.color}"></div>
									<span class="font-bold text-sm truncate text-white">{habit.name}</span>
								</div>
								<div class="flex gap-1 shrink-0">
									<button
											onclick={() => editHabit(habit)}
											class="h-7 w-7 flex items-center justify-center rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
											title="Edit Habit"
									>✎</button>
									<button
											onclick={() => deleteHabit(habit.id)}
											class="h-7 w-7 flex items-center justify-center rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
											title="Delete Habit"
									>×</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

		</div>

		<footer class="flex justify-end gap-2 shrink-0 border-t border-neutral-800 pt-4 mt-2">
			<button class="w-full rounded-lg bg-neutral-800 px-6 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 transition-colors border border-white/5" onclick={() => (showSettings = false)}>Done</button>
		</footer>
	</div>
</dialog>
