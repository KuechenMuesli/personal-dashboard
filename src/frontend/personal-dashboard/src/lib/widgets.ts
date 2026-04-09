import Searchbar from "$lib/widgets/Searchbar.svelte";
import type {Widget} from "../types/widget";


export const widgets: {searchbar: Widget}  = {
	searchbar: { component: Searchbar, defaultSize: { width: 3, height: 2 } },
}
