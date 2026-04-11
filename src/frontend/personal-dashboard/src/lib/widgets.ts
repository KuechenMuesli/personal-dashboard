import Searchbar from "$lib/widgets/Searchbar.svelte";
import Favorites from "$lib/widgets/Favorites.svelte";
import Note from "$lib/widgets/Note.svelte";
import Parcel from "$lib/widgets/Parcel.svelte";
import Trmnl from "$lib/widgets/Trmnl.svelte";
import ClockWeatherDate from "$lib/widgets/ClockWeatherDate.svelte";
import Embed from "$lib/widgets/Embed.svelte";
import TimerStopwatch from "$lib/widgets/TimerStopwatch.svelte";
import Sketch from "$lib/widgets/Sketch.svelte";


export const widgets  = {
	searchbar: 				{ component: Searchbar, defaultSize: { width: 2, height: 2 } },
	favorites: 				{ component: Favorites, defaultSize: { width: 2, height: 4 } },
	note:			 				{ component: Note, defaultSize: { width: 1, height: 4 }},
	parcel:    				{ component: Parcel, defaultSize: { width: 1, height: 5 } },
	trmnl:     				{ component: Trmnl, defaultSize: { width: 2, height: 5 } },
	clockWeatherDate: { component: ClockWeatherDate, defaultSize: { width: 2, height: 1 } },
	embed: 						{ component: Embed, defaultSize: { width: 3, height: 5 } },
	TimerStopwatch: 	{ component: TimerStopwatch, defaultSize: { width: 1, height: 3 } },
	sketch:						{ component: Sketch, defaultSize: { width: 3, height: 5 } },
}
