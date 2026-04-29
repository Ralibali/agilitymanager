# Changelog

All notable visual and structural changes for the AgilityManager brand
roll-out are documented here. Functional behaviour, copy, pricing, and
business logic are unchanged unless explicitly noted.

---

## v4.0-brand — Brand foundation roll-out

A four-phase visual overhaul that introduces the new "Forest + Lime on
warm sand" brand identity across the entire app, without changing any
flow, copy, or pricing.

### Phase 1 — Brand foundation (`brand/foundation`)

- Installed brand fonts: `@fontsource/geist`, `@fontsource-variable/inter`,
  `@fontsource/instrument-serif`, imported in `src/main.tsx`.
- Extended `tailwind.config.ts`:
  - Brand colours: `bone`, `bone-2`, `cream`, `forest`, `forest-soft`,
    `moss`, `moss-deep`, `lime`, `coral`, `stone`.
  - Font families: `font-brand-display` (Geist), `font-brand-sans`
    (Inter Variable), `font-brand-serif` (Instrument Serif).
  - Border radius: `rounded-pill-full` (9999px).
- Added `.tabular` utility in `src/index.css`.
- New brand primitives in `src/components/brand/`:
  - `BrandPill` — pill badge in `moss`, `lime`, `coral`, `forest` with
    optional dot.
  - `CoursePath` — decorative agility-course SVG (`arc`, `zigzag`,
    `weave`) with lime/coral endpoint accents.
  - `StatTile` — numeric stat display with label, unit, trend.
- Added `brand` and `brand-outline` variants to the shadcn `Button`.

### Phase 2 — Public landing (`brand/landing`)

- Mapped CSS token `--bg-page` to bone (`#F5F1E8`) so the public surface
  follows the brand palette globally.
- Re-skinned `Hero` and `LandingNav`: brand-display headline (kept the
  green accent on "ni tränar för."), 3 retained value cards in the new
  white surface skin, brand-pill date label, Button variant `brand` for
  primary CTA. Logo lockup uses `agility` + `manager` (60% opacity).
- All landing copy, links, and CTAs preserved verbatim.

### Phase 3 — Logged-in dashboard (`brand/dashboard`)

- `V3Sidebar`: bone background, lime 4px active-rail (no fill),
  sentence-case section labels, bone-2 footer tile, logo with lime "A".
- `DogHero`: white card with forest avatar, BrandPill (`moss`/`coral`)
  for badges, lime/forest active-state in the dog switcher.
- `V3HomePage`:
  - Greeting hero: `bg-bone-2`, brand-pill date, `CoursePath weave`
    decoration, dog circle with moss border, Button variant `brand`.
  - 4 quick-action tiles: white cards with 4px coloured left border
    (`lime`, `coral`, `moss`, `stone`) and matching icon circles.
  - "Nästa bästa steg": cream cards with lime arrow circle and
    BrandPill section header.
  - "Din aktiveringsresa": forest card with bone text, lime progress
    bar, lime check circles for completed steps.
  - "Nästa upp", "Streak", "Klarade lopp": white/cream cards with
    `font-brand-display` 48px tabular numerals.

### Phase 4 — All other logged-in pages (`brand/app-pages`)

- Re-mapped all `--v3-*` CSS variables in `src/index.css` to the brand
  palette (bone/white/forest/moss/coral/lime/stone). This single change
  cascaded through all 14 pages and every sheet/dialog without touching
  individual files.
- Removed every `uppercase` class (96 occurrences) so all eyebrow labels
  are sentence case.
- Mapped hard-coded Tailwind colours to the brand palette:
  - `green-*` / `emerald-*` → `moss` / `moss-deep`
  - `amber-*` / `orange-*` / `red-*` / `rose-*` → `coral`
  - `blue-*` / `purple-*` → `bone-2` / `forest`
- Strict: no JSX restructuring, no copy changes, no hook/API/CRUD
  changes. Course planner canvas and stopwatch logic untouched.

### Phase 5 — Cleanup & polish (`brand/cleanup`)

- Removed the dark-mode toggle from `TopBar` (the `next-themes`
  ThemeProvider remains locked to `defaultTheme="light"` so any
  remaining `dark:` utilities are inert).
- Removed the last stray `dark:` class in `V3HealthPage`.
- Verified no dead colour tokens in `tailwind.config.ts` — `amber`,
  `surface-2`, `accent-green-light`, etc. are still referenced.
- Browser QA on `/v3`, `/v3/training`, `/v3/competition` at 1280px and
  375px: sidebar collapses correctly, bottom-nav appears on mobile,
  no horizontal scroll, BrandPill colours and CoursePath decorations
  render as expected.

---

## What this release does NOT change

- **Copy**: every headline, description, button label, helper text,
  pricing string, and testimonial is preserved verbatim. The only
  textual change is `ALL CAPS → Sentence case` on eyebrow labels.
- **Pricing & subscriptions**: Free / Pro (19 SEK/month) / Club tiers
  unchanged.
- **Functionality**: every form, CRUD flow, hook, API call, edge
  function, RLS policy, and route is unchanged.
- **Routes**: no new routes added or removed. `/v3` continues to be
  the logged-in shell.

---

## Migration notes for future work

- `--v3-*` CSS tokens are kept as **aliases** to the brand palette.
  They can be removed in a future pass once all `bg-v3-*`, `text-v3-*`,
  and `border-v3-*` utilities have been migrated to direct brand
  utilities (`bg-white`, `text-forest`, `border-forest/12`, etc.).
- Dark mode is currently disabled (toggle removed). If re-introduced,
  wire `bg-bone → dark:bg-forest`, `bg-white → dark:bg-forest-soft`,
  `text-forest → dark:text-bone`, `border-forest/12 → dark:border-bone/15`.
  `lime` and `coral` should remain identical in both modes.

---

## Suggested git workflow (manual)

Lovable manages git internally; merging brand branches and tagging the
release should be done in GitHub:

1. Merge in order: `brand/foundation` → `brand/landing` →
   `brand/dashboard` → `brand/app-pages` → `brand/cleanup` → `main`.
2. Tag the merge commit on `main` as `v4.0-brand` with the message
   "Brand foundation roll-out (Forest + Lime on Warm Sand)".
3. Push the tag: `git push origin v4.0-brand`.

The tag serves as a restore point if any phase needs to be reverted.
