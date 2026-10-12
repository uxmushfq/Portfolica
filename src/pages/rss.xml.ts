import type { APIRoute } from "astro";
import { getEmDashCollection, getSiteSettings } from "emdash";

const XML_ESCAPES: ReadonlyArray<readonly [RegExp, string]> = [
	[/&/g, "&amp;"],
	[/</g, "&lt;"],
	[/>/g, "&gt;"],
	[/"/g, "&quot;"],
	[/'/g, "&apos;"],
];

function escapeXml(value: string): string {
	let result = value;
	for (const [pattern, replacement] of XML_ESCAPES) {
		result = result.replace(pattern, replacement);
	}
	return result;
}

export const GET: APIRoute = async ({ site, url }) => {
	const siteUrl = (site?.toString() || url.origin).replace(/\/$/, "");
	const settings = await getSiteSettings();
	const title = settings?.title || "Portfolica";
	const description = settings?.tagline || "";

	const { entries: projects } = await getEmDashCollection("projects", {
		orderBy: { sort_order: "asc" },
		limit: 50,
	});

	const items = projects
		.map((project: any) => {
			const link = `${siteUrl}/project-details/${project.id}`;
			const pubDate = project.data.publishedAt
				? `\n      <pubDate>${project.data.publishedAt.toUTCString()}</pubDate>`
				: "";

			return `    <item>
      <title>${escapeXml(project.data.title || "Untitled")}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>${pubDate}
      <description>${escapeXml(project.data.summary || "")}</description>
    </item>`;
		})
		.join("\n");

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

	return new Response(rss, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			// Explicit, because Workers Cache applies heuristic freshness to
			// any 200 without a Cache-Control header.
			"Cache-Control": "public, max-age=3600",
		},
	});
};
