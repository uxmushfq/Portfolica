# Portfolica → Astro + EmDash — Phase 1: Audit & Plan

**Status:** awaiting review. No application code written yet.
**Date:** 2026-10-12
**Target stack:** Astro + Tailwind CSS + EmDash CMS on Cloudflare Workers (D1 + R2)

---

## 0. How this document was researched

Everything below about EmDash is taken from primary sources, not from memory:

| Source | What it gave |
| --- | --- |
| `emdash@1.2.0` + `create-emdash@1.2.0` npm tarballs | Published API surface, LICENSE text, dependency and peer ranges |
| `emdash-cms/emdash` git clone, HEAD `2244d2c` dated **2026-10-12 17:34 UTC** | 92 docs pages (the source of `docs.emdashcms.com`), first-party templates, agent skills, TypeScript declarations |
| `templates/portfolio-cloudflare` | The scaffold base for this project |
| `dist/**/*.d.mts` type declarations | Authoritative field-type union and seed schema |

`docs.emdashcms.com/llms.txt` was specified as the pre-code reading. That host is blocked by this environment's
network policy, so the repository clone was used instead. The clone is the upstream that `llms.txt` is generated
from and is current as of today, so the prerequisite is satisfied rather than skipped. No EmDash API in this
document is inferred — each is traceable to a declaration file or a docs page.

### Two inputs still missing

| Gap | Effect | Resolution |
| --- | --- | --- |
| **No readable Portfolica design** | §3 (page/section inventory) and §4 (design tokens) cannot be completed | Allow `portfolica.framer.website` in Network access, **or** supply a Figma file URL |
| **Live demo unreachable** | §7 motion *inventory* is a stub; the motion *framework* is complete | Same as above |

`framer.com/projects/…` is the authenticated Framer editor and cannot be fetched even if allowed — the published
site is the usable source. Sections dependent on these inputs are marked **PENDING INPUT** and are deliberately
left empty rather than filled with plausible guesses.

---

## 1. Licensing — resolved, no blocker

**EmDash is MIT licensed, Copyright 2026 Cloudflare Inc.** Verified by reading `LICENSE` inside the published
tarballs, and confirmed across every bundled runtime package:

| Package | Version | License |
| --- | --- | --- |
| `emdash` | 1.2.0 | MIT |
| `create-emdash` | 1.2.0 | MIT |
| `@emdash-cms/admin` | 1.2.0 | MIT |
| `@emdash-cms/auth` | 1.2.0 | MIT |
| `@emdash-cms/blocks` | 1.2.0 | MIT |
| `@emdash-cms/cloudflare` | 1.2.0 | MIT |
| `@emdash-cms/plugin-types` | 0.6.0 | MIT |
| `@emdash-cms/registry-client` | 0.7.0 | MIT |

MIT grants, verbatim, the right to "use, copy, modify, merge, publish, distribute, sublicense, and/or **sell**
copies of the Software". Bundling EmDash inside a paid, redistributed template is therefore permitted outright.

**The one obligation:** "The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software." Satisfied by shipping `licenses/THIRD-PARTY-NOTICES.md` containing
EmDash's notice and those of other bundled MIT/ISC dependencies. Planned for Phase 7 alongside your own `LICENSE`.

Note this is a *redistribution* question only, and it is settled. It is not legal advice, and it says nothing
about Framer's terms for the original Portfolica design — that is your own IP and your call.

---

## 2. Stack decisions and verified versions

From the upstream pnpm catalog (`pnpm-workspace.yaml`) at today's HEAD:

| Dependency | Version | Note |
| --- | --- | --- |
| `astro` | `^7.3.2` | Satisfies `emdash`'s `astro >=6.0.0-beta.0` peer — no conflict |
| `emdash` | `1.2.0` | Published release |
| `@emdash-cms/cloudflare` | `1.2.0` | D1 + R2 adapters |
| `@astrojs/cloudflare` | `^14.3.1` | |
| `@astrojs/react` | `^7.0.0` | Required — the admin UI is React |
| `react` / `react-dom` | `19.2.4` | Admin only; must not reach public routes |
| `wrangler` | `^4.125.0` | Satisfies the `>=4.99.0` peer |
| Node | `>=22.16` | Matches your constraint |

