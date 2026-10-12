/**
 * Every CMS read in this template goes through this file.
 *
 * Why: content queries return a `cacheHint` that must be registered with
 * `Astro.cache` for edge caching to work. Centralising the reads keeps that
 * handling in one place instead of repeating — and eventually forgetting — it
 * in every route.
 *
 * To add a new collection, add a function here and call it from the page.
 * Do not call `getEmDashCollection` directly from a component.
 */

import type { AstroGlobal } from "astro";
import { getEmDashCollection, getEmDashEntry } from "emdash";

/** Exactly what `Astro.cache.set()` accepts, taken from Astro's own types. */
type CacheInput = Parameters<NonNullable<AstroGlobal["cache"]>["set"]>[0];

/** Register one or more cache hints, when route caching is enabled. */
export function useCacheHint(
	Astro: Pick<AstroGlobal, "cache">,
	...hints: Array<CacheInput | undefined | null>
): void {
	if (!Astro.cache?.enabled) return;
	for (const hint of hints) {
		if (hint) Astro.cache.set(hint);
	}
}

/** Collections that follow the ordered-section convention. */
type SectionCollection =
	| "services"
	| "experience"
	| "process_steps"
	| "stats"
	| "testimonials"
	| "faqs"
	| "skills"
	| "site_options";

/**
 * Read an ordered, published list from a section collection.
 * Every section collection shares the `sort_order` convention.
 */
export async function getSection<T extends SectionCollection>(
	collection: T,
	limit = 100,
) {
	const { entries, error, cacheHint } = await getEmDashCollection(collection, {
		orderBy: { sort_order: "asc" },
		limit,
	});

	if (error) {
		console.error(`[portfolica] failed to load "${collection}":`, error);
		return { items: [], cacheHint };
	}

	return { items: entries, cacheHint };
}

/**
 * Site options is a single-entry collection holding the global values that
 * EmDash's built-in site settings cannot express — extended socials, the hero
 * copy, the contact address.
 */
export async function getSiteOptions() {
	const { items, cacheHint } = await getSection("site_options", 1);
	return { options: items[0]?.data ?? null, cacheHint };
}

/** Projects for the homepage grid (featured only) or the full archive. */
export async function getProjects(opts: { featuredOnly?: boolean; limit?: number } = {}) {
	const { entries, error, cacheHint } = await getEmDashCollection("projects", {
		orderBy: { sort_order: "asc" },
		limit: opts.limit ?? 50,
	});

	if (error) {
		console.error("[portfolica] failed to load projects:", error);
		return { projects: [], cacheHint };
	}

	const projects = opts.featuredOnly
		? entries.filter((entry) => entry.data.featured !== false)
		: entries;

	return { projects, cacheHint };
}

/** A single project by slug, for `/project-details/[slug]`. */
export async function getProject(slug: string) {
	return getEmDashEntry("projects", slug);
}

/** A single CMS page by slug — About and the legal pages. */
export async function getPage(slug: string) {
	return getEmDashEntry("pages", slug);
}
