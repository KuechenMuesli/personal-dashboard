import Searchbar from "$lib/widgets/Searchbar.svelte";
import type {Widget} from "../types/widget";
import Favorites from "$lib/widgets/Favorites.svelte";


export const widgets: {searchbar: Widget}  = {
	searchbar: { component: Searchbar, defaultSize: { width: 3, height: 2 } },
	favorites: { component: Favorites, defaultSize: { width: 3, height: 4 } },
}