### Decision D1 — scaffolding method

`npm create emdash@latest` **cannot run in this environment**: the scaffolder shells out to `giget`, which fetches
from `codeload.github.com`, and that host returns 403 under the network policy.

The scaffolder's only job is to copy one of `templates/{blank,starter,blog,marketing,portfolio}[-cloudflare]` and
rewrite the project name. Its prompts are `Which template?`, `Where will you deploy?` (Cloudflare Workers = D1 + R2),
and `Which package manager?`.

**Recommendation:** copy `templates/portfolio-cloudflare` from the clone — byte-identical to what choosing
*portfolio* + *Cloudflare Workers* would produce, with no invented configuration. If you'd rather the record show a
genuine `npm create emdash@latest` run, allow `codeload.github.com` and I'll run it as specified.

### Decision D2 — Tailwind vs EmDash's native token CSS  ← **needs your call**

EmDash templates ship **no Tailwind**. They use a two-file CSS system that is already unusually well suited to
AI extension:

- `src/styles/tokens.css` — token defaults inside `@layer base`
- `src/styles/theme.css` — overrides, *unlayered*, so they always win without `!important`
- Colours use `light-dark(<light>, <dark>)`, so **one token carries both modes** and there is no second dark palette to maintain

You asked for Tailwind. The two can be combined rather than traded off:

```css
/* src/styles/global.css */
@import "tailwindcss";
@import "./tokens.css";          /* @layer base defaults — single source of truth */

@theme inline {
  --color-bg:       var(--color-bg);
  --color-fg:       var(--color-fg);
  --font-heading:   var(--font-heading);
  --spacing-section: var(--space-section);
  /* …generated from the token table in §4 */
}

@import "./theme.css";           /* unlayered buyer overrides, still win */
```

Tailwind v4's CSS-first `@theme` reads the same custom properties the tokens define, so utilities
(`bg-bg`, `font-heading`) and EmDash's own admin/Portable-Text styling resolve to identical values, and upstream's
documented customisation path keeps working.

**Recommendation: adopt Tailwind v4 this way.** Cost: one dependency (`@tailwindcss/vite`) and a divergence from
first-party convention that `AGENTS.md` must explain. Benefit: what your buyers and their AI agents expect, and
`light-dark()` means dark mode stays free.

Say the word if you'd rather ship upstream's plain-CSS system — it is the lower-risk option and genuinely good,
but less marketable.

### Decision D3 — SSR, and what it means for Lighthouse 95+

The template is `output: "server"`, and upstream is explicit: *"Do not add `getStaticPaths()` to a theme's content
routes."* Content is queried from D1 per request. So the performance target is met at the **edge cache**, not by
static generation — see §8. This is achievable but is an architectural commitment worth agreeing before Phase 2.

### Decision D4 — free-plan posture: already satisfied

Upstream `wrangler.jsonc` ships exactly what you asked for, with **`worker_loaders` already commented out**:

```jsonc
"d1_databases": [{ "binding": "DB",    "database_name": "my-portfolio-site"  }],
"r2_buckets":   [{ "binding": "MEDIA", "bucket_name":   "my-portfolio-media" }],
// Sandboxed plugins require Worker Loader, available on Workers paid plans. Uncomment to enable:
// "worker_loaders": [{ "binding": "LOADER" }],
"triggers": { "crons": ["* * * * *"] }
```

`DB`, `MEDIA` and the cron trigger are kept as specified. There is **no `sandboxRunner` key to remove** — it is
not present in the template's `emdash()` options. Nothing to strip; the default is already free-plan.

---

## 3. Page, section & component inventory — **PENDING INPUT**

Blocked on a readable design. To be filled as:

| Page | Route | Sections (top → bottom) | Components used |
| --- | --- | --- | --- |
| _pending_ | | | |

A component is listed once and reused; each entry will record its Figma/Framer frame, breakpoint behaviour, and
whether its content is CMS-editable (§5) or static.

