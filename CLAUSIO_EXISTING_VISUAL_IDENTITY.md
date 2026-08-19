# Clausio — Existing Visual Identity

Reverse-engineered from the authenticated application source in `packages/web`. This document describes what is **actually implemented today** — no new styles, colors, or components are proposed. It exists as a reference for building a landing page that feels like the same product.

Primary sources inspected:
- `packages/web/src/styles/globals.css` (design tokens)
- `packages/web/tailwind.config.js`
- `packages/web/components.json` (shadcn config)
- `packages/web/src/components/ui/*` (primitives)
- `packages/web/src/components/dashboard/*`, `components/layout/*`, `components/contracts/*`
- `packages/web/src/layouts/AppLayout.tsx`

---

## 1. Brand Character

- **Grayscale-first, near-monochrome.** The entire theme (background, foreground, card, primary, secondary, muted, accent, border) is built from pure neutral OKLCH grays (`chroma = 0`). There is no dedicated brand hue — no "Clausio blue" or "Clausio purple" driving buttons or the logo.
- **Corporate / legal-tech, not playful.** Copy ("Legal Intelligence," "Organization portfolio," "Audit Logging"), the `Scale` icon as the logomark, and the restrained palette all read as enterprise legal software, not a consumer app.
- **Calm and quiet, not loud.** Primary buttons are near-black/near-white, not a saturated accent color. Emphasis is created through contrast and weight, not color.
- **Status color is the only place saturation appears.** Amber, emerald, red, and orange only ever show up to encode contract/risk status (Active, Expired, Critical, etc.) or notification type — never as decoration.
- **Dense-but-breathable data product.** Tables, KPI grids, and cards are compact (small type, `p-4`/`p-5` padding) but never cramped — consistent `gap-4`/`gap-6`/`space-y-6` rhythm keeps it legible.
- **Sharp-edged, not soft.** Radii are modest (`0.625rem` base, scaled down for nested elements). Nothing is heavily rounded except pills (badges, status dots) — this is a "moderately rounded, mostly square" interface.
- **Flat, not glossy.** Elevation comes from a single `shadow-sm` on cards/popovers plus 1px borders — no gradients, no glows, no glass/blur effects anywhere except the sticky header's backdrop blur.
- **Light-mode default, dark mode supported.** Dark mode is a real, maintained second theme (class-based `.dark`), toggled from the header, not an afterthought.
- **Font is a geometric, modern sans (Geist Variable)** — gives the product a technical, slightly startup-y edge inside an otherwise conservative gray palette.

---

## 2. Color System

All colors are defined as CSS variables in `globals.css` using OKLCH, consumed via Tailwind theme aliases in `tailwind.config.js` (`bg-background`, `text-foreground`, `border-border`, etc.). The base palette is shadcn's stock "neutral" theme — it has **not** been customized with a bespoke brand hue.

