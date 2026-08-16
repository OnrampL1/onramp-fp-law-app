# Clausio — Creative Direction & Landing Experience v1

Role: lead product designer / creative director. This is a **direction document**, not an implementation. No React code, no application changes, no dependencies. It is written to be handed to a build agent afterward.

Grounded in `CLAUSIO_EXISTING_VISUAL_IDENTITY.md` (the authenticated app's actual, reverse-engineered visual system) and in full token-level teardowns of the four references (REKKI, Dovetail, Frame.io, Dayos/AI for Business — colors, type scales, radii, elevation, component specs, and layout, not just impressions). §2 names each reference's techniques precisely and states explicitly what is translated into Clausio's own tokens versus rejected outright; no hex code, font family, or px value from any reference is to be imported directly.

---

## 1. What Clausio Actually Does (scope guardrail)

Real, confirmed capabilities to draw the story from — nothing beyond this list:

Contract management · lifecycle/legal-state tracking · contract metadata · contract upload · AI-generated contract summaries · AI risk analysis with severity levels and **cited source text** · internal notes · audit history/logging · witness access workflow · role-based access (Owner/Admin/User) · organization/tenant isolation · admin & user management.

**One accuracy flag before proceeding:** the creative brief (§17) asks for a "clause investigation" story where a user *asks a question about a clause and receives a cited answer* — an interactive Q&A pattern. The current app does not have a chat/Q&A interface. What it *does* have is the risk-analysis citation pattern: each AI-identified risk is paired with the exact quoted source text it was derived from (`ContractInsights.tsx`, the "Source" quote block). That citation pattern is real, is a genuine differentiator, and is dramatic enough to carry the story. This document uses **"traceable analysis" (cited risk findings)** as the product proof point instead of inventing a Q&A chat feature. If a real Q&A/investigation feature ships later, this section of the landing page can be upgraded to match — but nothing should be built against it now.

---

## 2. What We Borrow

### REKKI — the strongest structural match

**Take:** a near-black canvas carrying exactly **one** saturated accent, used only for the primary CTA and active states — nothing else on the page is chromatic. Depth built entirely from a graduated multi-level surface stack (background → panel → card → input → overlay, each a small luminance step apart) plus a hairline inset border, with **zero drop shadows**. Real product UI screenshots as the actual hero image, not illustration.
**Reject:** REKKI's specific accent hue and custom display typeface, and — most importantly — its near-total commitment to pill-radius on every button. Clausio's own component language already draws a hard line (badges/avatars/status get pills, buttons stay `rounded-md`); adopting pill-everywhere would blur a distinction the app already relies on.
**Translation:** the existing neutral surface stack (`background → card → muted/accent`) plus the app's own border tokens is enough to build the dark "Control & Trust" section's depth (§10 row 6) — REKKI proves the *shadow-free, border/luminance-only* approach works at scale, which is direct validation of Clausio's existing `shadow-sm`-only philosophy, not a reason to add anything new.

### Dovetail — validates the accent+elevation strategy, adds the "section stamp" pattern

**Take:** the same "one accent, luminance-stepped surfaces, no shadows" discipline as REKKI — two independent references converging on identical mechanics is strong evidence this is the right approach for a dark, data-forward product page (see §4). Also: a small, uppercase, wide-tracked label sitting above every section headline as a consistent "section stamp," and strict left-alignment of body copy under headlines (never centered).
**Reject:** Dovetail's specific accent hue, its second typeface reserved for those labels, and its decorative background grid pattern.
**Translation:** keep the section-stamp *pattern*, but build it from Geist Variable's own uppercase + `tracking-wide` treatment — the exact device Clausio's `SeverityBadge` already uses (`text-[10px] uppercase tracking-wide`, per the visual identity doc) — not a second font family. Borrow the pattern, not the typeface.

### Frame.io — validates cinematic product staging, sharpens the type principle

**Take:** the "weight whispers, size shouts" principle — display headlines stay at a normal/medium weight even at very large sizes, with tracking scaling tighter as size increases, so scale and negative tracking carry authority instead of boldness. Also: product UI shown inside a thin-bordered container (a halo, not a shadow) floating with depth against the background, and strict single-accent discipline maintained even inside a moodier composition.
**Reject:** Frame.io's mandatory layered-gradient backgrounds (every surface in their system sits on at least one gradient), its custom display typeface, and its extreme full-pill radius applied to every interactive element, nav included.
**Translation:** apply the weight/tracking principle directly to Geist Variable in hero and section headlines (§5) — a typographic technique, not a brand asset, and a clean way to make Clausio's existing font read as more cinematic without changing it. The gradient-heavy atmosphere is explicitly rejected: it directly conflicts with Clausio's flat, gradient-free surface language (§3, §17 DON'T) and with this brief's own instruction against adding gradients because they look modern.

### Dayos / AI for Business — the deliberate outlier

**Take:** the confidence to commit to one very large, editorial visual statement per section instead of a grid of small feature blocks — and, specifically for the instrument concept (§6), its *execution technique*: a photorealistic, tactile, materially-rendered object (texture, weight, physical presence) rather than an illustration, icon, or cartoon. That rendering register — precise and physical, not drawn — is exactly how the intelligence instrument should be built.
**Reject nearly everything else:** this is a **light**, warm-gray-canvas, brutalist system with massive uppercase condensed display type and a mint-green + neon-yellow accent pair — the reference furthest from Clausio's identity (which is dark-capable, neutral, restrained, sentence-case, single-cool-accent). Its color pair, its uppercase-everything type case, and its large freeform radius scale should not inform Clausio's color, type case, or radius decisions at all.

**Net pattern across all four:** three of four references independently converge on the same discipline — near-monochrome base, exactly one chromatic accent, elevation through borders/surface-stepping rather than shadows. That convergence is strong external validation for the color and elevation direction already set in §4 and §17, not a reason to revisit it.

---

## 3. Clausio Non-Negotiables

Verified against `CLAUSIO_EXISTING_VISUAL_IDENTITY.md` — these must survive into the landing page unchanged in spirit:

- Near-monochrome neutral base (OKLCH grayscale); no existing chromatic brand color to preserve, because there isn't one.
- Geist Variable typography, `sans-serif` fallback.
- Border-first depth: 1px borders + `shadow-sm`/`shadow-md`/`shadow-lg` only — no large decorative shadows, no glow, no glassmorphism.
- Structural radius 8–10px (`rounded-md`/`rounded-lg`); pill shapes (`rounded-full`) reserved for badges, avatars, and status dots — not general layout chrome.
- Lucide outline icons, 2px stroke, icon-in-a-chip pattern (icon inside a small `rounded-lg`, tinted-surface square).
- Color used semantically, not decoratively: emerald/amber/orange/red map to real contract/risk states only.
- Calm, precise interaction language: subtle background-shift hovers, 2px focus rings, short (~150ms) transitions — nothing bouncy.
- Enterprise/legal tone in voice and pacing: precise, unembellished, confident — not hype-driven.

---

## 4. Color Direction

**Recommendation: C — a single, very restrained accent used only for cinematic/transformation moments.**

The app has no dedicated brand hue today (confirmed — even the one chromatic token in the codebase, dark-mode `--sidebar-primary`, is unused dead scaffolding). Two purist options exist — stay fully monochrome (A), or introduce a real brand color (B) — but both are wrong for this brief:

- **Pure monochrome (A)** starves the "transformation" narrative (§6) of a way to visually mark the moment intelligence is created. A story about turning noise into structure needs *one* visual signal for "this is where meaning appears."
- **A true brand color (B)** would be a genuine architecture decision — new brand identity, new token, eventual propagation into the authenticated app — which this brief is explicitly not authorized to make (§24: "Do not add arbitrary brand colors").

**Recommended approach (C):** introduce one desaturated, cool, near-neutral accent — conceptually an **ink/graphite-blue**, close enough to the existing neutral scale that it reads as "the grayscale system turning on" rather than "a new brand color was added." Use it in exactly three places:
1. The hero's transformation moment (document → structured data).
2. The data-motion accents in the Intelligence section (clause/obligation/risk/insight state changes, §15).
3. The single primary CTA, as the one moment of full-saturation emphasis on the page.

Everywhere else — headers, cards, product previews, trust section — stays on the existing neutral scale. Target coverage: under 5% of any given viewport. This is not a new brand color; it is a **narrative accent scoped to the landing page**, and it should **not** propagate into the authenticated application without a separate, explicit decision — that is a real domain/architecture question, not a byproduct of a marketing brief.

Semantic status colors (emerald/amber/orange/red) are reused only when the landing page shows real product UI (e.g., a risk badge inside a product preview) — never repurposed as decorative accents elsewhere on the page.

**External validation:** the full teardown of the four references (§2) shows REKKI, Dovetail, and Frame.io independently arriving at the identical formula — near-monochrome base + exactly one chromatic accent, rationed to CTAs/active-states/small marks, never a fill or wash. That three independent products converge on this exact discipline is a strong signal that option C is the right shape for this brief, not just a compromise between A and B.

---

## 5. Typography Direction

Keep Geist Variable as the only typeface — this is one of the clearest threads connecting the landing page to the product.

What the landing page is allowed to do that the app doesn't:
- **Display scale:** large editorial numerals and headlines (60–96px+ range) for hero/section statements — the app tops out around 30px (KPI values); the landing page can go much bigger for its "editorial moments" (§10, Dayos influence) without touching a different font family.
- **Tighter tracking at large sizes**, consistent with the app's existing `tracking-tight` treatment on big numerals — just pushed further as size increases, following Frame.io's "weight whispers, size shouts" principle (§2): keep display headlines at a normal/medium Geist Variable weight even at very large sizes, and let scale plus increasingly negative tracking carry the authority instead of bolding. This is directly compatible with the app's own restraint (it never uses heavy/black weights anywhere) and simply extends it upward.
- **More whitespace around type** than the dense app allows — the app is a working tool; the landing page can let a single sentence own a full viewport.
- **Editorial pull-quotes / oversized data callouts** (e.g., a single huge stat rendered the way a KPI value is rendered today, just much larger) as scroll-triggered moments.

What it must not do: introduce a second typeface, a serif, a script/display font, or heavy italics for "premium" effect — those would break the one typographic thread tying marketing to product.

---

## 6. The Robot Concept — decision

**Do not use a literal robot.** Recommended instead: an abstracted **"intelligence instrument"** — not a character, not a mascot, not anything with a face or personality. Reasoning:

- Every "not cartoonish / not cute / not mascot / not humanoid comedy" constraint the brief lists is a constraint the robot concept has to actively fight against. Even a well-executed industrial robot risks reading as a *character* the moment it's animated and interacting with documents — and legal-enterprise buyers are the audience least forgiving of anything that reads as a mascot.
- Clausio's actual visual language (§3) has zero precedent for character-based or illustrative elements. An instrument, not a character, preserves that.

**Execution reference:** the one usable technique from Dayos/AI for Business (§2) — the only reference of the four to feature a 3D object — is *how* it renders its hero object: photorealistic, materially textured, physically weighted, photographed rather than drawn. That register (precise and physical, not cartoon/illustrated) is exactly right for the intelligence instrument. Borrow the rendering technique; ignore everything else about that reference's content (its cube shapes, its logos, its color pair).

**The instrument:** a precise, minimal mechanical form — closer to a scanning gantry, an optical head, or a single articulated light/lens element than to a robot — that performs one legible action: it passes over a stack of physical/scanned contract pages and what emerges behind it is structured UI (clause tags, obligation cards, risk badges). It has no face, no limbs beyond what the action requires, no idle animation, no "personality" beats. It shows up only in the hero transformation moment (§8) and, optionally, as a recurring motif marking the "old way → structured intelligence" transition (§6/§15) if the hero version tests well — never as a standing decorative element.

If, during prototyping, this instrument concept over-complicates the build (see §21 performance guidance) it should be replaced by a **non-figurative version of the same beat**: the accent-colored "scan line" from §4 sweeping across the same document stack and producing the same structured output, with no mechanical object at all. Both versions tell the identical story (`old workflow → scanning/understanding → structuring → intelligence → Clausio`); the instrument is the more memorable version, the scan-line is the safer fallback. **This is a decision the build agent should be free to make based on implementation cost, not a re-open of the creative question.**

---

## 7. Core Story (confirmed, refined)

```
OLD WAY               Contracts scattered across PDFs, folders, drives, spreadsheets, email, memory
      ↓
TRANSFORMATION         Clausio reads and structures the information (the instrument/scan moment)
      ↓
INTELLIGENCE           Contract → Clauses → Obligations → Risks → Insights
      ↓
CONTROL                Understand · Find · Track obligations · Detect risk · Monitor lifecycle · Audit trail
      ↓
CLAUSIO                Contracts are no longer documents. They are structured intelligence.
```

This is the spine the section architecture (§10) is built from.

---

## 8. Hero Experience

Reject the standard heading + paragraph + two buttons + screenshot pattern.

**Concept:** the hero *is* the transformation moment from §6/§7, staged with Frame.io-style depth and pacing rather than explained in a paragraph.

- Opening state: a quiet, dense stack of ordinary contract artifacts (scanned pages, a spreadsheet, an email thread fragment) rendered in flat, muted neutral tones — deliberately unglamorous, almost archival, to sell "old way."
- The intelligence instrument (or scan-line fallback, §6) crosses the stack once, deliberately, not fast.
- In its wake, real Clausio UI fragments assemble — a clause tag, an obligation card, a risk badge, using the actual component language from `CLAUSIO_EXISTING_VISUAL_IDENTITY.md` (rounded-lg cards, border-first depth, Lucide icons) — not abstract shapes standing in for "data."
- The ink/graphite accent (§4) appears exactly once here, marking the instant of transformation, then recedes as the assembled UI settles into the normal neutral palette.
- Headline and subhead resolve only after the transformation completes — copy earns its place after the visual has made the claim, not before it.
- A single primary CTA appears last, in the accent color — the first and most restrained use of full saturation on the page.

This answers the three required questions without stating them outright: **what** (documents becoming structured product UI), **why different** (the transformation is shown, not claimed — no competitor screenshot does this), **why continue** (the assembled UI is visibly incomplete/inviting scroll — it reads as "there's more structure below").

---

## 9. Product Presentation

Borrowing Dovetail/Frame.io's "show, don't tell": the real Clausio component language (cards, tables, badges, tabs, icon-chips — as documented in the visual identity doc) is the primary visual material for the rest of the page, staged with depth rather than pasted as flat screenshots.

- **Portfolio view:** the contracts table (real row/status-badge/icon-chip styling) shown mid-filter or mid-sort, implying a live, working tool rather than a static mockup.
- **Detail transition:** a portfolio row visually expands/lifts into the contract detail + AI-insights tabbed panel (Summary / Risk / Notes) — reusing the actual tab and card treatment.
- **Risk extraction:** a risk card visibly assembling from a highlighted fragment of source text into the real "Source" quoted citation block — this is the section that carries the "traceable analysis" proof point from §1.
- **Audit/control:** a timeline or log strip (audit history) scrolling past, in the dark "control-room" register borrowed from REKKI (§2).

Rule: nothing shown should be an invented UI. If a screen doesn't exist in the app today (e.g., a Q&A chat), it does not appear on the landing page (§1).

---

## 10. Landing Page Information Architecture

| # | Section | Purpose | Main message | Visual concept | Product UI involved | Motion | Transition out |
|---|---------|---------|---------------|-----------------|----------------------|--------|------------------|
| 1 | Hero | Establish the transformation story immediately | "Contracts become structured intelligence" | §8 hero sequence | Assembled clause/obligation/risk fragments | Instrument sweep, one-time accent flash | Scroll pulls the assembled fragments into the next section's layout |
| 2 | Problem | Name the old way with specificity, not cliché | Scattered documents cost understanding, not just time | Flat, muted, archival composition of PDFs/spreadsheets/email — deliberately the least polished visual on the page | none (pre-product) | Static or very slow drift only | Instrument/scan motif re-enters, bridging to product |
| 3 | Product — Portfolio & Lifecycle | Prove Clausio manages the whole contract lifecycle, not just single documents | "One organized system of record" | Real contracts table + status badges, depth-staged | Contracts table, status badge | Row-level micro-motion (sort/filter) on scroll-into-view | Row lifts and expands |
| 4 | Product — Intelligence | Prove AI understands contracts structurally | "Contract → Clauses → Obligations → Risks → Insights" | The §7 pipeline rendered as real, labeled UI artifacts appearing in sequence | AI summary block, clause/obligation representation | Sequential reveal, each stage triggered by scroll position (§14 scroll motion) | Risk artifacts pull focus |
| 5 | Product — Risk & Traceability | Prove the AI is trustworthy, not a black box | "Every finding traces back to the source text" | Risk card assembling from highlighted source into cited quote block | Risk card, severity badge, source-citation block | Highlight → extract → settle sequence | Cited block recedes into a control/timeline strip |
| 6 | Control & Trust | Demonstrate security through the product, not claims | "Access, actions, and analysis are all traceable" | Dark, REKKI-register control section: audit log strip, role-based access indicator, witness-access boundary | Audit table, role badges | Slow scrolling log strip, deliberate/measured | Fades to neutral, light register returns |
| 7 | CTA | Convert | "Bring order to your contracts" | Return to the calm neutral register; single accent CTA button, echoing hero's one accent moment | Minimal — maybe a closing glimpse of the assembled dashboard | Accent button micro-interaction only | — |

This follows the requested Problem → Transformation → Product → Intelligence → Control → Trust → CTA arc, with "Transformation" folded into the Hero (it *is* the transformation) rather than duplicated as its own section.

---

## 11. Product Sections — chosen stories

Strongest, most defensible stories only (matches §10 rows 3–6):

1. **Contract portfolio & lifecycle management** — breadth/organization proof.
2. **AI contract intelligence (summary + structural decomposition)** — the core "understanding" proof.
3. **Risk analysis with source citation** — the trust/differentiation proof (replaces the requested but unsupported "clause Q&A" story — §1).
4. **Auditability & access control (audit log, RBAC, witness access)** — the control/security proof.

Deliberately **not** featured: notes (too operational/internal to be compelling marketing material), admin/user management (functional but not visually or narratively distinctive).

---

## 12. Trust & Security

No generic "Secure. Reliable. Enterprise-grade." block. Instead, the Control & Trust section (§10 row 6) demonstrates control through three real, specific product mechanisms, each rendered as an actual UI fragment rather than a claim:

- **Audit trail** — a real (mocked but authentic-looking) log strip, timestamped, attributed to a user, showing that actions are recorded.
- **Role-based access** — a visual of the same contract viewed differently by an Admin vs. a Witness role, showing that access is scoped, not just "role-based" in prose.
- **Traceable AI** — a callback to the Risk & Traceability section's cited-source pattern, reframed here as a control property ("nothing the AI says is unverifiable") rather than only an intelligence property.

---

## 13. Responsive Experience

- **Desktop (primary target):** full cinematic hero, depth-staged product sections, scroll-linked sequencing as described in §14.
- **Tablet:** hero transformation sequence keeps its stages but compresses timing; multi-layer depth in product sections reduces to two layers (foreground product UI + flat background, no midground); dark control section keeps its register but the log strip becomes a shorter, static excerpt instead of a long scroll-driven list.
- **Mobile:** the hero sequence simplifies to three still beats (old-way stack → transformation flash → assembled UI) rather than a continuous scroll-driven animation — an animated-but-short sequence, not a cinematic scroll experience, since scroll real estate is precious and thumb-scroll speed is unpredictable. Product sections stack vertically, one UI fragment at a time, full-width, with the same real component styling. The instrument/scan-line motif is allowed to become a simple, short looping accent rather than a scroll-tied sequence. Dark control section keeps its tone but drops to a single static, annotated screenshot-style panel instead of a moving log.
- **Across all breakpoints:** typography scale steps down proportionally but never breaks the large-numeral "editorial moment" pattern (§5) — it should still feel oversized relative to body text, just smaller in absolute terms.

---

## 14. Motion Language

Governing principle (§15): **motion communicates transformation** — every animation should represent a state change in the story (document → clause → obligation → risk → insight, or old-way → structured), never movement for its own sake.

- **Entrance motion:** sections resolve with a single, restrained upward settle + fade (matching the app's existing short/utilitarian transition character) — no staggered bounce, no elaborate choreography for its own sake. Triggered once per section, on first scroll-into-view.
- **Scroll motion:** the primary driver of the Intelligence and Risk sections (§10 rows 4–5) — each pipeline stage (clause → obligation → risk → insight) is tied to scroll position so the user's own scrolling *performs* the transformation, echoing the hero. Outside those two sections, scroll is passive (standard entrance motion only) — not everything should be scroll-driven, or the mechanism loses meaning.
- **Product motion:** dashboard/table fragments behave like the real app — row hover states, sort-arrow flips, tab switches — using the app's actual, already-defined micro-interactions rather than inventing new ones. This is where the landing page most directly borrows Dovetail's "the product proves itself" approach.
- **Data motion:** clause/obligation/risk/insight artifacts appear via the same assemble-from-source pattern established in the hero (§8) and reused in §10 row 5 — a fragment extracts from a source, then settles into its final card/badge form. This is the one motion pattern allowed to feel slightly more elaborate than the app's own restraint, because it is the page's single most important storytelling device.
- **AI motion:** AI "thinking"/generation moments (e.g., the summary appearing) use a quiet, precise reveal — text or cards resolving into place — never a shimmering/pulsing "magic" effect. Keeps AI presented as precise and traceable (§12), not mystical.
- **Navigation motion:** transitions between major sections are cuts softened by the shared entrance motion, not full-screen wipes or dramatic scene changes — consistent with the "premium but not theatrical" tone (§21).
- **Micro-interactions:** buttons, cards, and badges reuse the app's existing hover/focus language exactly (subtle background shift, 2px focus ring, ~150ms) — the landing page should feel like clicking on it previews the real product's feel.

Explicitly avoided (per brief §15 and app tone §3): floating decorative cards with no narrative purpose, exaggerated bounce/spring easing, fade-in-everything on scroll, heavy parallax layering, continuous ambient motion, particles that don't resolve into something meaningful.

---

## 15. Performance & Technology Guidance

Do not default to Three.js for everything. Match tool to the specific moment:

- **CSS + Framer Motion:** the large majority of the page — entrance motion, micro-interactions, tab/hover states, section transitions, the mobile fallback for the hero sequence. Cheap, reliable, respects `prefers-reduced-motion` easily.
- **GSAP (ScrollTrigger or equivalent) or Framer Motion's scroll utilities:** the scroll-linked pipeline sequences in §10 rows 4–5 and the hero's scroll-out — this is genuinely scroll-choreographed content and benefits from a dedicated scroll-animation tool rather than hand-rolled scroll listeners.
- **Canvas or lightweight WebGL (only if needed):** reserved for exactly one place — the hero's transformation instrument/scan sweep (§8), and only if the CSS/SVG version can't achieve the intended precision. If it can, prefer SVG/CSS there too and skip WebGL entirely. React Three Fiber / true 3D scenes are not justified anywhere in this brief — nothing here requires camera/perspective 3D, only a 2D "sweep and assemble" effect.
- **Static assets:** the "old way" clutter composition (§8/§10 row 2) is a strong candidate for a well-art-directed static or lightly-animated image rather than a fully simulated scene — it's the least product-critical visual on the page and doesn't need to be expensive.

Non-negotiables: respect `prefers-reduced-motion` (fall back to the entrance-motion-only version of every sequence); lazy-load anything beyond the hero; the authenticated application's performance must not be affected by anything built here (this is a fully separate route/bundle).

---

## 16. Final Design Direction

### Name: **Clausio — Structured Intelligence**

**One-sentence concept:** the landing page proves, by visibly performing it, that Clausio turns scattered contract documents into structured, traceable, controllable intelligence.

**Emotional feeling:** calm authority — the confidence of a tool that has already solved the problem, shown without hype.

**Visual language:** near-monochrome, border-first, restrained-radius component language identical in spirit to the authenticated app, staged with cinematic depth and pacing rather than density; one narrow accent color reserved for transformation and conversion moments only.

**Color direction:** neutral OKLCH grayscale base (unchanged from the app) + one restrained ink/graphite accent, <5% of any viewport, non-propagating to the app (§4).

**Typography:** Geist Variable only, pushed to a much larger display scale with tighter tracking at size, generous editorial whitespace (§5).

**Shape language:** unchanged from the app — 8–10px structural radius, pills reserved for badges/avatars/status.

**Product presentation:** real component language throughout (§9), depth-staged rather than flat-pasted, never an invented screen.

**Hero concept:** the transformation sequence itself, §8 — old-way document stack → instrument sweep → assembled real UI → single accent CTA.

**Robot decision:** rejected as a literal robot/mascot; replaced with a non-anthropomorphic "intelligence instrument," with a scan-line-only fallback if build cost demands it (§6).

**Motion language:** motion always represents a state change in the document → clause → obligation → risk → insight pipeline or the old-way → structured transition; restrained everywhere else (§14).

**Section architecture:** Hero (=Problem+Transformation) → Portfolio/Lifecycle → Intelligence pipeline → Risk & Traceability → Control & Trust → CTA (§10).

**Interaction principles:** every interactive element on the landing page should feel and behave like its counterpart in the real product — same hover language, same focus rings, same transition timing — so that clicking around the marketing site is itself a preview of the product's feel.

---

## 17. Visual Rules

### DO
1. Build every "product" visual from the real, documented component language (cards, tables, badges, tabs, icon-chips) — never invent a new visual system for marketing.
2. Use borders + `shadow-sm`/`md`/`lg` as the only depth mechanism; layering/parallax may create depth, but individual surfaces stay flat and border-defined.
3. Keep structural radius at 8–10px; reserve full-round (`rounded-full`) exclusively for badges, avatars, status dots, and the CTA button if desired.
4. Keep the accent color under ~5% of any single viewport and confined to the three moments defined in §4.
5. Use Lucide outline icons at 2px stroke, matching the app exactly — no new icon set.
6. Tie every animation to a specific state change in the document→clause→obligation→risk→insight story; if a motion doesn't represent a transformation, cut it.
7. Keep AI-related motion quiet and precise (resolve/settle), never shimmering or "magical."
8. Respect `prefers-reduced-motion` with a full non-animated fallback for every sequence.
9. Reuse the app's exact hover/focus/transition timing (~150ms, 2px ring, subtle background shift) for every interactive element.
10. Keep copy precise and unembellished — legal-enterprise register, not startup hype.
11. Only depict features that exist in the product today (§1); when a request implies a feature that doesn't exist, substitute the closest real capability and note the substitution.
12. Let the dark "Control & Trust" section be information-dense (REKKI register) — it's the one place density is a virtue, not a compromise.
13. At display sizes, keep Geist Variable at a normal/medium weight and let size + increasingly negative tracking carry emphasis (Frame.io's "weight whispers, size shouts" — §2) — reserve heavier weight for small UI labels only, matching the app's own restraint.

### DON'T
1. Don't introduce a second typeface, serif, or display/script font.
2. Don't let the accent color leak into general chrome, navigation, or body content — it is a moment, not a palette shift.
3. Don't turn semantic status colors (emerald/amber/orange/red) into decorative brand colors anywhere on the page.
4. Don't use gradients, glow, or glassmorphism/blur beyond the app's existing single `backdrop-blur` header pattern.
5. Don't animate everything on scroll — reserve scroll-driven choreography for the Intelligence and Risk sections specifically.
6. Don't use spring/bounce easing, staggered confetti-style reveals, or floating decorative cards with no narrative purpose.
7. Don't give the intelligence instrument a face, limbs beyond its function, idle animation, or any mascot-like personality beat.
8. Don't default to Three.js/3D scenes; justify any canvas/WebGL use against the single hero moment it's reserved for.
9. Don't fabricate a Q&A/chat feature or any other capability not present in the real product (§1).
10. Don't let the marketing site's visual system diverge from the app's border-first, restrained-radius, neutral-base language — if a landing-page component looks like it belongs to a different product, it's wrong.
11. Don't propagate the landing-page accent color into the authenticated application as a side effect of this work.
12. Don't adopt full-pill button radii or mandatory layered-gradient backgrounds just because REKKI/Frame.io lean on them (§2) — both are popular in the references but directly conflict with Clausio's existing badge-only-pill rule and gradient-free surface language; note the technique, reject the specific application.

---

## 18. Implementation Brief for the Next Agent

**What to build first:** the static information architecture (§10) as a real, scrollable page with placeholder/mocked content in the final layout and typography — no motion yet. Validate the narrative reads correctly scrolling through it plainly before adding any animation. Then layer in: (1) entrance motion for all sections, (2) the hero transformation sequence, (3) the two scroll-linked pipeline sections, in that order.

**Appropriate technology** (consistent with the existing Vite + React + TailwindCSS + shadcn/ui stack): Framer Motion for entrance/micro-interactions; GSAP ScrollTrigger (or Framer Motion's scroll hooks) for the scroll-linked hero and pipeline sequences; plain CSS/SVG for the hero transformation visual unless prototyping proves it genuinely needs canvas — do not reach for React Three Fiber. Reuse the actual `packages/web/src/components/ui/*` primitives and the color/spacing/radius tokens from `globals.css`/`tailwind.config.js` directly rather than re-implementing lookalikes.

**What should be mocked:** all contract data, contract names, risk findings, audit log entries, and user names shown in product previews — but mocked to look exactly as realistic and specific as the real app's data (real-sounding contract titles, plausible counterparties, real severity levels), not obviously placeholder ("Lorem Ipsum," "Contract 1").

**Visual elements requiring special attention:** the hero transformation sequence (§8) — it carries the entire opening impression and is the highest-risk/highest-payoff element; the risk-card assemble-and-cite motion (§10 row 5) — it's the primary trust-building interaction; the dark Control & Trust section's information density (§12) — too sparse and it loses the REKKI-borrowed authority, too busy and it stops feeling calm.

**Critical interactions:** hero transformation sequence completing correctly on both scroll-triggered and reduced-motion paths; the two scroll-linked pipeline sections tracking scroll position smoothly at typical scroll speeds; every interactive element (buttons, cards, tabs shown in product previews) matching the real app's hover/focus feel exactly.

**Should remain reusable:** any component that mirrors a real `packages/web/src/components/ui/*` primitive should be built as a thin wrapper/reuse of that primitive where feasible, not a divergent copy — this keeps the landing page honestly synced to the product's actual design tokens over time.

**Can use placeholder assets:** the "old way" archival clutter composition (§8/§10 row 2) — this is the one visual on the page least tied to real product truth and most tolerant of a stand-in image while the rest of the build is prioritized; final art direction for it can come later.

**Do not build yet:** anything representing the unsupported "clause Q&A" feature (§1) — wait for product confirmation before designing that section.

---

## Creative Director Summary

1. **What should Clausio feel like?** A serious, precise, already-solved problem — calm authority, not hype. The same enterprise legal-tech restraint as the product, staged with more cinematic patience.
2. **What should the first 5 seconds communicate?** That messy, scattered contract documents are being turned, visibly, into structured, trustworthy product intelligence — without a word of copy needed yet.
3. **What is the hero visual?** A quiet stack of ordinary contract artifacts (PDFs, spreadsheets, email) crossed once by a precise, non-anthropomorphic scanning instrument, leaving behind real Clausio UI — a clause tag, an obligation card, a risk badge — assembling in its wake, with a single accent-color flash marking the moment of transformation.
4. **Should we use the robot? Why?** No literal robot/mascot. Use an abstracted "intelligence instrument" instead — it keeps the mechanical, purposeful spirit the brief wanted without risking the mascot/cute/character tone that a legal-enterprise audience won't forgive. A scan-line-only version is the safe fallback if the instrument proves costly to build well.
5. **What are we borrowing from each reference?** REKKI: dark, dense, control-room authority (used in the Trust/Audit section). Dovetail: proving features by showing real structured product output, not prose. Frame.io: cinematic depth and pacing for staging the product as hero. Dayos/AI for Business: the confidence to be visually distinctive and editorial in composition — explicitly *not* its glossy/futuristic surface treatment.
6. **What are we deliberately rejecting?** A literal robot mascot; any new brand color beyond one narrow, non-propagating accent; gradients/glow/glassmorphism; scroll-driven motion everywhere; a fabricated clause Q&A/chat feature; Three.js/3D by default; a generic three-across icon-headline-paragraph feature grid.
7. **What makes this unmistakably Clausio?** Every "product" visual is built from the real, documented component language — same borders, same radius, same icon set, same badge/status treatment, same hover and focus behavior as the authenticated app — just staged with more room to breathe and more narrative patience than the working tool itself needs.
8. **What is the single most memorable interaction on the page?** The scroll-driven Intelligence pipeline (§10 row 4 / §14 scroll motion): the user's own scrolling performs the transformation of a contract into clauses, obligations, risks, and insights — turning the site's core claim into something the visitor does, not just reads.
