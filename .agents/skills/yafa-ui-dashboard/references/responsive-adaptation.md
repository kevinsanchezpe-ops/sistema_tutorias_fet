# Responsive adaptation

Use this reference whenever work changes page layout, navigation, filters, charts, tables, dense lists, overlays, or any screen-size behavior. Adapt the analytical hierarchy; do not merely shrink the desktop page.

Treat the ranges below as design and QA bands rather than device detection. Make the final layout decision from the **content pane width after sidebar/chrome**, not only the raw viewport. A 768px viewport with a 300px sidebar has less usable space than a 640px full-width mobile canvas.

## Non-negotiable behavior

- Preserve the analytical sequence at every size: identity and lenses, essential KPIs, primary analysis, then evidence.
- Never hide the page title, primary metric, status, core comparison, or principal action merely to make a row fit. Move secondary metadata into a second line, disclosure, or later section.
- Keep page-level horizontal overflow at zero. Horizontal scrolling may belong to a chart or table region with a visible boundary, never to the entire page.
- Keep visual controls compact while giving touch targets at least 44×44px through the control box or a semantic interactive wrapper/pseudo-element. A 32px visual control may sit inside a 44px hit box without looking oversized. Maintain at least 8px between adjacent touch targets and ensure enlarged hit boxes do not overlap.
- Do not make mobile actions into pills. The same semantic radius rules apply at every width.
- Do not depend on hover. Charts, row actions, tooltips, and disclosures must work with tap, keyboard, and screen readers.
- Use `100dvh` for the shell and account for safe-area insets where controls meet a device edge.

## Screen adaptation matrix

| Band | Shell and header | Content and data |
| --- | --- | --- |
| Compact phone · 320–479px | Sidebar becomes a modal drawer with backdrop, body lock, Escape, focus containment, and focus restoration. Use 12px canvas gutters plus safe-area insets. Top bar keeps the menu, current product/context identity, and essential icon actions; hide only secondary metadata. Page identity and existing global lenses stack. Under about 360px, stack a segmented lens and range control rather than squeezing them. | One-column KPIs and cards. Primary action may span the content width but remains rectangular. Charts use about 220–280px height, fewer ticks, wrapped/stacked legends, and tap-accessible detail. Convert rich rows to mobile evidence cards or give a bounded table scroller. |
| Large phone / small tablet · 480–767px | Keep the drawer shell and use 16px gutters when space permits. Page header remains stacked unless the content clearly fits. Lenses can share a row when each control retains its minimum width and touch target. | Use two KPI columns only when every card remains at least about 210px wide; otherwise use one. Ordinary analysis panels remain one column. Keep comparison charts readable instead of reducing type below the dashboard scale. |
| Tablet / shell transition · 768–1023px | Default a first visit to the 64px collapsed desktop rail; respect a saved expanded preference only while it leaves a healthy canvas. Offer explicit expansion, using an overlay if necessary, and use 16–20px gutters. When the header content pane remains at least about 720px and localized labels fit, keep identity and the complete lens/period cluster in one row; otherwise disclose secondary lenses or move the intact global cluster below identity. | Usually two KPI columns and one analytical panel per row. Tables keep their desktop structure inside a bounded scroller or drop lower-priority metadata into secondary lines. Do not force the wide asymmetric desktop grid. |
| Laptop · 1024–1439px | Use the resizable rail when it leaves a healthy content pane; on first visit keep it collapsed while an expanded 300px rail would leave less than about 800px for content (normally through roughly 1199px), then default expanded. Honor a saved preference while preserving minimums. Use 20–24px gutters. At a 720px+ header pane, keep page identity left and all global lenses right in the same compact row; use the controlled narrow-pane fallback when labels cannot fit. | Use 2–4 KPI columns based on card minimum width. Enable asymmetric 7/5 or 8/4 analysis only when both panels remain independently readable; otherwise stack. Preserve dense desktop tables and selectively move only low-priority metadata. |
| Wide desktop · 1440px+ | Default to the expanded 300px rail, with 220–440px resize and 64px collapse. Keep the compact top bar, right-aligned lenses, and 24px content gutters. | Use four-column KPI strips, asymmetric analytical grids, and dense evidence tables. Cap ordinary page content around 1560–1600px so hierarchy does not dissolve into empty width. Full-bleed canvas workbenches remain intentional exceptions. |

## Shell and navigation

### Drawer below 768px

- Width is at most `min(92vw, 440px)`.
- Place it above a dim backdrop and below any deliberately higher critical modal.
- Lock body scrolling while open; close on backdrop, Escape, or completed navigation.
- Trap focus inside while open and restore focus to the menu trigger when closed.
- Keep required product context selectors, if any, and section organization intact. Do not invent team/project controls for a single-context product. Scrolling belongs inside the drawer.

### Transition and desktop rail

- At 768–1023px, protect the content pane. Default a first visit to the 64px icon rail with accessible names rather than leaving only a narrow sliver for analysis; honor a persisted expanded choice only while it does not create overflow or collisions.
- At 1024–1199px, default a first visit to the 64px rail because a 300px rail typically leaves less than an 800px content pane. At 1200px and above, return to the 300px default when the page minimums fit. Retain the 220–440px resize range and respect saved choices that do not create collisions.
- Do not render a one-sided capsule when collapsing. Active state remains the route tint, colored icon, and slim left rail.

