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

  // --- REORDERING LOGIC ---
  function move(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= favorites.length) return;

    // Swap the elements
    const item = favorites[index];
    favorites.splice(index, 1);
    favorites.splice(newIndex, 0, item);
  }
</script>

<div class="favorites-container">
	{#each favorites as fav}
		<a href={fav.url} class="fav-item" title={fav.name}>
			<div class="icon-tile" style="background-color: {fav.color}">
				{#if !failedImages.has(fav.url)}
					<img
							src={getIcon(fav.url)}
							alt=""
							onerror={() => handleImageError(fav.url)}
					/>
				{/if}
				<span class="initial">{fav.name.charAt(0)}</span>
			</div>
			<span class="label">{fav.name}</span>
		</a>
	{/each}
</div>

<dialog bind:this={dialogEl} class="centered-dialog" onclose={() => showSettings = false}>
	<div class="settings-wrapper">
		<header>
			<h3>Edit Favorites</h3>
			<button class="add-btn" onclick={() => favorites.push({name: '', url: '', color: '#3f3f46'})}>+ Add</button>
		</header>

		<div class="favorites-scroll">
			{#each favorites as fav, i}
				<div class="edit-row">
					<div class="order-btns">
						<button disabled={i === 0} onclick={() => move(i, 'up')}>▴</button>
						<button disabled={i === favorites.length - 1} onclick={() => move(i, 'down')}>▾</button>
					</div>

					<input type="color" bind:value={fav.color} class="color-picker" />
					<input type="text" bind:value={fav.name} placeholder="Name" class="name-in" />
					<input type="text" bind:value={fav.url} placeholder="URL" class="url-in" />
					<button class="del-btn" onclick={() => favorites.splice(i, 1)}>×</button>
				</div>
			{/each}
		</div>

		<footer class="actions">
			<button class="cancel" onclick={() => showSettings = false}>Cancel</button>
			<button class="save" onclick={saveSettings}>Save Changes</button>
		</footer>
	</div>
</dialog>

<style>
  /* ... existing styles ... */
  .favorites-container {
    display: flex; flex-wrap: wrap; justify-content: center; align-content: center;
    gap: 16px; padding: 10px; height: 100%; overflow-y: auto; box-sizing: border-box;
  }

  .fav-item {
    display: flex; flex-direction: column; align-items: center;
    gap: 6px; text-decoration: none; width: 70px; transition: transform 0.1s; flex-grow: 0;
  }
  .fav-item:hover { transform: scale(1.05); }

  .icon-tile {
    width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center;
    justify-content: center; position: relative; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  }
  .icon-tile img { width: 32px; height: 32px; z-index: 2; object-fit: contain; }
  .initial { position: absolute; color: white; font-size: 24px; font-weight: bold; z-index: 1; text-transform: uppercase; }
  .label { color: #94a3b8; font-size: 11px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }

  .centered-dialog {
    border: none; padding: 0; border-radius: 16px; background: #1a1a1a; color: white;
    width: 95vw; max-width: 550px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0;
  }
  .centered-dialog::backdrop { background: rgba(0,0,0,0.85); backdrop-filter: blur(4px); }
  .settings-wrapper { padding: 24px; }
  header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }

  .favorites-scroll { max-height: 350px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 5px; }
  .edit-row { display: flex; gap: 8px; align-items: center; }

  /* New Reorder Styles */
  .order-btns { display: flex; flex-direction: column; gap: 0; }
  .order-btns button {
    background: #262626; border: 1px solid #3f3f3f; color: #94a3b8;
    line-height: 1; font-size: 12px; cursor: pointer; padding: 2px 6px;
  }
  .order-btns button:first-child { border-radius: 4px 4px 0 0; }
  .order-btns button:last-child { border-radius: 0 0 4px 4px; border-top: none; }
  .order-btns button:disabled { opacity: 0.2; cursor: default; }
  .order-btns button:hover:not(:disabled) { background: #3f3f3f; color: white; }

  .color-picker { width: 30px; height: 30px; padding: 0; border: none; background: none; cursor: pointer; flex-shrink: 0; }
  .name-in { width: 90px; background: #262626; border: 1px solid #3f3f3f; color: white; border-radius: 4px; padding: 6px; }
  .url-in { flex: 1; background: #262626; border: 1px solid #3f3f3f; color: white; border-radius: 4px; padding: 6px; }

  .del-btn { background: none; border: none; color: #ef4444; font-size: 20px; cursor: pointer; padding: 0 5px; }
  .add-btn { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; }
  .actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; border-top: 1px solid #333; padding-top: 16px; }
  .cancel { background: transparent; border: 1px solid #333; color: #737373; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
  .save { background: #059669; color: white; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; }
</style>