### Upstream's portfolio template as the baseline

The first-party portfolio template already covers this much, and Portfolica's inventory will be expressed as a
delta against it:

| Page | Path | Content |
| --- | --- | --- |
| Home | `/` | Centred serif title + tagline, "Selected Work" grid |
| Work index | `/work` | Heading, tag filter chips, full grid |
| Project detail | `/work/[slug]` | Meta line, title, summary, featured image, Portable Text body, gallery, external URL |
| About | `/about` | Portable Text page content |
| Contact | `/contact` | Direct email call to action |
| 404 | — | |

Its stated design intent — *"Editorial, near-monochrome, photography as the main visual interest… for designers,
photographers, illustrators, studios"* — is close enough to Portfolica's audience that the structural work is a
refinement rather than a rebuild.

---

## 4. Design tokens — **PENDING INPUT**

Token *architecture* is settled (D2); token *values* need the design. Target shape:

```css
@layer base {
  :root {
    /* Colour — one declaration serves both modes */
    --color-bg:      light-dark(#ffffff, #0a0a0a);
    --color-fg:      light-dark(#0a0a0a, #f5f5f5);
    --color-muted:   light-dark(…, …);
    --color-brand:   light-dark(…, …);

    /* Type scale */
    --font-heading: …;  --font-body: …;
    --text-display: clamp(…, …vw, …);
    --text-h1 … --text-body … --text-caption;

    /* Spacing, radii, shadows, breakpoints, motion */
    --space-1 … --space-section;
    --radius-sm … --radius-full;
    --shadow-card …;
    --ease-out-expo …; --dur-base …;
  }
}
```

| Group | Source of truth | Status |
| --- | --- | --- |
| Colour | Framer/Figma variables | pending |
| Type scale | Design, as `clamp()` fluid pairs | pending |
| Spacing | Design spacing variables | pending |
| Radii / shadows | Design | pending |
| Breakpoints | Design frame widths | pending |
| Motion | Live demo timings | pending (framework in §7) |

Fluid type and spacing will use `clamp()` keyed to the design's own breakpoints, so there are fewer media queries
for a buyer's agent to keep consistent.

---

## 5. Proposed EmDash content model

This section is **complete** — it depends on EmDash's capabilities and your stated collections, not on the visuals.
Field-level detail will be confirmed against the design once available.

### Mechanism: a seed file, which is what makes this redistributable

EmDash stores its schema **in the database, not in code**. For a paid template that matters enormously: the
content model has to travel to buyers somehow. The supported mechanism is a **seed file**, declared in
`package.json`:

```json
{ "emdash": { "seed": "seed/seed.json" } }
```

`SeedFile` (from `emdash/seed` declarations) carries the whole model in one committed artifact:

```
version, defaultLocale, meta, settings, collections[], blockTypes[], relations[],
taxonomies[], menus[], redirects[], widgetAreas[], sections[], bylines[], content{}
```

`applySeed({ includeContent })` lets the setup wizard apply the **structure always** and the **demo content
optionally** — so a buyer gets the full model and can choose whether to keep the sample projects. `emdash export-seed`
round-trips a model built in the admin UI back into the file, which is how I'll keep `seed.json` honest.

> **Buyer-docs consequence:** *"Rebuilding a template does not reapply its seed to an initialized database."*
> Seed changes after setup require the schema-evolution path. This goes in the README and `AGENTS.md`.

### Available field types (authoritative)

`string`, `text`, `url`, `slug`, `number`, `integer`, `boolean`, `datetime`, `select`, `multiSelect`,
`portableText`, `image`, `file`, `reference`, `json`, `repeater`, `blocks`

Per-collection `supports`: `drafts`, `revisions`, `preview`, `scheduling`, `search`, `seo`

### Collections

Legend: **CMS** = editable in admin · **Static** = lives in template code

