import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
	// EmDash content is dynamic: pages are server-rendered per request and
	// held fast by the edge cache below, not by static generation.
	output: "server",
	adapter: cloudflare(),

	image: {
		layout: "constrained",
		responsiveStyles: true,
	},

	integrations: [
		// React powers the EmDash admin at /_emdash/admin only.
		// No React island may be used on a public route — see AGENTS.md.
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
		}),
	],

	// Inter is the only family in the design. Self-hosted and preloaded by
	// Astro's font pipeline; the weights match those measured on the original.
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-sans",
			weights: [400, 500, 600, 700],
			styles: ["normal"],
			subsets: ["latin"],
			fallbacks: ["system-ui", "sans-serif"],
		},
	],

	// Workers Cache sits in front of the Worker: a cache hit is served at the
	// edge without invoking it, which protects the free-plan request budget
	// and the D1 row-read budget as well as improving response times.
	cache: {
		provider: cacheCloudflare(),
	},
	routeRules: {
		"/": { maxAge: 300, swr: 86400 },
		"/about": { maxAge: 300, swr: 86400 },
		"/all-projects": { maxAge: 300, swr: 86400 },
		"/contact": { maxAge: 300, swr: 86400 },
		"/project-details/[slug]": { maxAge: 300, swr: 86400 },
		"/legal/[slug]": { maxAge: 3600, swr: 86400 },
		"/rss.xml": { maxAge: 3600, swr: 86400 },
	},

	vite: {
		plugins: [tailwindcss()],
	},

	devToolbar: { enabled: false },
});
