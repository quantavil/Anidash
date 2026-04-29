// ─── External streaming site definitions ───
// Each site has a name, color, and search URL builder.

export interface ExternalSite {
	name: string;
	/** Brand color for hover glow */
	color: string;
	/** Ordered list of domains, primary first */
	domains: string[];
	/** Get favicon URL from domain */
	iconUrl: (domain: string) => string;
	/** Build search URL from domain and anime title */
	searchUrl: (domain: string, title: string) => string;
}

const encode = (t: string) => encodeURIComponent(t);

export const EXTERNAL_SITES: ExternalSite[] = [
	{
		name: 'Miruro',
		color: '#c084fc',
		domains: ['miruro.tv', 'miruro.online', 'miruro.bz'],
		iconUrl: (domain) => `https://www.${domain}/favicon.ico`,
		searchUrl: (domain, title) => `https://www.${domain}/search?query=${encode(title)}`
	},
	{
		name: 'AnimeKai',
		color: '#60a5fa',
		domains: ['animekai.to', 'animekai.fi', 'animekai.la', 'animekai.gs', 'animekai.fo', 'anikai.to'],
		iconUrl: (domain) => `https://${domain}/favicon.ico`,
		searchUrl: (domain, title) => `https://${domain}/browser?keyword=${encode(title)}`
	},
	{
		name: 'Anikoto',
		color: '#f472b6',
		domains: ['anikototv.to'],
		iconUrl: (domain) => `https://${domain}/favicon.ico`,
		searchUrl: (domain, title) => `https://${domain}/filter?keyword=${encode(title)}`
	},
	{
		name: 'Kaa',
		color: '#34d399',
		domains: ['kaa.lt'],
		iconUrl: (domain) => `https://${domain}/favicon.ico`,
		searchUrl: (domain, title) => `https://${domain}/search?q=${encode(title)}`
	}
];
