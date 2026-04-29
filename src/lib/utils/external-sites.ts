// ─── External streaming site definitions ───
// Each site has a name, color, and search URL builder.

export interface ExternalSite {
	name: string;
	/** Short label for compact display */
	label: string;
	/** Brand color for the icon pill */
	color: string;
	/** Favicon URL */
	icon: string;
	/** Build search URL from anime title */
	searchUrl: (title: string) => string;
}

const encode = (t: string) => encodeURIComponent(t);

export const EXTERNAL_SITES: ExternalSite[] = [
	{
		name: 'Miruro',
		label: 'Miruro',
		color: '#c084fc',
		icon: 'https://www.miruro.tv/favicon.ico',
		searchUrl: (title) => `https://www.miruro.tv/search?query=${encode(title)}`
	},
	{
		name: 'AnimeKai',
		label: 'AnimeKai',
		color: '#60a5fa',
		icon: 'https://animekai.to/favicon.ico',
		searchUrl: (title) => `https://animekai.to/browser?keyword=${encode(title)}`
	},
	{
		name: 'Anikoto',
		label: 'Anikoto',
		color: '#f472b6',
		icon: 'https://anikototv.to/favicon.ico',
		searchUrl: (title) => `https://anikototv.to/filter?keyword=${encode(title)}`
	},
	{
		name: 'Kaa',
		label: 'Kaa',
		color: '#34d399',
		icon: 'https://kaa.lt/favicon.ico',
		searchUrl: (title) => `https://kaa.lt/search?q=${encode(title)}`
	}
];
