# Portfolica — guide for AI agents

> Phase 2 scaffold. This file gets its full treatment in Phase 6; what is here
> is accurate today.

Portfolica is a personal portfolio template: **Astro 7 + EmDash CMS 1.2**,
deployed to **Cloudflare Workers** with **D1** (database) and **R2** (media).

## Commands

```bash
npm run dev          # dev server at http://localhost:4321
npm run bootstrap    # apply the content model + demo content to the local DB
npm run build        # production build
npm run typecheck    # astro check — must pass before committing
npx emdash types     # regenerate collection types (needs the dev server running)
```

Admin UI: `http://localhost:4321/_emdash/admin`

## How this project is wired

| Concern | Where | Note |
| --- | --- | --- |
| Design tokens | `src/styles/tokens.css` | **Do not edit.** Measured from the original design. |
| Your overrides | `src/styles/theme.css` | Unlayered, so it always wins. Edit here. |
| Tailwind bridge | `src/styles/global.css` | `@theme` maps tokens to utilities. One source of truth. |
| Content model | `seed/seed.json` | Collections, fields, menus and demo content. |
| CMS reads | `src/lib/queries.ts` | **All** content queries go through here. |
| Document shell | `src/layouts/Base.astro` | head, SEO, header, footer. |

## Rules

1. **Never call `getEmDashCollection` from a component.** Add a function to
   `src/lib/queries.ts` instead. Content queries return a `cacheHint` that must
   reach `Astro.cache`; centralising it is why edge caching works at all.
2. **Never edit `tokens.css` to restyle.** Override in `theme.css`.
3. **No React on public routes.** React is an admin-only dependency. A React
   island on a public page breaks the performance budget.
4. **No `getStaticPaths()` for CMS content.** The site is `output: "server"`;
   content is dynamic and held fast by the edge cache.
5. **Image fields are objects, not URLs.** Use `<Image image={...} />` from
   `emdash/ui`. `<img src={field}>` renders `[object Object]`.
6. **`entry.id` is the slug** (use in URLs). **`entry.data.id`** is the
   database ULID (use for API calls that need a real ID).
7. **Taxonomy names must match the seed exactly.** A wrong name returns empty
   with no error.
8. **Nothing a buyer would want to edit may be hardcoded.** If you are about to
   write copy into a component, add a field instead.

## Changing the content model

Edit `seed/seed.json`, then:

```bash
npx emdash seed seed/seed.json --validate   # check before applying
npm run bootstrap                           # apply to a fresh local DB
npx emdash types                            # regenerate types
```

A seed is **not** reapplied to an already-initialised database. Test schema
changes against a fresh DB.

Valid field types: `string` `text` `url` `slug` `number` `integer` `boolean`
`datetime` `select` `multiSelect` `portableText` `image` `file` `reference`
`json` `repeater` `blocks`. A `repeater` needs `validation.subFields`.

## Not yet built (Phase 3+)

The homepage is a scaffold that proves the data layer. The real sections —
hero, work strip, intro card, career, stats ticker, testimonials, projects
grid, process, services, FAQ, contact — plus `/about`, `/all-projects`,
`/contact`, `/project-details/[slug]` and `/legal/[slug]` come next.

Design values, the section inventory and the motion spec are all in
`docs/phase-1-audit-and-plan.md`, measured from the original rather than
estimated.
