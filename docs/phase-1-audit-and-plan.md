# Portfolica → Astro + EmDash — Phase 1: Audit & Plan

**Status:** awaiting review. No application code written yet.
**Date:** 2026-10-12
**Scope decision:** faithful 1:1 recreation of the Framer original. No blog, team or testimonials.
**Target stack:** Astro + Tailwind CSS v4 + EmDash CMS on Cloudflare Workers (D1 + R2)

---

## 0. Sources

Nothing here is from memory or guesswork. Every EmDash fact traces to a declaration file or docs page;
every design value was measured from the live site in a real browser.

| Source | What it gave |
| --- | --- |
| `emdash@1.2.0` / `create-emdash@1.2.0` npm tarballs | API surface, LICENSE text, peer ranges |
| `emdash-cms/emdash` clone, HEAD `2244d2c` (2026-10-12 17:34 UTC) | 92 docs pages, first-party templates, agent skills, `.d.mts` types |
| `templates/portfolio-cloudflare` | Scaffold base |
| **`portfolica.framer.website`, rendered in Chromium at 3 breakpoints** | Page map, type scale, palette, spacing, radii, motion |
| developers.cloudflare.com pricing pages | Verified free-tier limits |

Measurement method: Playwright + Chromium, 5 pages × 3 viewports (1440 / 1000 / 390), computed styles read
after animations settled, plus the Framer appear-animation config parsed from the page itself.

---

## 1. Licensing — resolved

**EmDash is MIT, Copyright 2026 Cloudflare Inc.** Verified from the LICENSE file inside the published tarballs,
and across every bundled package: `emdash`, `create-emdash`, `@emdash-cms/admin`, `auth`, `blocks`,
`cloudflare`, `plugin-types`, `registry-client` — all MIT.

MIT grants the right to "use, copy, modify, merge, publish, distribute, sublicense, and/or **sell**". Bundling it
in a paid, redistributed template is permitted. The sole obligation is retaining the copyright and permission
notice, shipped as `licenses/THIRD-PARTY-NOTICES.md`.

This covers redistribution only. It is not legal advice, and says nothing about Framer's terms for the original
Portfolica design, which is your own IP.

---

## 2. Everything is free — verified

| Service | Free allowance | Headroom for a portfolio |
| --- | --- | --- |
| Workers | 100,000 requests/day | ample; cached hits don't count |
| D1 (database) | 5M rows read/day · 100k written/day · 5 GB | ample |
| R2 (media) | 10 GB-month storage + free op allowances | ~ thousands of images |
| Image transformations | 5,000 unique/month | capped by our variant budget (§8) |
| Astro · Tailwind · EmDash · Inter | open source | — |

Two things worth stating in the buyer docs:

**Caching extends the free tier, not just speed.** Workers Cache serves matching requests at the edge *without
invoking the Worker*, so cached page views consume neither the 100k/day request budget nor any D1 reads.

**Image transformations cannot produce a surprise bill.** On the free plan, exceeding 5,000 unique
transformations returns error 9422 for *new* variants while cached ones keep serving; Cloudflare states you are
not charged for exceeding free-plan limits. We further limit exposure by shipping a deliberately small set of
image widths (§8).

The only real cost is a domain name.

---

## 3. Stack and decisions

Versions from the upstream pnpm catalog at today's HEAD:

| Dependency | Version |
| --- | --- |
| `astro` | `^7.3.2` (satisfies emdash's `>=6.0.0-beta.0` peer) |
| `emdash` / `@emdash-cms/cloudflare` | `1.2.0` |
| `@astrojs/cloudflare` | `^14.3.1` |
| `@astrojs/react` | `^7.0.0` (admin UI only) |
| `react` / `react-dom` | `19.2.4` (admin only) |
| `wrangler` | `^4.125.0` |
| Node | `>=22.16` |

### D1 — scaffolding: copy the template

`npm create emdash@latest` fetches via `giget` from `codeload.github.com`. That host was blocked when this audit
began; it may now be reachable. Either way the scaffolder's only job is to copy
`templates/portfolio-cloudflare` and rename the project, so we copy it from the audited clone — identical result,
pinned to a known commit.

### D2 — Tailwind v4: **settled by the design itself**

The measured palette *is* Tailwind's `zinc` scale, exactly:

| Measured | Tailwind |
| --- | --- |
| `#fafafa` `#f4f4f5` `#e4e4e7` `#d4d4d8` | zinc-50 / 100 / 200 / 300 |
| `#a1a1aa` `#71717a` `#52525b` | zinc-400 / 500 / 600 |
| `#3f3f46` `#27272a` | zinc-700 / 800 |

So Tailwind is no longer a preference — the design is already expressed in its vocabulary. We keep EmDash's
`tokens.css` / `theme.css` split and bridge it with Tailwind v4's `@theme`, so values are declared once:

```css
/* src/styles/global.css */
@import "tailwindcss";
@import "./tokens.css";     /* @layer base defaults — the single source of truth */
@theme inline { /* maps the tokens below into Tailwind utilities */ }
@import "./theme.css";      /* unlayered buyer overrides — always win */
```

### D3 — SSR + edge cache

EmDash templates are `output: "server"` and upstream forbids `getStaticPaths()` for CMS content. Lighthouse 95+
is therefore reached via Workers Cache, not static generation. See §8.

### D4 — free-plan Worker config: already correct

Upstream `wrangler.jsonc` ships `DB` (D1), `MEDIA` (R2) and the maintenance cron, with `worker_loaders`
**already commented out** and labelled paid-plan-only. There is no `sandboxRunner` key to remove. Nothing to strip.

### D5 — homepage as blocks

The one place we deliberately exceed the Framer original. Each homepage section becomes an EmDash block type so a
buyer can reorder, duplicate or remove sections *from the admin*, with no code edit. Section inventory stays 1:1;
only editability improves. This is the clearest expression of "no hardcoded content a buyer would want to edit",
and the strongest answer to no-code competitors.

---

## 4. Page & section inventory — measured

### Routes

| Page | Route | Doc height (desktop) |
| --- | --- | --- |
| Home | `/` | 9927px |
| About | `/about` | 5430px |
| All projects | `/all-projects` | 6206px |
| Contact | `/contact` | 2408px |
| Project detail | `/project-details/[slug]` | 5113px |
| Privacy policy | `/legal/privacy-policy` | — |
| Terms & conditions | `/legal/terms-conditions` | — |
| 404 | `/404` | — |

Six seeded projects: `connecto`, `edunova`, `medilink`, `paynest`, `shopora`, `travelio`.

### Homepage sections, in order

| # | Section | Contents | Source |
| --- | --- | --- | --- |
| 1 | Header | avatar logo · nav (About, All Projects, Contact, 404) · "Book a 30 min call" · email icon | menu + settings |
| 2 | Hero | "Alex / Morgan" + inline avatar · availability badge · tagline · 2 CTAs | settings |
| 3 | Work strip | 4 device images, horizontal ticker | `projects` |
| 4 | Intro card | About me / Background / My Approach — 3 labelled blocks | block fields |
| 5 | Career | 4 roles with date ranges | `experience` |
| 6 | Stats ticker | 100% Client Satisfaction · 50+ Projects Completed · 4X Client Growth · 7+ Years of Experience | `stats` |
| 7 | Testimonials | eyebrow "Testimonials" · heading "Good work gets noticed" (per-character reveal) · 5 cards, each avatar + rating + quote | `testimonials` |
| 8 | Projects | 2×2 grid, chips showing name + year, caption, "View All Projects" | `projects` |
| 9 | Process | "How things get built together" — steps 01–04 | `process_steps` |
| 10 | Services | 2×2 grid, icon + title + description ×4 | `services` |
| 11 | FAQ | "Before you ask" — 5 accordion rows | `faqs` |
| 12 | Contact | "Have a project in mind?" — Name, Email, Project Information, Submit | block fields |
| 13 | Footer | socials · legal links | menus + settings |

**Other pages reuse these sections.** About = headline + Career + Skills + Awards + CTA. All-projects = heading +
grid + Services + FAQ + CTA. Contact = CTA + FAQ. Project detail = title + Challenge + Approach + body + gallery +
"Explore more like this one".

> Demo-copy fix: the original reads "Years of **Experiance**". Corrected in our seed.

---

## 5. Design tokens — measured

### Breakpoints (Framer's three tiers)

| Name | Range | Content width | Side gutter |
| --- | --- | --- | --- |
| Desktop | `≥1200px` | 1200px | fluid |
| Tablet | `810–1199.98px` | 940px | 30px |
| Mobile | `≤809.98px` | 360px | 15px |

### Type — Inter only, weights 400 / 500 / 600 / 700

| Role | Desktop | Tablet | Mobile | Weight | Line-height |
| --- | --- | --- | --- | --- | --- |
| Display (hero) | 96px | 96px | 76px | 500 | 1.0 |
| Section heading | 64px | 52px | 40px | 500 | 1.1 |
| Lead | 24px | 24px | 24px | 400/500 | 1.3 |
| Body | 20px | 20px | 20px | 400/500 | 1.3 |
| FAQ question | 18px | 18px | 18px | 500 | 1.4 |
| UI / nav | 16px | 16px | 16px | 400/500 | 1.3 |
| Small | 14px | 14px | 14px | 400/500/600 | 1.2–1.3 |
| Caption | 12px | 12px | 12px | 400 | — |

**Only the two display sizes change across breakpoints.** Everything 24px and below is fixed at all widths —
a notably simple system, and cheap to implement. Letter-spacing is `normal` everywhere except the 14px/600
button label at `-0.7px`.

Two fluid pairs cover the responsive behaviour:

```css
--text-display: clamp(76px, 6.7vw, 96px);   /* 76 → 96 */
--text-heading: clamp(40px, 4.4vw, 64px);   /* 40 → 52 → 64 */
```

### Colour

```css
--color-bg:        #f4f4f5;  /* zinc-100 — page background, NOT white */
--color-surface:   #ffffff;  /* cards, panels */
--color-fg:        #27272a;  /* zinc-800 — primary text */
--color-fg-soft:   #3f3f46;  /* zinc-700 */
--color-muted:     #71717a;  /* zinc-500 */
--color-subtle:    #a1a1aa;  /* zinc-400 */
--color-line:      #e4e4e7;  /* zinc-200 — borders */
--color-accent:    #f64617;  /* primary orange — CTAs, icons */
--color-accent-2:  #fd6e32;  /* lighter orange */
--color-info:      #1747f6;  /* blue, sparing */
--color-info-soft: #7190ff;
```

### Radii, spacing, rhythm

```css
--radius-sm: 8px;    --radius-md: 24px;   /* dominant — cards, images */
--radius-lg: 40px;   --radius-pill: 100px;  --radius-full: 9999px;
```

Spacing steps in use: `8 10 12 16 20 24 30 32 40 50 80 100 120`
Grid gaps: 10px dominant, then 20, 16, 12, 24, 8, 32.

Section vertical rhythm: **100px** desktop → **80px** tablet/mobile, with 30px for tight blocks.

---

## 6. Content model

Faithful scope. Schema lives in the database, so it travels to buyers as a committed **seed file**
(`seed/seed.json`, declared via `package.json#emdash.seed`). `applySeed({ includeContent })` lets the setup wizard
apply structure always and demo content optionally.

Field types available: `string` `text` `url` `slug` `number` `integer` `boolean` `datetime` `select`
`multiSelect` `portableText` `image` `file` `reference` `json` `repeater` `blocks`
Collection `supports`: `drafts` `revisions` `preview` `scheduling` `search` `seo`

### `projects` — `/project-details/[slug]` · `supports: [drafts, revisions, preview, search, seo]`

| Field | Type | Notes |
| --- | --- | --- |
| `title` | `string` ✓ | searchable |
| `featured_image` | `image` ✓ | grid + hero |
| `year` | `string` | chip label |
| `category` | `string` | chip label |
| `summary` | `text` | searchable |
| `challenge` | `portableText` | detail page |
| `approach` | `portableText` | detail page |
| `gallery` | `repeater` | `{ image, caption? }` |
| `url` | `url` | live link |
| `featured` | `boolean` | homepage selection |
| `sort_order` | `integer` | manual order |

### Supporting collections — all `routable: false`

| Collection | Fields | Seeded |
| --- | --- | --- |
| `services` | `title` ✓, `description`, `icon` (select), `sort_order` | 4 |
| `experience` | `role` ✓, `period`, `sort_order` | 4 |
| `process_steps` | `step_number`, `title` ✓, `description`, `sort_order` | 4 |
| `stats` | `value` ✓, `label` ✓, `sort_order` | 4 |
| `faqs` | `question` ✓, `answer` (portableText), `sort_order` | 5 |
| `testimonials` | `quote` ✓ (text), `rating` (string, e.g. `4.9`), `avatar` (image), `sort_order` | 5 |
| `skills` | `name` ✓, `group`, `sort_order` | about page |

The testimonial cards show **avatar + rating + quote only** — no name, role or company in the original. Kept 1:1.
Optional `author_name` / `author_role` fields are documented in `AGENTS.md` as a one-line extension that renders
only when filled, so a buyer can add attribution without touching layout.

Measured ratings and quotes: `4.9`, `5.0`, `4.6`, `5.0`, `4.8`. The same section renders on both Home and About,
confirming it as a reusable block rather than a page-specific layout.

### `pages` — `/[slug]` · `content: blocks`
Covers About, Privacy policy, Terms & conditions, and any page a buyer adds.

### `site_options` — `hidden: true`, `routable: false`

Built-in site settings already provide `title`, `tagline`, `logo`, `favicon`, `url`, `postsPerPage`, `dateFormat`,
`timezone`, `seo`. But **built-in `settings.social` is a fixed list** — twitter, github, facebook, instagram,
linkedin, youtube — and your site links **Behance, Dribbble, X, Figma and Cal.com**. Three of those five are not
representable. So socials become a custom field here:

`socials` `repeater{platform select, url}` · `avatar` `image` · `availability_badge` `string` ·
`hero_line_1` `string` · `hero_line_2` `string` · `hero_tagline` `text` · `cta_primary_label/url` ·
`cta_secondary_label/url` · `booking_url` `url` · `contact_email` `string` · `copyright_line` `string` ·
`notfound_heading` `string` · `notfound_body` `text`

### Menus (CMS-managed)
`primary` (About, All Projects, Contact, 404) · `footer` · `legal`

### Block types (homepage composition, D5)
`hero` · `work_strip` · `intro_card` · `career` · `stats_ticker` · `testimonials` · `projects_grid` ·
`process` · `services` · `faq` · `contact_form`

### Static by choice
Layout grids · motion timings · icon set · section internals. Everything a buyer would plausibly edit is CMS-backed.

---

## 7. Motion — measured from the live site

Framer drives motion with springs via JS, not CSS easing. The appear-animation config parsed from the page:

| Pattern | From | Transition |
| --- | --- | --- |
| Hero entrance | `opacity 0.001`, `y −77` | spring, duration 1.5s, **bounce 0.2**, delay 0.1s |
| Standard entrance | `opacity 0.001`, `y 20` | spring, duration 1.5s, bounce 0, delay 0.1s |
| Large section | `opacity 0.001`, `y 140` | spring, duration 1.5s, bounce 0, delay 0.5s |
| Late element | `opacity 0.001`, `y 50` | spring, stiffness 300, damping 50, mass 1, delay 2s |
| Scroll reveal | `opacity 0`, `y 20–30` | runtime, same spring language |
| Testimonial heading | split into one element **per character** | staggered per-letter reveal |
| Button hover | — | `background, box-shadow` **0.3s `cubic-bezier(0.44, 0, 0.56, 1)`** |

Only one CSS transition is declared on the whole site — the button hover above. Everything else is JS.

### How we rebuild it, CSS-first

| Interaction | Technique | JS |
| --- | --- | --- |
| Scroll reveal (fade + rise 20–30px) | `animation-timeline: view()` | none |
| Per-letter heading reveal | characters wrapped at build time, `--i` index → `animation-delay` | none |
| Hero / section entrances | CSS keyframes + `animation-delay` | none |
| Stats & awards tickers | CSS keyframes on a duplicated track | none |
| Work strip | same ticker pattern | none |
| Button hover | `transition: background, box-shadow .3s cubic-bezier(.44,0,.56,1)` — exact match | none |
| Card hover | `transform` / `clip-path` transition | none |
| FAQ accordion | `<details>` + `::details-content` | none |
| Page transitions | Astro View Transitions | built-in |
| Nav scroll state | one `IntersectionObserver` sentinel | ~10 lines |

**Springs → CSS.** A `bounce: 0` spring is critically damped, so a plain ease-out curve matches it closely. The
hero's `bounce: 0.2` has slight overshoot, reproduced with a `linear()` easing or a subtle two-stage keyframe.
Duration 1.5s is slow by CSS convention but it is what the original does, so we match it.

**No animation library.** No GSAP, Framer Motion or Lenis — they would contradict both the Lighthouse target and
the "no ongoing maintenance" constraint.

Motion lives in tokens (`--dur-*`, `--ease-*`, `--rise-*`, `--stagger`) so it is tunable without touching components.

```css
@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast:0ms; --dur-base:0ms; --dur-slow:0ms; --rise-sm:0; --rise-lg:0; --stagger:0ms; }
  *,*::before,*::after { animation-duration:.01ms !important; animation-iteration-count:1 !important;
                         transition-duration:.01ms !important; scroll-behavior:auto !important; }
}
```

> One open item: the tickers are JS-driven in Framer, so their exact speed isn't readable from the page. I'll
> match them by eye against the live site during Phase 4.

---

## 8. Performance — Lighthouse 95+ on SSR

1. **Workers Cache** via `cacheCloudflare()` + `routeRules` — matching requests never invoke the Worker.
2. **Cache hints** on every cached route: `Astro.cache.set(cacheHint)`, using `getSiteSettingsWithCacheHint()`,
   `getMenuWithCacheHint()`, `getTaxonomyTermsWithCacheHint()`, `getWidgetAreaWithCacheHint()` in layouts.
3. **Explicit `Cache-Control` everywhere.** Workers Cache applies RFC 9111 heuristic freshness — a `200` with no
   header is cached for 2 hours. Session-dependent routes get `private, no-store`.
4. **Zero framework JS on public routes.** React is an admin-only dependency and must never reach a public page.
   Asserted in the build check — the single largest risk to the score.
5. **Astro Fonts API** for Inter — self-hosted, preloaded, `font-display: swap`, subset to the weights used.
6. **A fixed, small set of image widths** (4 per image) — keeps quality high and stays well inside the free
   5,000 transformations/month.
7. **`devToolbar: { enabled: false }`**, already upstream.

**Documented caveat:** Workers Cache runs before the Worker and cannot vary on cookies, so a signed-in editor may
briefly see the cached anonymous page without the editing toolbar. Editor-rendered responses carry
`private, no-store`, so nothing leaks the other way.

---

## 9. Folder structure

```
portfolica/
├── AGENTS.md  design.md  README.md  CHANGELOG.md  LICENSE
├── licenses/THIRD-PARTY-NOTICES.md
├── .cursor/rules/            prompts/            docs/
├── astro.config.mjs  wrangler.jsonc  package.json  tsconfig.json
├── emdash-env.d.ts  worker-configuration.d.ts  .env.example  .gitignore
├── seed/seed.json            ← entire content model + demo content
└── src/
    ├── worker.ts  live.config.ts
    ├── styles/   tokens.css · theme.css · global.css
    ├── layouts/  Base.astro · Page.astro
    ├── components/
    │   ├── blocks/      Hero · WorkStrip · IntroCard · Career · StatsTicker
    │   │                Awards · ProjectsGrid · Process · Services · Faq · ContactForm
    │   ├── cards/       ProjectCard · ServiceCard · ExperienceRow · FaqRow
    │   ├── nav/         Header · Footer · MobileMenu
    │   ├── primitives/  Button · Chip · Ticker · Reveal
    │   ├── PortfolicaBlocks.astro
    │   └── seo/         Seo.astro · JsonLd.astro
    ├── lib/      queries.ts · seo.ts · format.ts
    └── pages/
        ├── index.astro · about.astro · contact.astro · all-projects.astro
        ├── project-details/[slug].astro
        ├── legal/[slug].astro · [slug].astro
        ├── 404.astro · rss.xml.ts
```

Conventions: one component per file named for its block type; every CMS read goes through `src/lib/queries.ts` so
cache-hint handling lives in one place; `tokens.css` is off-limits and `theme.css` is the sanctioned edit surface.

---

## 10. Risks

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| R1 | React admin bundle leaking into public routes | high | assert zero-JS on public routes in build check |
| R2 | Seed can't be reapplied after setup | medium | document schema evolution; always test on a fresh DB |
| R3 | SSR + D1 latency | medium | Workers Cache; place Worker near D1 |
| R4 | 1.5s spring entrances feel slow / hurt CLS | medium | reserve space, animate only `opacity`/`transform`, verify LCP |
| R5 | EmDash upgrades breaking a shipped template | medium | pin exact versions; follow upstream `upgrading-emdash` skill |
| R6 | Ticker speed not readable from source | low | match by eye in Phase 4 |
| R7 | `templates/portfolio-cloudflare` is `v0.0.3` and moving | low | pin to audited commit; re-verify before release |

---

## 11. Phases

| Phase | Deliverable | Commit |
| --- | --- | --- |
| **1** | This document | `docs: phase 1 audit and plan` |
| 2 | Scaffold · Tailwind + tokens · Base layout · Inter · SEO/OG/sitemap/RSS · 404 · seed | `feat: phase 2 foundation` |
| 3 | Components 1:1 · pages · dynamic routes · CMS menus/settings · a11y | `feat: phase 3 components and pages` |
| 4 | Motion · View Transitions · reduced-motion · Lighthouse 95+ | `feat: phase 4 motion and polish` |
| 5 | Deploy · custom domain · setup wizard | `chore: phase 5 deployment` |
| 6 | `AGENTS.md` · `design.md` · prompt snippets · Cursor rules | `docs: phase 6 ai-ready package` |
| 7 | README · LICENSE · CHANGELOG · third-party notices | `docs: phase 7 buyer docs` |

### Deployment notes for Phase 5

`wrangler login` → `npm run build` → `npx wrangler deploy`, then custom domain:

```jsonc
{ "routes": [{ "pattern": "www.example.com", "custom_domain": true }] }
```

> **Ordering trap.** Without `siteUrl` / `EMDASH_SITE_URL` / `SITE_URL`, setup records whatever address it runs on
> as the site origin — and **passkeys only work at the address where they were created**. Correct sequence:
> add custom domain → redeploy → *then* run setup at `/_emdash/admin`. Getting it backwards means re-registering
> passkeys.

`EMDASH_ENCRYPTION_KEY` is set by the site owner via `wrangler secret put`; it never enters the repo or `.env`.

---

## 12. Resolved decisions

| # | Question | Decision |
| --- | --- | --- |
| 1 | "Good work gets noticed" | **Testimonials.** Collection added (§6); content measured from the runtime DOM. |
| 2 | Contact delivery | **`mailto:`**, address from the CMS (see below). |
| 3 | `404` nav item | **Kept.** 1:1 with the original. |
| 4 | Scope | **Faithful 1:1.** No blog, team or extra sections. |
| 5 | LICENSE terms | Pending from owner; third-party notices handled regardless. |

### Contact form — how it works and why

The form collects Name, Email and Project Information, then opens the visitor's mail client with a prefilled
message. No backend, no account, no recurring cost, and it works for every buyer the moment they deploy. This
matches the first-party EmDash portfolio template, which states: *"The contact page sends visitors to their email
app instead of accepting a form submission."*

Honest trade-off: `mailto:` depends on the visitor having a mail client configured. Some desktop webmail users get
nothing. Documented in the README with two upgrade paths a buyer can take in one file:

- a free form service (Formspree / Web3Forms free tiers) — change the form `action`
- EmDash's email integration with a provider such as Resend (free tier) — for server-side delivery and
  notification emails

**The address is a CMS field, never hardcoded.** `site_options.contact_email` drives both the form and the header
email icon. The shipped seed uses a neutral placeholder (`hello@example.com`); the owner sets their own address in
the admin on their own deployment.

> This matters commercially. Baking a real address into a template that sells hundreds of copies means every
> buyer's site mails that address until they change it, and publishes it on every deployed copy for scrapers to
> harvest. A CMS field costs nothing and avoids both.