| Role | Actual Value (light) | Actual Value (dark) | Where Used |
|------|----------------------|----------------------|------------|
| Page background | `oklch(1 0 0)` (white) | `oklch(0.145 0 0)` (near-black) | `<body>`, main content area |
| Primary surface (card/popover) | `oklch(1 0 0)` white | `oklch(0.205 0 0)` dark gray | `Card`, dialogs, dropdown popups |
| Secondary surface (muted/accent) | `oklch(0.97 0 0)` off-white | `oklch(0.269 0 0)` | icon chips, KPI icon tiles, hover states, tab list background |
| Primary text | `oklch(0.145 0 0)` near-black | `oklch(0.985 0 0)` near-white | body copy, headings |
| Secondary/muted text | `oklch(0.556 0 0)` mid gray | `oklch(0.708 0 0)` | descriptions, sublabels, timestamps |
| Border | `oklch(0.922 0 0)` light gray | `oklch(1 0 0 / 10%)` white @10% | card borders, table row dividers, input borders |
| Primary accent (buttons/brand mark) | `oklch(0.205 0 0)` near-black | `oklch(0.922 0 0)` near-white | primary `Button`, sidebar logo tile (`bg-primary`), active table sort label |
| Ring/focus | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` | focus-visible outlines on inputs/buttons |
| Sidebar surface | `oklch(0.985 0 0)` (barely off-white) | `oklch(0.205 0 0)` | left navigation panel |
| Sidebar active item | `oklch(0.269 0 0)` (neutral dark gray, both modes tie to `--sidebar-active`) | same variable | active nav row background |
| Success | Tailwind `emerald-50`/`emerald-500`/`emerald-700` | | Active status, Low risk, positive KPI delta, "AI analysis complete" icon |
| Warning | Tailwind `amber-50`/`amber-500`/`amber-700`/`amber-900` | | Draft status, Medium risk, "expiring soon" notification icon, AI-insights caution card |
| Danger/High risk | Tailwind `orange-50`/`orange-500`/`orange-700` | | High risk level |
| Destructive | `oklch(0.577 0.245 27.325)` (red) | `oklch(0.704 0.191 22.216)` | Terminated status, Critical risk, delete/destructive buttons, error banners |
| Neutral/unset | Tailwind `slate-400` | | "Unset" legal state |

**Distinguishing color categories:**
- **Brand color:** none dedicated — the "brand" is expressed through near-black/near-white neutrals plus the `Scale` icon, not a hue.
- **Semantic status colors:** emerald (success/active/low-risk), amber (draft/medium-risk/expiring), orange (high-risk), red (destructive/terminated/critical). These are raw Tailwind palette utilities (`emerald-50`, `amber-500`, etc.), not CSS variables — they are applied ad hoc per status map (see `badges.tsx`, `ContractStatusOverview.tsx`, `KPICard.tsx`).
- **Incidental colors:** none observed beyond the status set above.
- **Latent/unused token:** `--sidebar-primary` in dark mode is defined as `oklch(0.488 0.243 264.376)` — a saturated blue/indigo, the only chromatic token in the whole system. It is part of shadcn's stock theme scaffold but is **not actually referenced by any component** (active sidebar state uses the neutral `--sidebar-active` instead). Do not treat this as a real Clausio brand color.

**Effects inventory:**
- **Shadows:** only `shadow-sm` (cards, sidebar "floating" variant, sidebar-inset main panel) and `shadow-md`/`shadow-lg` (dropdown popups, dialogs). No large/dramatic shadows anywhere.
- **Gradients:** none found in any component.
- **Opacity/transparency:** used functionally — `bg-background/80` + `backdrop-blur` on the sticky header, `/10`, `/20`, `/40`, `/60` opacity suffixes to soften status colors (e.g. `bg-destructive/10`, `bg-accent/60`, `border-primary/20`) rather than defining new tints.
- **Overlays:** dialog/alert-dialog backdrop is flat `bg-black/40`.
- **Glow effects:** none.

---

## 3. Typography

- **Font family:** `Geist Variable` (via `@fontsource-variable/geist`), falling back to generic `sans-serif`. Set globally through `html { @apply font-sans }` and the `--font-sans` CSS variable. This is a real custom font, not a system fallback.
- **Weights used in practice:** regular (body), `font-medium` (labels, table headers, buttons, badges), `font-semibold` (KPI values, card titles, user name), `font-bold` (page `h1`). No light/thin weights observed.
- **Heading sizes:**
  - Page title (`Dashboard`): `text-2xl font-bold tracking-tight`
  - Card title (`CardTitle`): `text-2xl font-semibold` by default, frequently overridden down to `text-base font-semibold` for panel headers (AI Insights, Legal State Overview)
  - KPI value: `text-3xl font-semibold tracking-tight`
  - Status-breakdown count: `text-2xl font-semibold tracking-tight`
- **Body sizes:** `text-sm` (default UI text, table cells, descriptions) and `text-xs` (sublabels, timestamps, badge text, sidebar group labels). A tighter `text-[13px]` and `text-[12px]` appear specifically in AI summary/risk copy for denser reading blocks.
- **Labels/microcopy:** `text-xs`/`text-[10px]`/`text-[11px]` with `font-medium`, sometimes `uppercase tracking-wide` (severity badges, "Source" quote label).
- **Button typography:** `text-sm font-medium`, no letter-spacing.
- **Tracking:** `tracking-tight` on large numerals and headings (KPI values, page title, card titles); `tracking-wide` used only for uppercase micro-labels (severity badge, source label).
- **Line height:** default leading for body text; `leading-none` on tight headings (`CardTitle`); `leading-relaxed` on longer descriptive/AI-generated copy.

**Practical scale:**
```
Page H1:        24px / bold / tracking-tight
Panel title:     16px (text-base) / semibold
KPI value:       30px (text-3xl) / semibold / tracking-tight
Stat count:      24px (text-2xl) / semibold / tracking-tight
Body:            14px (text-sm) / regular
Dense body (AI): 13px / regular / leading-relaxed
Small/meta:      12px (text-xs) / regular or medium
Micro label:     10-11px / medium / uppercase+tracking-wide (status/severity only)
```

If a custom typeface were unavailable for the landing page, the honest fallback is plain `sans-serif` — the app makes no special accommodation for a fallback beyond that.

---

## 4. Spacing System

Recurring values, not exhaustive:

- **Page content padding:** `p-6` (`AppLayout.tsx main`), page-level vertical rhythm `space-y-6`.
- **Section/grid gaps:** `gap-4` between KPI cards and grid columns; `gap-6` between major page sections is achieved via `space-y-6` on the page wrapper.
- **Card padding:** header `p-4`, content `p-4 pt-0` (shadcn default `Card`); dashboard KPI cards override to `p-5`; footer `p-6 pt-0`.
- **Compact list/detail padding:** `p-3` to `p-3.5` for smaller nested cards (risk-flag cards, notification dropdown items, sidebar groups).
- **Sidebar dimensions:** expanded width `16rem` (`SIDEBAR_WIDTH`), icon-collapsed width `3rem`, mobile sheet width `18rem`. Sidebar sections padded `p-2`.
- **Header dimensions:** fixed height `h-16`, horizontal padding `px-4` (mobile) / `px-6` (desktop), inner element gap `gap-3`.
- **Table row/cell spacing:** header cell `h-10 px-2`; body cell `p-2`; row identity icon block `size-9`.
- **Icon chip sizing:** `size-10` (KPI icon tile), `size-9` (table row icon), `size-8`/`size-7` (avatars, sidebar icon slots), `size-5`/`size-4`/`size-3.5`/`size-3` for inline icons depending on context.
- **Grid breakpoints:** KPI grid `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`; dashboard secondary sections `grid-cols-1 lg:grid-cols-5` split `lg:col-span-3` / `lg:col-span-2`.
- **Gaps between inline elements:** `gap-1.5` (icon+label pairs, button icon gaps), `gap-2` (nav items, header controls), `gap-2.5`/`gap-3` (avatar+content rows).

Overall philosophy: a tight 4px-based scale (Tailwind default) applied consistently, favoring `2`/`3`/`4`/`6` step multiples; nothing exotic or off-grid.

---

## 5. Shapes

- **Border radius base:** `--radius: 0.625rem` (10px), with derived scale `lg = 10px`, `md = 8px`, `sm = 6px` (`radius - 2px` / `radius - 4px`).
- **Cards:** `rounded-lg` (10px) — the dominant "box" radius across cards, dialogs, dropdown popups, sidebar-inset panel.
- **Buttons/inputs:** `rounded-md` (8px) — slightly tighter than cards.
- **Badges/status pills/avatars/status dots:** fully rounded (`rounded-4xl` on the shadcn `Badge` primitive, `rounded-full` on `StatusBadge`/`RiskBadge`/`SeverityBadge`, avatar circles, notification dot, progress bar track). This is the one place the UI goes "pill."
- **Dialogs:** `rounded-lg`, centered, `max-w-md`.
- **Table container:** no radius of its own — it inherits the rounding of its wrapping `Card` (`overflow-hidden` on the card clips the table to that radius).
- **Sidebar floating variant:** `rounded-lg` with a 1px ring.

**Dominant shape language:** moderately rounded overall (8–10px on structural elements), with a deliberate pill-shaped exception reserved specifically for status/identity elements (badges, avatars, dots). Not sharp/technical, not heavily rounded — a restrained, "enterprise SaaS" middle ground.

---

## 6. Borders & Elevation

Elevation is created primarily through **borders + light background contrast**, with shadow used sparingly:

- **Borders are the primary depth cue.** Every card, table row, input, and popup has a 1px border (`border-border`, `oklch(0.922 0 0)` light / `oklch(1 0 0 / 10%)` dark). Table rows are separated by `border-b` rather than by alternating background stripes.
- **Shadows are minimal and flat:** `shadow-sm` on cards and the sidebar-inset panel; `shadow-md` on dropdown menus; `shadow-lg` on dialogs. No multi-layer or colored shadows.
- **Background contrast** (surface vs. `muted`/`accent`) is used for hover states (`hover:bg-muted/50` on table rows), icon chips (`bg-accent`), and selected states (`data-[state=selected]:bg-muted`) rather than borders alone.
- **Left accent borders:** a `border-l-2 border-primary/40` is used once, on the AI risk "Source quote" block, to mark quoted/cited content — a citation pattern, not general UI chrome.
- **Blur/glass:** the only blur in the app is `backdrop-blur` combined with `bg-background/80` on the sticky header — a subtle "frosted" effect on scroll, not a broader glassmorphism treatment.
- **Inset/ring borders:** dropdown/menu popups use `ring-1 ring-border` in addition to their shadow for a crisper edge; the sidebar's "floating" variant uses `ring-1 ring-sidebar-border`.

No gradients are used for elevation or depth anywhere in the codebase.

---

## 7. Component Language

- **Button** (`components/ui/button.tsx`): `rounded-md`, `h-10` default (`h-9` sm / `h-11` lg / `h-10` square icon). Variants: `default` (near-black bg, `hover:bg-primary/90`), `outline` (1px border + transparent bg, fills with `accent` on hover), `secondary` (light gray bg), `ghost` (no bg until hover), `destructive` (red bg), `link` (text-only, underline on hover). No color transition beyond opacity/background — no scale or shadow animation.
- **Card** (`components/ui/card.tsx`): white/dark-gray surface, `rounded-lg border shadow-sm`. Always composed via `CardHeader` → `CardTitle`/`CardDescription` → `CardContent` → optional `CardFooter`. Dashboard-specific cards (KPI, contracts table) override default padding for density.
- **Badge**: two flavors coexist — the shadcn primitive (`rounded-4xl`, filled `default`/`secondary`/`destructive`/`outline`/`ghost` variants, used for counts like the notification badge) and domain-specific wrappers in `badges.tsx` (`StatusBadge`, `RiskBadge`, `SeverityBadge`) that always render `variant="outline"` plus a semantic Tailwind color pair (`bg-emerald-50 text-emerald-700 border-emerald-200`, etc.) and force `rounded-full`. Risk badges add a small colored dot before the label.
- **Input**: `h-10 rounded-md border border-input bg-background`, `focus-visible:ring-2 ring-ring ring-offset-2`. Search input in the header adds a leading icon and a `kbd`-styled "Ctrl K" hint.
- **Table**: borderless container, `border-b` row dividers, `hover:bg-muted/50` row hover, sortable headers rendered as ghost buttons with an `ArrowUpDown`/`ArrowUp`/`ArrowDown` icon that highlights (`text-foreground`) when active.
- **Modal/Dialog (Alert Dialog)**: centered fixed-position popup, `rounded-lg border bg-popover shadow-lg`, `bg-black/40` backdrop, scale+fade enter/exit transition (`data-starting-style`/`data-ending-style`, ~150ms). Footer buttons stack on mobile, right-align on desktop.
- **Sidebar**: collapsible (`icon` mode collapses to `3rem` rail), off-canvas sheet on mobile. Logo mark is a `size-8` rounded-lg tile in `bg-primary`/`text-primary-foreground` holding a `Scale` icon, next to the "Clausio / Legal Intelligence" wordmark. Nav items are `SidebarMenuButton`s with icon + label, `rounded-md`, active state = `bg-sidebar-active` + `font-medium`. Footer shows a user avatar-initials tile + role line + chevron (account-switcher affordance, though not wired to a menu here).
- **Header**: sticky, `h-16`, translucent+blurred background, contains sidebar trigger, global search input, theme toggle, notifications dropdown (bell icon with a red unseen-dot), and sign-out — all rendered as `variant="outline" size="icon"` square buttons.
- **KPI card**: icon chip (`bg-accent`, rounded-lg) top-left, optional colored delta pill (green/red, rounded-full, arrow icon) top-right, large semibold value, medium label, muted sublabel underneath.
- **Contract list/row**: table row with a small `bg-accent` file icon, title as a hover-underline link, muted secondary columns, `StatusBadge` for status, and a row-level actions trigger revealed via `ContractRowActions`.
- **AI analysis elements** (`ContractInsights.tsx`): tabbed panel (`Summary` / `Risk` / `Notes`, icons + counts). AI-generated summary text is prefixed by a small "AI-generated — review before relying on it" disclosure row (`Sparkles` icon, `bg-accent/60`, `border-primary/20`). Risk items are individual bordered cards with a `SeverityBadge`, description, and a quoted source-text block styled like a citation (`border-l-2 border-primary/40`, italic, `Quote` icon). Notes render as a chat-like thread (avatar + bubble + relative timestamp) with a composer bar pinned to the bottom.

---

## 8. Iconography

- **Library:** `lucide-react` exclusively (used in 60+ files) — confirmed as the `iconLibrary` in `components.json`.
- **Style:** outline/stroke icons, not filled. Default Lucide stroke width (2px) is used unmodified — no custom stroke-width overrides observed.
- **Sizing:** driven by Tailwind `size-*` utilities layered onto the icon component, ranging from `size-3` (12px, inline micro-icons like sort arrows) up to `size-6` (24px, empty-state icons) and `size-5` (20px, KPI icons). Most inline icons sit at `size-4` (16px).
- **Color:** icons inherit `currentColor` — typically `text-muted-foreground` for secondary/decorative icons, `text-foreground`/`text-primary-foreground` for emphasized ones, and semantic status colors (`text-destructive`, `text-emerald-600`, `text-amber-600`) when representing state.
- **Placement pattern:** icons are frequently housed in a small square/rounded "chip" (`flex size-8-10 items-center justify-center rounded-lg bg-accent`) rather than floating bare — this chip-with-icon pattern recurs across the sidebar logo, KPI cards, table row identity, empty states, and notification items.

---

## 9. Dashboard Visual DNA

What makes the dashboard read as distinctly Clausio:

- **Density:** compact but airy — small type (`text-sm`/`text-xs` dominate), tight icon chips, yet consistent `gap-4`/`space-y-6` breathing room between blocks keeps it from feeling cramped. This is a data-dense enterprise dashboard, not a marketing-style spacious layout.
- **Hierarchy:** established almost entirely through size/weight, not color. A page has one bold `text-2xl` title, several `text-base font-semibold` panel titles, `text-3xl font-semibold` KPI numerals, and everything else recedes to `text-sm`/`text-xs` muted gray. Color is reserved strictly for status semantics.
- **Surfaces:** every block of content lives inside a bordered, `rounded-lg`, `shadow-sm` white/dark-gray `Card` — the dashboard is legible as a grid of cards, never bare content floating on the page background.
- **Data presentation:** KPI cards (icon chip + big number + label + optional delta pill) at the top, a segmented/stacked bar (`Legal State Overview`) for distribution, a real data table for recent contracts, and list-style panels (activity feed, expiring contracts) below — a classic top-down "glance → detail" dashboard structure.
- **Cards:** consistently `p-4`–`p-5`, icon top-left convention, muted description under titles, empty/error states rendered inline within the same card shell (never a separate blank page).
- **Whitespace:** generous card-to-card gaps (`gap-4`) and page-level `space-y-6`, but tight internal padding — whitespace separates blocks, not content within a block.
- **Navigation:** persistent left sidebar (collapsible to icon rail), grouped into "Workspace" and "Administration" sections with uppercase-ish small group labels, active item marked by a solid neutral-gray background rather than a colored highlight.
- **Colors:** near-monochrome chrome punctuated only by semantic status color (emerald/amber/orange/red) on badges, dots, and delta pills — color is information, not decoration.
- **Typography:** Geist Variable throughout, `tracking-tight` on large numerals for a crisp, engineered feel.
- **Interaction patterns:** hover states are subtle background shifts (`hover:bg-muted/50`, `hover:bg-accent`), focus states are a 2px ring, transitions are short/utilitarian (`transition-colors`, ~150ms on dialogs) — nothing bouncy or dramatic. Loading states are plain text/spinner (`Loader2` with `animate-spin`), not skeleton-heavy shimmer beyond the sidebar's own `Skeleton` component.

A landing page can be more cinematic and motion-forward, but should keep: the near-monochrome neutral base, status color used sparingly and semantically, `rounded-lg`/`rounded-md` structural radii with pill-shaped badges/avatars as the one accent shape, border-first elevation with only soft `shadow-sm`/`shadow-lg`, Geist Variable typography with tight tracking on large numerals, and the icon-in-a-chip motif.

---

## 10. Design Tokens

```text
BACKGROUND:
  Light: oklch(1 0 0)              (white)
  Dark:  oklch(0.145 0 0)          (near-black)