#### `projects` — case studies · `/work/[slug]`
`supports: [drafts, revisions, preview, search, seo]`

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `title` | `string` | ✓ | searchable |
| `featured_image` | `image` | ✓ | media value, not a URL |
| `thumbnail` | `image` | | grid override; falls back to `featured_image` |
| `client` | `string` | | |
| `year` | `string` | | string, not integer — allows "2024–25" |
| `role` | `string` | | |
| `summary` | `text` | | searchable; grid + meta line |
| `content` | `portableText` | | searchable; case-study body |
| `gallery` | `repeater` | | rows of `{ image, caption? }` |
| `metrics` | `repeater` | | rows of `{ label, value }` for results |
| `url` | `url` | | live-site link |
| `featured` | `boolean` | | drives homepage selection |
| `sort_order` | `integer` | | manual ordering |

Taxonomies: `tag`, `industry`, `service`

#### `services`
`supports: [drafts, revisions, search, seo]` · routable if the design has detail pages

`title` `string` ✓ · `summary` `text` · `content` `portableText` · `icon` `select` (maps to an icon component — a
`select` keeps a stored value from becoming an arbitrary module path) · `deliverables` `repeater{item}` ·
`starting_price` `string` · `sort_order` `integer`

#### `testimonials` — `routable: false`
`quote` `text` ✓ · `author_name` `string` ✓ · `author_role` `string` · `author_company` `string` ·
`avatar` `image` · `company_logo` `image` · `project` `reference` → `projects` · `featured` `boolean` · `sort_order` `integer`

#### `team` — `routable: false` unless the design has bios
`name` `string` ✓ · `role` `string` · `photo` `image` · `bio` `portableText` · `socials` `repeater{platform select, url}` · `sort_order` `integer`

#### `posts` — blog · `/blog/[slug]`
`supports: [drafts, revisions, scheduling, search, seo]`

`title` `string` ✓ · `excerpt` `text` · `featured_image` `image` · `content` `portableText`
Taxonomies: `category` (hierarchical), `tag`

> Authors use EmDash's **built-in `bylines`** (`displayName`, `bio`, `websiteUrl`, `avatar`) rather than a custom
> `authors` collection — it's first-class in the seed schema and in the admin.

#### `clients` — logo wall · `routable: false`
`name` `string` ✓ · `logo` `image` ✓ · `url` `url` · `sort_order` `integer`

#### `pages` — composable CMS pages · `/[slug]`
`title` `string` ✓ · `content` `blocks` (see below) · `supports: [drafts, revisions, preview, seo]`

#### `site_options` — `hidden: true`, `routable: false`
Built-in site settings cover `title`, `tagline`, `logo`, `favicon`, `url`, `postsPerPage`, `dateFormat`,
`timezone`, `seo`, and `social`. **But `social` is a fixed set** — `twitter`, `github`, `facebook`, `instagram`,
`linkedin`, `youtube`. No Dribbble, Behance, X or Bluesky, which is too narrow for a designer portfolio.

So this collection holds what built-in settings can't:

`socials` `repeater{platform select, url}` · `nav_cta_label` `string` · `nav_cta_url` `url` ·
`availability_badge` `string` · `contact_email` `string` · `footer_tagline` `text` · `copyright_line` `string` ·
`notfound_heading` `string` · `notfound_body` `text`

### Blocks — how the homepage becomes editable  ← **recommended**

Your constraint *"no hardcoded content that a buyer would reasonably want to edit"* points at the `blocks` field.
Upstream's marketing template seeds eleven block types and lets editors **add, reorder, duplicate and remove**
them, with pages created in the admin getting their own URL and no route file.

Applied to Portfolica, each homepage section becomes a block type (final list pending §3):

`hero` · `logo_wall` · `about_intro` · `selected_work` · `services_list` · `process_steps` · `stats` ·
`testimonials` · `team` · `blog_teaser` · `faq` · `cta` · `contact`

Rendered through a generated union, which keeps the component map exhaustive at compile time:

```astro
---
import { Blocks, defineBlockComponents } from "emdash/ui";
import type { PageContentBlock } from "../emdash-env";

const components = defineBlockComponents<PageContentBlock>({
  portfolica_hero: Hero,
  portfolica_selected_work: SelectedWork,
  /* … */
});
---
<Blocks value={Astro.props.value} components={components} />
```

