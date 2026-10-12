# Changelog

All notable changes to Portfolica are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project scaffold on Astro 7 + EmDash 1.2 targeting Cloudflare Workers, D1 and R2.
- Design token system in `src/styles/tokens.css`, measured from the original
  Portfolica design, bridged into Tailwind v4 via `@theme` in `global.css`.
- `src/styles/theme.css` as the supported override surface.
- Base layout with SEO metadata, Open Graph, JSON-LD, Inter via Astro's font
  pipeline, a skip link and an accessible focus ring.
- Site header and footer, both fully CMS-driven.
- Content model and demo content as a committed seed (`seed/seed.json`):
  projects, pages, services, experience, process steps, stats, testimonials,
  FAQs, skills and site options.
- Centralised content queries in `src/lib/queries.ts` with edge cache-hint
  handling.
- RSS feed at `/rss.xml` and a CMS-editable 404 page.
