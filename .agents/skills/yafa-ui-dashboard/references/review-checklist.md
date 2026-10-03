# Dashboard review checklist

Use this for visual reviews and as a final implementation pass. Report concrete file/line evidence for failures; do not flag harmless wording differences.

## Scope and hierarchy

- [ ] The route is a primary analytical surface or the task explicitly authorizes applying this language elsewhere.
- [ ] The page has one clear title and one obvious analytical hierarchy.
- [ ] Content flows from overview/KPIs to analysis to evidence rather than presenting an undifferentiated card grid.
- [ ] A canvas-first page gives the visualization enough space instead of boxing it repeatedly.

## Shell and navigation

- [ ] A net-new/compatible full shell keeps sidebar, top bar, page identity bar, and canvas visually distinct; an embedded dashboard preserves established host chrome and applies the system from page identity/content inward.
- [ ] Required product context, if any, and semantic nav sections remain intact; no team/project/workspace selector was invented for a single-context product.
- [ ] Sidebar header has one short brand name and only the necessary value-only compact context selectors; it does not repeat taglines or visible context eyebrows.
- [ ] Active nav uses the correct route tint, icon/accent, bold label, and slim left rail.
- [ ] Sidebar collapse, resize, persisted sections, mobile drawer, backdrop, and Escape behavior still work.

## Visual language

- [ ] Canvas is pale; primary surfaces are white with neutral 1px borders.
- [ ] Cards/panels use about 8px radius and none/subtle elevation.
- [ ] Accent color is concentrated in identity, status, selection, thin rules, and data—not decorative fills.
- [ ] The page uses one stable route-identity pair plus the deliberate analytical palette from `color-system.md`; it is neither all-blue nor randomly rainbow.
- [ ] Distinct KPI measures use stable cyan/blue/green/violet/pink families, while directly comparable splits may intentionally share the route accent.
- [ ] Chart categories/series keep the same color mapping across sorting, filtering, responsive layouts, tooltips, and expanded views.
- [ ] Semantic success/warning/danger colors override category styling when the element communicates state, with a non-color cue.
- [ ] Sidebar section icons use stable, intentionally different group accents; inactive labels are neutral while icons retain their registered route hue at restrained opacity. The active destination uses full-opacity icon, route tint, and left rail; in the icon-only rail, both icon and active rail use a `uiStrong` variant with at least 3:1 contrast.
- [ ] Pastel accents are used for thick marks/strips/tiles; thin lines, icons, and text use a contrast-safe strong counterpart. Essential interactive boundaries and sole-cue icons reach at least 3:1 on their surface.
- [ ] Typography follows the compact Yafa-UI hierarchy: loaded Inter for a new/unbranded dashboard, or the established host-product typeface with equivalent scale/weight; labels and metrics remain easy to scan.
- [ ] The implementation reuses centralized route metadata and shared dashboard components where applicable.

## Icons

- [ ] Interface icons come from the host framework's official Lucide package; no mixed pack, emoji substitute, ad hoc lookalike, or AI-generated raster icon was introduced.
- [ ] Sidebar section, destination, page-header, and compact-action icons follow the sizes and stroke widths in `icon-system.md`.
- [ ] One route keeps the same registered icon and color across sidebar, header, tabs/search, collapsed rail, and mobile drawer.
- [ ] Icon-only controls have accessible names and visible focus; decorative icons are hidden from assistive technology.
- [ ] Standard KPI cards do not contain decorative upper-right metric icons.

## Anti-bubble geometry

- [ ] Query, Generate, Search, Reset, Clear, Edit, Add, and other ordinary actions are rectangular with 0–8px corners.
- [ ] Inputs and selects are not turned into pills by a broad ancestor selector.
- [ ] Statuses are a semantic dot/icon plus plain text with no enclosing border, tint, radius, or pill padding.
- [ ] Full pills/circles are limited to compact count/delta tokens, removable chips, AND/OR tokens, avatars/markers, progress, or true segmented/toggle controls.
- [ ] A nested count chip does not force its parent action to become a capsule.
- [ ] Radius is applied through a semantic component/class, not a page-wide `button/input/select` rule.

## Data surfaces

- [ ] KPI cards share label/value/comparison anatomy and do not dominate with heavy borders or motion.
- [ ] Standard KPI cards have no decorative upper-right icon; titles use the dotted-underlined hover/focus/tap description affordance.
- [ ] KPI description tooltips prefer a collision-aware side placement, remain viewport-contained, are not clipped by card overflow, and do not default below the title over card content.
- [ ] Delta capsules have a white/transparent surface and neutral border; only the sign/arrow and numeric text carry semantic color.
- [ ] Charts use restrained grids, stable series colors, readable labels, compact tooltips, a concise text summary, and an accessible underlying-value alternative.
- [ ] Tables/lists preserve density, clear headers/dividers, numeric alignment, and hover/focus/touch affordances. Large datasets paginate or virtualize; sort/filter, sticky identity, row selection, and bulk-action state remain clear where relevant.
- [ ] Wide data scrolls or has a deliberate mobile representation rather than compressing unreadably.

## Responsive, accessible, and stateful

- [ ] The relevant rules in `responsive-adaptation.md` were applied from content-pane width, not viewport width alone.
- [ ] 320px, 375–390px, 768px, 1024px, and 1440px were visually checked when the change can affect shared layout.
- [ ] There is no unintended page-level horizontal overflow.
- [ ] The mobile drawer locks body scroll, contains focus, closes on backdrop/Escape/navigation, and restores focus to its trigger.
- [ ] When the header content pane is at least about 720px and labels fit, identity stays left and the complete global view/time/period cluster that actually exists stays right in one compact row. Narrower panes use the documented disclosure/stack fallback without overflow; route-specific filters move into content. Compact 32px visuals still have non-overlapping touch targets of at least 44×44px.
- [ ] Critical identity, status, primary metrics, comparisons, and recovery actions remain available rather than being hidden to fit.
- [ ] Charts reduce tick density before type size, keep series colors stable, and expose hover values through tap/keyboard.
- [ ] Dense evidence uses a deliberate bounded scroller or mobile-card representation.
- [ ] Focus is visible, icon-only actions have accessible names, and color is not the only state signal.
- [ ] Default, hover, focus, active, disabled, loading, empty, partial-error, and full-error states are coherent.
- [ ] Initial skeletons mirror the final layout; background refresh keeps existing data visible.

## Handoff

- [ ] Relevant dashboard typecheck/tests pass.
- [ ] The changed route was inspected in the running UI when practical.
- [ ] Intentional departures and any pre-existing drift left in place are called out explicitly.
- [ ] No excluded page body, unrelated workflow, or historical styling was silently changed.