This is the single biggest lever on perceived value: buyers rearrange their homepage in the admin instead of
editing `.astro` files.

### Taxonomies, menus, relations

| Taxonomy | Hierarchical | Applies to |
| --- | --- | --- |
| `tag` | no | `projects`, `posts` |
| `category` | yes | `posts` |
| `industry` | no | `projects` |
| `service` | no | `projects` |

Menus (**CMS**): `primary`, `footer_primary`, `footer_secondary`
Widget areas: `footer` — optional, if the design's footer has editor-controlled columns
Sections: a reusable CTA block, so the same call to action can be dropped into any Portable Text field

> Taxonomy names must match the seed **exactly** — a seed of `"name": "tag"` must be queried as `getTerm("tag", …)`.
> A wrong name returns empty with no error. This goes in `AGENTS.md` as a named gotcha.

### Static by deliberate choice

Layout structure and grids · motion timings and easings · icon set · section *ordering* within a block component ·
legal/boilerplate microcopy not worth a CMS field. Everything a buyer would plausibly want to change is CMS-backed.

---

## 6. Proposed folder structure

```
portfolica/
├── AGENTS.md                      # Phase 6 — project map + conventions for AI agents
├── design.md                      # Phase 6 — tokens, type, spacing, component usage
├── README.md                      # Phase 7 — buyer quick start
├── CHANGELOG.md
├── LICENSE                        # your terms (placeholder until supplied)
├── licenses/
│   └── THIRD-PARTY-NOTICES.md     # EmDash MIT + bundled deps (§1 obligation)
├── .cursor/rules/                 # Phase 6 — Cursor rules
├── prompts/                       # Phase 6 — per-component prompt snippets
│   ├── add-testimonial-variant.md
│   ├── add-block-type.md
│   └── add-collection.md
├── docs/
│   ├── phase-1-audit-and-plan.md  # this file
│   ├── deploy-cloudflare.md
│   ├── editing-content.md
│   └── customizing-tokens.md
│
├── astro.config.mjs               # adapter, emdash(), fonts, cache provider, routeRules
├── wrangler.jsonc                 # DB + MEDIA + cron (LOADER stays commented)
├── package.json                   # emdash.seed → seed/seed.json
├── tsconfig.json
├── emdash-env.d.ts                # generated — PageContentBlock union lives here
├── worker-configuration.d.ts
├── .env.example                   # names only, never values
├── .gitignore                     # local .db, uploads, .env
│
├── seed/
│   └── seed.json                  # the entire content model + demo content
│
└── src/
    ├── worker.ts                  # Cloudflare entry point
    ├── live.config.ts             # emdashLoader() registration
    ├── styles/
    │   ├── tokens.css             # @layer base defaults — DO NOT EDIT (buyer-facing rule)
    │   ├── theme.css              # unlayered overrides — the buyer's edit surface
    │   └── global.css             # Tailwind entry + @theme bridge (D2)
    ├── layouts/
    │   ├── Base.astro             # html head, SEO, header/footer, cache hints
    │   └── Page.astro
    ├── components/
    │   ├── blocks/                # one file per block type in §5
    │   │   ├── Hero.astro
    │   │   ├── SelectedWork.astro
    │   │   └── …
    │   ├── cards/
    │   │   ├── ProjectCard.astro
    │   │   ├── PostCard.astro
    │   │   ├── TestimonialCard.astro
    │   │   ├── TeamCard.astro
    │   │   └── ClientLogo.astro
    │   ├── nav/
    │   │   ├── Header.astro
    │   │   ├── Footer.astro
    │   │   └── MobileMenu.astro
    │   ├── primitives/
    │   │   ├── Button.astro
    │   │   ├── Tag.astro
    │   │   ├── Marquee.astro
    │   │   └── Reveal.astro       # scroll-reveal wrapper (§7)
    │   ├── PortfolicaBlocks.astro # defineBlockComponents map
    │   └── seo/
    │       ├── Seo.astro
    │       └── JsonLd.astro
    ├── lib/
    │   ├── queries.ts             # typed wrappers over getEmDashCollection/Entry
    │   ├── seo.ts
    │   └── format.ts
    └── pages/
        ├── index.astro
        ├── work/{index,[slug]}.astro
        ├── services/{index,[slug]}.astro
        ├── blog/{index,[slug]}.astro
        ├── about.astro
        ├── contact.astro
        ├── [slug].astro           # CMS pages via blocks
        ├── tag/[slug].astro
        ├── category/[slug].astro
        ├── search.astro
        ├── 404.astro
        └── rss.xml.ts
```

