import Searchbar from "$lib/widgets/Searchbar.svelte";
import Favorites from "$lib/widgets/Favorites.svelte";
import Note from "$lib/widgets/Note.svelte";
import Parcel from "$lib/widgets/Parcel.svelte";
import Trmnl from "$lib/widgets/Trmnl.svelte";


export const widgets  = {
	searchbar: { component: Searchbar, defaultSize: { width: 3, height: 2 } },
	favorites: { component: Favorites, defaultSize: { width: 3, height: 4 } },
	note:			 { component: Note, defaultSize: { width: 1, height: 5 }},
	parcel:    { component: Parcel, defaultSize: { width: 1, height: 5 } },
	trmnl:     { component: Trmnl, defaultSize: { width: 3, height: 7 } },
}