SURFACES:
  Card/Popover (light): oklch(1 0 0)
  Card/Popover (dark):  oklch(0.205 0 0)
  Muted/Accent (light): oklch(0.97 0 0)
  Muted/Accent (dark):  oklch(0.269 0 0)
  Sidebar (light):      oklch(0.985 0 0)
  Sidebar (dark):       oklch(0.205 0 0)

TEXT:
  Primary (light):   oklch(0.145 0 0)
  Primary (dark):    oklch(0.985 0 0)
  Muted (light):      oklch(0.556 0 0)
  Muted (dark):       oklch(0.708 0 0)

ACCENT:
  No dedicated brand hue. "Primary" action color is near-black (light) / near-white (dark):
    Light: oklch(0.205 0 0), Dark: oklch(0.922 0 0)
  Brand identity carried by wordmark ("Clausio") + Scale icon, not by color.

BORDERS:
  Light: oklch(0.922 0 0)
  Dark:  oklch(1 0 0 / 10%)
  Weight: 1px, used pervasively (cards, rows, inputs, popups)

RADIUS:
  Base:  0.625rem (10px)  -> Card, Dialog, Dropdown, Sidebar-floating
  Mid:   8px (radius - 2px) -> Button, Input
  Small: 6px (radius - 4px) -> nested/compact controls
  Pill:  fully rounded -> Badge, Avatar, status dots, progress track