**Conventions, chosen so an agent can extend predictably:** one component per file, named for the block type it
renders; every CMS read goes through `src/lib/queries.ts` so cache-hint handling exists in one place; `tokens.css`
is declared off-limits and `theme.css` is the sanctioned edit surface.

---

## 7. Motion & interaction plan

### Inventory — **PENDING INPUT**

| # | Section | Interaction | Trigger | Technique | JS? |
| --- | --- | --- | --- | --- | --- |
| _pending — needs the live demo_ | | | | | |

### Framework — complete, CSS-first

This is independent of the specific inventory and will absorb it:

| Interaction | Technique | JS cost |
| --- | --- | --- |
| Scroll reveal / fade-up | `animation-timeline: view()` | none |
| Staggered children | `--i` index custom property → `animation-delay` | none |
| Sticky / pinned sections | `position: sticky` | none |
| Parallax imagery | `animation-timeline: scroll()` | none |
| Logo marquee | CSS keyframes on a duplicated track | none |
| Card hover (scale, clip, image zoom) | `transition` on `transform` / `clip-path` | none |
| Page transitions | Astro View Transitions + `view-transition-name` | built-in |
| Nav scroll state | one `IntersectionObserver` sentinel | ~10 lines |
| Counters | `IntersectionObserver` + `requestAnimationFrame` | ~20 lines |
| Mobile menu | `<details>` or the Popover API | minimal |

**Scroll-driven CSS animations carry the load.** Where `animation-timeline` needs a fallback, one shared
`IntersectionObserver` in `Reveal.astro` adds an `.is-visible` class — a single tiny script for the whole site,
not a library. **No animation library** (no GSAP, Framer Motion, Lenis): they contradict both the Lighthouse
target and "avoid ongoing maintenance".

Motion lives in tokens (`--dur-*`, `--ease-*`, `--reveal-distance`, `--stagger`) so it is tunable without
touching components.

### Reduced motion

One block neutralises every animation by zeroing the tokens, rather than per-component overrides:

```css
@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-base: 0ms; --dur-slow: 0ms; --reveal-distance: 0; --stagger: 0ms; }
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important;
                           transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```

---

## 8. Performance plan — Lighthouse 95+ on an SSR site

Per D3 there is no static output, so the budget is met at the edge:

1. **Workers Cache in front of the Worker** — matching requests never execute it:
   ```js
   import { cacheCloudflare } from "@astrojs/cloudflare/cache";
   export default defineConfig({
     adapter: cloudflare(),
     cache: { provider: cacheCloudflare() },
     routeRules: { "/": { maxAge: 300, swr: 86400 } },
   });
   ```
2. **Cache hints on every cached route** — `Astro.cache.set(cacheHint)`, using
   `getSiteSettingsWithCacheHint()`, `getMenuWithCacheHint()`, `getTaxonomyTermsWithCacheHint()`,
   `getWidgetAreaWithCacheHint()` in layouts.
3. **Explicit `Cache-Control` on every custom route.** Workers Cache applies RFC 9111 heuristic freshness —
   *a `200` with no header is cached for 2 hours*. Session-dependent routes get `private, no-store`.
4. **Zero framework JS on public routes.** React is an admin dependency; no React island may reach a public page.
   I'll assert this in the build check — it's the single largest risk to the score.
5. **Astro Fonts API** (already in the template) — self-hosted, preloaded, `font-display: swap`.
6. **`<Image>` from `emdash/ui`** + Cloudflare image transformation; `priority` on the hero image only, everything
   else lazy. Image fields are media objects — passing the whole value is required, not the `src`.
7. **`devToolbar: { enabled: false }`**, already set upstream.