### Top bar

- Keep it about 44px high and sticky on small screens.
- Preserve the menu trigger, current product/context identity, and critical actions. Convert labeled secondary actions to accessible icon buttons before hiding them.
- Avoid overlapping actions, breadcrumb-like context, or the page title. Truncate secondary context with a useful accessible name.

## Page identity and lenses

- Keep one title. Never repeat it below a wrapped control row.
- When the header content pane is at least about 720px and localized labels fit, use a single row with `minmax(0, 1fr) auto`: identity first/left and the complete global view/time/period cluster that actually exists last/right. Never invent a lens or add a second global-filter row. If the row is crowded, collapse the rail, truncate/hide optional copy, disclose secondary lenses, and move route-specific filters into the content area while keeping the core time/period controls on the right.
- In a genuinely narrower content pane—including a desktop viewport constrained by host chrome—place the identity first and the intact global lens/action cluster on one deliberate row below it rather than squeezing touch targets or causing overflow. Treat usable content width, not viewport width alone, as the deciding threshold.
- Keep the accent rail and icon tile visible unless the viewport is exceptionally constrained; subtitle may wrap to two lines or truncate after the title remains clear.
- A segmented lens is one grouped selection, not a set of independent pill buttons. Let segments share available width on phones.
- Stack independent filters when their labels, values, or touch targets would collide. Do not compress text until it becomes ambiguous.

## Cards, grids, and workbenches

- Use layout minimums, not a fixed column count: roughly 200–220px for a KPI card, 320px for a supporting analytical/chart panel, and 520px for the primary chart in an asymmetric layout. Collapse columns before reducing legibility when these minimums fail.
- Collapse asymmetric grids in priority order. The primary analytical question appears first; supporting composition/ranking follows; detailed evidence remains last.
- Avoid equal-height stretching that creates large empty mobile cards. Preserve consistent anatomy, not identical height.
- Canvas-first pages keep the visualization central. On phones, move evidence/inspector content into a bottom sheet, drawer, or stacked section rather than leaving a permanently narrow canvas.
- Keep popovers within the visual viewport. Promote a complex popover to a sheet or modal when its fields cannot retain usable width.

## Charts

- Keep chart labels at the dashboard scale; reduce tick count or abbreviate values before shrinking labels below readable size.
- On phones, show fewer x-axis ticks, allow legends to wrap/stack, and keep the plot about 220–280px tall. On larger panes, typical analytical charts can use about 280–360px.
- Use stable series colors across widths. Do not remove a series or change its color only on mobile.
- Provide tap/keyboard access to the same values exposed by hover, and keep tooltips inside the viewport.
- Preserve a concise text summary and an accessible underlying-value alternative, such as a data table or details disclosure, at every width.
- If horizontal time-series scrolling is necessary, bound it inside the card and expose the current range; do not make the page scroll sideways.

## Tables and dense lists

Choose deliberately between two mobile treatments:

1. **Bounded table scroller:** use when cross-column comparison is the task. Keep the header, column relationships, and right-aligned numerics; provide an obvious scroll boundary.
2. **Evidence cards:** use when each row is an independent object or action. Keep the primary identifier, status, primary metric, time/context, and principal action visible; move secondary fields into labeled rows or disclosure.

Do not hide identifiers, statuses, money/primary metrics, or recovery actions. Preserve the same 6px semantic dot/icon plus plain-text status anatomy across desktop tables and mobile evidence cards; never introduce a status capsule at either size.

For very large datasets, keep pagination or virtualization behavior consistent across responsive modes. Preserve sort/filter state, sticky identity where cross-column comparison needs it, explicit row selection/bulk-action state, and touch-visible access to important row actions.

## Content priority

May reduce or hide when space requires it:

- duplicated top-bar metadata;
- nonessential explanatory subtitles;
- decorative icons;
- some chart tick labels;
- truly redundant table columns, only when their values remain available through row detail or another explicit mobile representation;
- sidebar text in collapsed mode, provided every icon retains an accessible name and tooltip.

Must remain available:

- navigation destinations, page title, and route identity;
- active global view/time/period lenses that the product actually has, plus applied-filter state and a way to clear it;
- primary actions, critical KPI values, and their meaning;
- warnings, errors, status, selection, and recovery actions;
- every chart series and every nonredundant table field. Responsive work may change their presentation, not erase the information.

## Responsive verification

Check at minimum:

- 320px and 375–390px: smallest supported phone, drawer, stacked lenses, one-column analysis, touch targets, chart labels, and no page overflow.
- 768px: drawer-to-rail transition, available canvas width, canonical one-row identity/lens alignment when the content pane reaches its minimum, and the controlled narrow-pane fallback without collision or overflow.
- 1024px: rail/content balance, KPI column choice, chart minimums, and table behavior.
- 1440px: expanded rail, content cap, asymmetric grid balance, and dense evidence scanning.

When changing shared breakpoints or shell behavior, test both sides of the relevant boundaries: 479/480, 767/768, 1023/1024, 1199/1200, and 1439/1440. Also test portrait/landscape change, 200% zoom, keyboard-only navigation, reduced motion, long labels, an empty state, an error state, and the widest realistic metric/identifier. A responsive pass is incomplete if it checks only the default loaded desktop state.
