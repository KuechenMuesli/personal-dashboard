<script lang="ts">
  let { id, isEditing, showSettings = $bindable(false) } = $props<{
    id: string, isEditing: boolean, showSettings: boolean
  }>();

  interface Favorite {
    name: string;
    url: string;
    color: string;
  }

  const DEFAULT_FAVORITES: Favorite[] = [
    { name: "Reddit", url: "https://reddit.com", color: "#FF4500" },
    { name: "GitHub", url: "https://github.com", color: "#181717" },
    { name: "YouTube", url: "https://youtube.com", color: "#FF0000" }
  ];

  let favorites = $state<Favorite[]>([]);
  let dialogEl: HTMLDialogElement;
  let failedImages = $state(new Set<string>());

  $effect(() => {
    if (!favorites.length) {
      const saved = localStorage.getItem(`favorites-settings-${id}`);
      favorites = saved ? JSON.parse(saved) : [...DEFAULT_FAVORITES];
    }
  });

  $effect(() => {
    if (showSettings) dialogEl?.showModal();
    else dialogEl?.close();
  });

  function saveSettings() {
    localStorage.setItem(`favorites-settings-${id}`, JSON.stringify(favorites));
    showSettings = false;
  }

  function getIcon(url: string) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
    } catch {
      return "";
    }
  }

  function handleImageError(url: string) {
    failedImages.add(url);
  }

  function move(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= favorites.length) return;
    const item = favorites[index];
    favorites.splice(index, 1);
    favorites.splice(newIndex, 0, item);
  }
</script>

<div class="flex h-full flex-wrap items-center justify-center gap-4 overflow-y-auto p-2.5 box-border">
	{#each favorites as fav}
		<a
				href={fav.url}
				class="group flex w-[70px] flex-col items-center gap-1.5 no-underline transition-transform duration-100 hover:scale-105"
				title={fav.name}
		>
			<div
					class="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[14px] shadow-lg shadow-black/30"
					style="background-color: {fav.color}"
			>
				{#if !failedImages.has(fav.url)}
					<img
							src={getIcon(fav.url)}
							alt=""
							class="relative z-10 h-8 w-8 object-contain"
							onerror={() => handleImageError(fav.url)}
					/>
				{/if}
				<span class="absolute z-0 text-2xl font-bold uppercase text-white opacity-40 group-hover:opacity-100 transition-opacity">
          {fav.name.charAt(0)}
        </span>
			</div>
			<span class="w-full truncate text-center text-[11px] text-slate-400">
        {fav.name}
      </span>
		</a>
	{/each}
</div>

<dialog
		bind:this={dialogEl}
		class="fixed left-1/2 top-1/2 m-0 w-[95vw] max-w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-none bg-neutral-900 p-0 text-white outline-none backdrop:bg-black/85 backdrop:backdrop-blur-sm"
		onclose={() => showSettings = false}
>
	<div class="p-6">
		<header class="mb-5 flex items-center justify-between">
			<h3 class="text-lg font-semibold">Edit Favorites</h3>
			<button
					class="rounded-md bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
					onclick={() => favorites.push({name: '', url: '', color: '#3f3f46'})}
			>
				+ Add
			</button>
		</header>

		<div class="flex max-h-[350px] flex-col gap-2.5 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-neutral-700">
			{#each favorites as fav, i}
				<div class="flex items-center gap-2">
					<div class="flex flex-col">
						<button
								disabled={i === 0}
								onclick={() => move(i, 'up')}
								class="rounded-t border border-neutral-700 bg-neutral-800 px-1.5 text-[10px] leading-none text-slate-400 hover:not-disabled:bg-neutral-700 hover:not-disabled:text-white disabled:opacity-20"
						>
							▴
						</button>
						<button
								disabled={i === favorites.length - 1}
								onclick={() => move(i, 'down')}
								class="-mt-px rounded-b border border-neutral-700 bg-neutral-800 px-1.5 text-[10px] leading-none text-slate-400 hover:not-disabled:bg-neutral-700 hover:not-disabled:text-white disabled:opacity-20"
						>
							▾
						</button>
					</div>

					<input type="color" bind:value={fav.color} class="h-8 w-8 shrink-0 cursor-pointer border-none bg-transparent p-0" />

					<input
							type="text"
							bind:value={fav.name}
							placeholder="Name"
							class="w-[90px] rounded border border-neutral-700 bg-neutral-800 p-1.5 text-sm text-white outline-none focus:border-blue-500"
					/>

					<input
							type="text"
							bind:value={fav.url}
							placeholder="URL"
							class="flex-1 rounded border border-neutral-700 bg-neutral-800 p-1.5 text-sm text-white outline-none focus:border-blue-500"
					/>

					<button
							class="px-1 text-xl text-red-500 transition-colors hover:text-red-400"
							onclick={() => favorites.splice(i, 1)}
					>
						×
					</button>
				</div>
			{/each}
		</div>

		<footer class="mt-6 flex justify-end gap-3 border-t border-neutral-800 pt-4">
			<button
					class="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-800 transition-colors"
					onclick={() => showSettings = false}
			>
				Cancel
			</button>
			<button
					class="rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
					onclick={saveSettings}
			>
				Save Changes
			</button>
		</footer>
	</div>
</dialog>