TYPOGRAPHY:
  Font: "Geist Variable", sans-serif (fallback)
  H1:            24px / bold / tracking-tight
  Panel title:    16px / semibold
  KPI value:      30px / semibold / tracking-tight
  Body:           14px / regular
  Dense/AI body:  13px / regular / leading-relaxed
  Small/meta:     12px / regular-medium
  Micro label:    10-11px / medium / uppercase + tracking-wide (status only)

SPACING:
  Page padding:      24px (p-6)
  Section rhythm:    24px (space-y-6)
  Grid/card gaps:    16px (gap-4)
  Card padding:       16-20px (p-4 / p-5)
  Compact card pad:  12-14px (p-3 / p-3.5)
  Sidebar width:     256px expanded / 48px icon-collapsed
  Header height:     64px (h-16)

BUTTONS:
  Height: 40px default (36px sm, 44px lg, 40px icon-square)
  Radius: 8px (rounded-md)
  Primary: near-black/near-white fill, 90% opacity on hover
  Outline: 1px border, transparent fill, fills with muted-accent on hover
  Type: 14px / medium, no letter-spacing

STATUS COLORS (semantic only, raw Tailwind palette — not theme tokens):
  Success / Active / Low risk:      emerald-50 / emerald-500 / emerald-700
  Warning / Draft / Medium risk:    amber-50 / amber-500 / amber-700 / amber-900
  High risk:                        orange-50 / orange-500 / orange-700
  Destructive / Terminated / Critical: red / oklch(0.577 0.245 27.325) (light), oklch(0.704 0.191 22.216) (dark)
  Neutral / Unset:                  slate-400

ELEVATION:
  Card:     shadow-sm + 1px border
  Popup:    shadow-md + ring-1 ring-border
  Dialog:   shadow-lg, centered, 150ms scale/fade transition
  Header:   bg-background/80 + backdrop-blur (only blur usage in the app)

ICONOGRAPHY:
  Library: lucide-react, outline style, default 2px stroke
  Sizes: 12-24px depending on context (16px most common)
  Pattern: icon housed in a rounded-lg, bg-accent "chip" square (32-40px)
```