**Known caveat to document:** Workers Cache runs *before* the Worker and cannot vary on cookies, so a signed-in
editor may be served the cached anonymous page without the editing toolbar until it expires. Editor-rendered
responses carry `private, no-store`, so nothing leaks the other way. Worth noting in the README.

---

## 9. Deployment notes for Phase 5

`wrangler login` → `npm run build` → `npx wrangler deploy`, then the custom domain:

```jsonc
{ "routes": [{ "pattern": "www.example.com", "custom_domain": true }] }
```

Redeploy, then run the setup wizard at `/_emdash/admin`.

> **Ordering trap, worth getting right in the docs.** Without `siteUrl` / `EMDASH_SITE_URL` / `SITE_URL`, setup
> records whatever address it runs on as the site origin — and **passkeys only work at the address where they were
> created**. So either run setup on the production domain, or set `EMDASH_SITE_URL` to it *before* setup. Getting
> this backwards means re-registering passkeys. The sequence is: add the custom domain → redeploy → *then* run setup.

`EMDASH_ENCRYPTION_KEY` via `wrangler secret put`; `.env` git-ignored, `.env.example` names keys only.

---

## 10. Risks

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| R1 | No readable design — Phases 3–4 cannot start | **blocking** | Allow `portfolica.framer.website`, or supply a Figma URL |
| R2 | React admin bundle leaking into public routes | high | Assert zero-JS on public routes in the build check (§8.4) |
| R3 | Seed can't be reapplied after setup | medium | Document schema evolution; test against a fresh DB every time |
| R4 | SSR + D1 latency hurting scores | medium | Workers Cache (§8); place the Worker near D1 |
| R5 | Tailwind diverging from upstream convention | low | The `@theme` bridge (D2) keeps one source of truth; explain in `AGENTS.md` |
| R6 | EmDash upgrades breaking a shipped template | medium | Pin exact versions; upstream has an `upgrading-emdash` skill to follow |
| R7 | `templates/portfolio-cloudflare` is `v0.0.3` and moving | low | Pin to the audited commit; re-verify before release |

---

## 11. Phase plan & commits

| Phase | Deliverable | Commit |
| --- | --- | --- |
| **1** | This document | `docs: phase 1 audit and plan` |
| 2 | Scaffold, Tailwind + tokens, Base layout, fonts, SEO/OG/sitemap/RSS, 404, seed with demo content | `feat: phase 2 foundation` |
| 3 | Components 1:1 with the design, pages, dynamic routes, CMS menus + settings, a11y | `feat: phase 3 components and pages` |
| 4 | Motion, View Transitions, reduced-motion, Lighthouse 95+ | `feat: phase 4 motion and polish` |
| 5 | Deploy, custom domain, setup wizard | `chore: phase 5 deployment` |
| 6 | `AGENTS.md`, `design.md`, prompt snippets, Cursor rules | `docs: phase 6 ai-ready package` |
| 7 | README, LICENSE, CHANGELOG, third-party notices | `docs: phase 7 buyer docs` |

Phase 2 can begin immediately on approval — scaffold, token architecture, seed and content model need no design
input. Only the token *values* (§4) and component fidelity (§3) are gated.

---

## 12. Questions for you

1. **Design access** — allow `portfolica.framer.website`, or paste a Figma file URL? (R1, blocking for Phases 3–4)
2. **D2 — Tailwind?** Adopt Tailwind v4 bridged to EmDash's tokens as recommended, or stay on upstream's plain CSS?
3. **D3 — confirm SSR + edge caching** as the route to Lighthouse 95+, rather than static generation?
4. **Blocks** — make the homepage block-composable (recommended, §5), or fixed sections with field-level editing?
5. **Scope** — are Services, Team and Blog all in Portfolica, or should any ship as stubs?
6. **Scaffolding** — copy `templates/portfolio-cloudflare` from the audited clone, or allow `codeload.github.com`
   so `npm create emdash@latest` runs verbatim?
7. **LICENSE** — send your terms when ready; `licenses/THIRD-PARTY-NOTICES.md` is handled either way.
