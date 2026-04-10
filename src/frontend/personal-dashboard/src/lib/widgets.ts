import Searchbar from "$lib/widgets/Searchbar.svelte";
import Favorites from "$lib/widgets/Favorites.svelte";
import Note from "$lib/widgets/Note.svelte";
import Parcel from "$lib/widgets/Parcel.svelte";
import Trmnl from "$lib/widgets/Trmnl.svelte";
import ClockWeatherDate from "$lib/widgets/ClockWeatherDate.svelte";
import Embed from "$lib/widgets/Embed.svelte";
import TimerStopwatch from "$lib/widgets/TimerStopwatch.svelte";


export const widgets  = {
	searchbar: { component: Searchbar, defaultSize: { width: 3, height: 2 } },
	favorites: { component: Favorites, defaultSize: { width: 3, height: 4 } },
	note:			 { component: Note, defaultSize: { width: 1, height: 5 }},
	parcel:    { component: Parcel, defaultSize: { width: 1, height: 5 } },
	trmnl:     { component: Trmnl, defaultSize: { width: 3, height: 7 } },
	clockWeatherDate: { component: ClockWeatherDate, defaultSize: { width: 2, height: 1 } },
	embed: { component: Embed, defaultSize: { width: 3, height: 7 } },
	TimerStopwatch: { component: TimerStopwatch, defaultSize: { width: 4, height: 4 } },
}
