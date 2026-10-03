# Dashboard visual system

This reference defines the Yafa-UI analytical dashboard language. Apply it as a coherent system; do not cargo-cult isolated utility classes or overwrite an established host-product brand without reason.

## Design character

The dashboard should feel like a precise analytical instrument: calm, bright, information-dense, approachable, and fast to scan. Its personality comes from strong organization, slim colored accents, compact typography, and a few decisive dark selections—not from decorative containers.

## Layered shell

For a net-new full dashboard, or when the host shell is already compatible with this structure, build the product frame in four visual layers:

1. **Sidebar:** white, full-height, separated by a single neutral vertical rule.
2. **Top bar:** compact white global context, separated by a single bottom rule.
3. **Page identity bar:** pale canvas background with a route accent, icon tile, title/subtitle, and shared lenses.
4. **Content canvas:** `#f8fafd`, with centered analytical content or an intentional full-bleed workbench.

The shell fills `100dvh`. Ordinary pages own vertical scrolling in the content pane; map/heatmap workbenches may own their internal scrolling. Keep `min-width: 0` through flex/grid ancestors and hide page-level horizontal overflow. When the dashboard is embedded in established product chrome, preserve the host navigation/top bar and start at the page-identity or canvas layer; do not replace the host shell merely to match these defaults.

### Top bar

- Minimum height: 44px.
- Horizontal padding: 8px mobile, 12px from small screens.
- Global buttons: generally 32px high; icon-only controls are 32px square.
- Current product or workspace title: about 14px, extra-bold. Any compact global metadata the product already exposes: about 10px, uppercase.
- Use white backgrounds, 1px neutral borders, no visible elevation, and square or very low-radius geometry.
- Hide secondary metadata progressively rather than squeezing it. Keep the mobile menu available below 768px.

### Sidebar

- Net-new full-shell default width 300px; resizable between 220px and 440px; collapsed desktop width 64px. Existing host navigation dimensions and behavior take precedence unless the task explicitly authorizes a shell redesign.
- Keep width, collapse, and section-collapse preferences persistent.
- On mobile, use a fixed left drawer up to `min(92vw, 440px)`, a dim backdrop, body scroll lock, and Escape/backdrop dismissal.
- If the product genuinely has organization, team, project, or workspace scope, place only the required selectors first. Keep them compact (about 36px), white, and bordered rather than floating. Show each selected value once beside its identity tile and chevron; do not add visible context eyebrows inside the controls. Do not invent scope selectors for a single-context product. The sidebar brand area uses one short name and no tagline. Preserve omitted context in accessible names.
- Group destinations by user intent rather than implementation ownership. A revenue product might use Revenue, Performance, Planning, and Alerts; a product-analytics tool might use Growth, Developer, Alerts, Workspace, and You. Keep the chosen order stable.
- Expanded section rows use a 20px icon in that section's stable identity color, a 16px weight-800 dark label, and a neutral chevron. Adjacent semantic sections should not all repeat one cyan icon; assign each group deliberately from the shared palette and keep the mapping stable. Item rows use an 18px icon, roughly 15px label, and a generous 40–42px hit area.
- Active items alone use the current route's pale tint, bold dark label, route-colored icon, and a 3px left accent. Keep the row crisp/square; do not turn it into a floating pill.
- Inactive item labels stay neutral gray, while each destination icon retains its centrally registered route color at restrained opacity (about `.78`) when the visible label also identifies the destination. Active icons move to full opacity. In the icon-only collapsed rail, use a full-opacity, contrast-safe route `uiStrong` token with at least 3:1 contrast for both the icon and the active 3px rail because they are the visible selection cues; the accessible orange variant is `#d97706`, not `#f97316`. Do not choose colors locally or by row order. Collapsed mode shows destination icons only—omit duplicate section-heading icons—and gives every destination an accessible name/tooltip while retaining group spacing.

## Palette

This section defines the core tokens. Use [color-system.md](color-system.md) for how route identity, multi-color KPI/chart accents, and semantic states are allocated; token presence alone is not an allocation rule.

### Neutral foundation

| Role | Value | Use |
| --- | --- | --- |
| Canvas / muted surface | `#f8fafd` | Page background and quiet nested regions |
| Surface | `#ffffff` | Cards, tables, chrome, popovers |
| Main border | `#dadce0` | Card and shell boundaries |
| Quiet divider | `#e8eaed` | Headers, rows, internal separation |
| Interactive boundary | `#8792a2` | Essential field/control edges that must reach 3:1 on white |
| Strong text | rendered `#202124`; shared token fallback `#0f172a` | Titles and primary values |
| Body text | rendered `#3c4043`; shared token fallback `#334155` | Labels and explanations |
| Muted text | rendered `#5f6368`; shared token fallback `#64748b` | Metadata and secondary labels |
| Brand | `#5dadec` | Lightweight brand accent |
| Strong action/focus blue | `#2563eb` or `#1a73e8` | Links, selection, focus, primary action |

Use `#202124`, `#3c4043`, and `#5f6368` as the rendered primary-dashboard hierarchy when authoring a standalone page. In product code, prefer an existing shared variable/class when it resolves to the corresponding role. Do not alternate between both neutral families inside one component or introduce a third family.

### Semantic state

| State | Strong token | Typical pale tint |
| --- | --- | --- |
| Informational / selected | `#2563eb` | `#eff6ff` |
| Success | `var(--dashboard-success)` / `#059669` | `#ecfdf5` |
| Warning | `var(--dashboard-warning)` / `#be185d` | `#fdf2f8` |
| Danger / error | `var(--dashboard-danger)` / `#dc2626` | `#fef2f2` |

Prefer semantic variables over new literals. Every inline status uses a 6px semantic dot or compact icon followed by plain neutral text; it has no enclosing border, tinted background, capsule radius, or pill padding. Pale semantic tints remain available for alert/callout/error regions and selections, not inline status labels.

### Illustrative route identity

| Page | Accent | Pale tint |
| --- | --- | --- |
| Overview / revenue | `#0891b2` | `#ecfeff` |
| Replays / activity | `#2563eb` | `#eff6ff` |
| Geographic / retention | `#059669` | `#ecfdf5` |
| Journey / funnel | `#db2777` | `#fdf2f8` |
| Heat maps | `#f97316` | `#fff7ed` |
| Reliability / operations | `#7c3aed` | `#f5f3ff` |
| API / integrations | `#16a34a` | `#f0fdf4` |
| Devices / segments | `#7c3aed` | `#f5f3ff` |
| Alerts | `#d97706` | `#fffbeb` |

This table illustrates a possible analytics information architecture; it is not a required route list. Register destinations from the host product's durable information architecture rather than copying these names. Use centralized page metadata rather than restating values in a route, and do not assign a route semantic danger/success color merely because its current content reports errors or health. Concentrate accent color in the page identity rail/icon, a card's 3–4px top rule, selection, status, and data series. Route identity stays singular, while distinct metrics and categorical data may use the stable multi-color analytical palette in `color-system.md`.

## Typography

- For a new or unbranded dashboard, load the self-hosted Inter variable font with its 300–900 weight range and set `font-synthesis: none`; naming Inter without loading it is not sufficient. If the host product already has a deliberate product typeface, preserve it and reproduce the hierarchy below through scale, weight, and line height.
- Dashboard body: 13px / 1.45 / weight 400 on small screens, 14px / 1.45 / weight 400 from 640px.
- Page title: 15–16px, weight 800, uppercase, compact line height.
- Sidebar section label: 13–16px, weight 800. Sidebar item: about 15px, weight 500; active item weight 700.
- Card title: about 15px, weight 600. The dotted underline can signal an explanatory tooltip/affordance; do not apply it to every heading without meaning.
- Metadata and table headings: 10–12px, muted, weight 600–700; ordinary secondary copy stays 400–500.
- Primary metrics: 26–32px, weight 700, when space allows; secondary values: 20–22px, weight 650–700. Do not use 800/900 for ordinary metrics.
- Ordinary action text: weight 600–700 according to emphasis; do not make every control extra-bold.
- Use mono/tabular treatment only for identifiers, endpoint paths, keys, timestamps, and values that benefit from columnar scanning.
- Keep tracking neutral. Do not add exaggerated letter spacing to ordinary labels.

## Geometry and elevation

Choose shape by semantics:

| Element | Typical radius | Notes |
| --- | ---: | --- |
| Shell chrome and top-bar actions | 0–4px | Crisp, compact, no bubble treatment |
| Fields, selects, icon tiles, dense inner surfaces | 4–6px | Clear focus ring; consistent height |
| Cards, panels, ordinary buttons, grouped controls | 6–8px | Default outer geometry |
| Status | No container radius | Small semantic dot/icon plus plain text; no capsule border or tinted fill |
| Count/delta tags, removable chips, AND/OR tokens | Full pill | Only when the whole object is a compact token |
| Avatars, map markers, status/chart dots, toggle thumbs | Circle | Intrinsically circular semantics |

An action verb is a strong warning against pill geometry. Query, Generate, Search Replays, Reset, Clear, Edit, Add rule, and similar controls stay rectangular. A small count nested inside an action may be a pill without making the whole action a pill.

The light `#dadce0` border is appropriate for nonessential card/chrome separation. When a field, button, or focusable region relies on its edge to be perceivable, use the contrast-safe `#8792a2` interactive-boundary token or another host token that reaches at least 3:1 against the surface; focus uses the strong action/focus color.

Never assign radius with a selector such as `.page :where(button, input, select)`. Apply a semantic component or class so a page cannot accidentally transform every control.

Use elevation sparingly:

- Default card: white, 1px `#dadce0`, 8px radius, no shadow or a nearly flat 1–3px shadow.
- Nested region: `#f8fafd` or white, 1px divider, 4–6px radius, little or no shadow.
- Popover/modal: stronger shadow is acceptable because it establishes overlay depth.
- Thick black borders and offset block shadows are rare emphasis, not the analytical default.

## Page identity and global lenses

Create or reuse one shared page-header component so every primary dashboard route follows the same identity and lens contract.

- Mobile inset: approximately 12px horizontal / 10px vertical; desktop inset: 20px / 8px.
- Identity: 6×20px accent bar, optional 36px icon tile with a 6px radius, title and optional concise subtitle.
- When the header's content container is at least about 720px and the localized labels fit, keep one compact row: identity cluster left and the complete set of global view/time/period lenses that actually exists right-aligned. Do not invent a platform lens and do not create a second global filter row. Protect this canonical desktop contract by collapsing the rail, truncating or hiding the optional subtitle, disclosing secondary lenses, and moving route-specific filters into the content area. In a genuinely narrower content container, move the intact global cluster below identity as one deliberate compact row rather than overflowing, obscuring labels, or shrinking touch targets.
- When the product has a true segmented global lens, render it as a pale grouped track with a 1px border, 8px group radius, 32px visual options, and one dark selected segment. Its interactive wrapper must still provide at least a 44px touch target.
- Keep the time range a compact 32px select with a tiny uppercase label. Do not render every independent filter as a capsule to imitate the segmented lens.

## Analytical surfaces

### Standard card anatomy

1. Optional 3–4px accent rule.
2. Header with one analytical question and optional compact action.
3. Quiet divider.
4. A value, chart, ranking, or compact evidence region with 16–20px inset.

Cards should be legible without relying on their shadow. Avoid nested card-on-card repetition; use quiet sections and dividers inside a primary surface.

### KPI strip

- Put the summary strip immediately after the page header.
- Use a responsive 1/2/4-column grid where appropriate.
- Keep each card's title, quiet divider, primary value, comparison/delta, and context aligned consistently. Do not add a decorative icon tile to the upper-right corner of a standard KPI card.
- Render the title around 14–15px/600 with a short dotted underline. It is an information affordance: expose the concise metric definition on hover, keyboard focus, and tap.
- Place the title tooltip to the side of its trigger and flip between right and left according to available viewport space. Use a portal/fixed overlay when needed so card overflow cannot clip it. Prefer above as the narrow-screen fallback; do not default underneath, where it covers the card's value/comparison. Keep it inside the viewport, dismiss on Escape/blur, and associate it accessibly with the trigger.
- A delta may be a pill because it is a compact comparison token, but its container stays white/transparent with a neutral 1px border. Only the arrow/sign and numeric text receive semantic color. A labeled status is different: use a dot/icon plus plain text without a capsule. Do not make the full KPI card neo-brutalist or hover-lift aggressively.

### Charts and rankings

- Use muted `#e8eef6` grid lines, 12px ticks/legends, thin saturated series, and white tooltips.
- Keep legends concise and colors stable across related charts.
- Prefer direct labels and meaningful hover details over decorative chart chrome.
- Give every chart a concise text summary and an accessible way to inspect its underlying values, such as a nearby data table, details disclosure, or equivalent screen-reader representation. SVG/canvas charts need a useful accessible name and must not expose meaningless internal drawing nodes.
- Allow important analytical cards to expand into a modal, but keep the in-grid version useful.

### Tables and dense lists

- Use a sticky or clearly tinted header, 10–12px column labels, fine row dividers, subtle zebra/hover state, and right-aligned numeric columns.
- Favor horizontal scrolling over crushed columns. Use dedicated mobile evidence cards when a desktop row is too rich.
- Keep identity/key columns sticky when horizontal comparison requires it. Truncate secondary text with an accessible full value rather than letting one cell destroy the grid.
- Paginate or virtualize genuinely large datasets, preserve sort/filter state, and expose selected-row and bulk-action state clearly. Keep row actions quiet until hover/focus only on hover-capable devices; important actions remain visible or directly discoverable on touch.
- Use slim state accents and plain dot/icon-plus-text statuses, not semantic capsules or a field of colored bubbles.

## Page archetypes

### Standard overview

Use for revenue, product, device, or business-intelligence overviews: compact page header, KPI/summary region, then asymmetric grids that give the most important chart more room. Typical content max width is 1560–1600px with 16px mobile and 24px desktop insets and 16–24px section gaps.

### Dense list or database

Use for activity archives, reliability issues, API databases, audit logs, and operational records: page header, a compact rectangular filter/search band, summary/KPI context, then one dominant table or expandable evidence surface. Labels sit above or beside controls; fields share 32–40px heights.

Keep a primary query builder as an inline expansion directly below its search/query toolbar. This preserves the filter-to-results relationship and leaves evidence in context. When collapsed, show selected conditions as a compact horizontally scrollable summary. Use a popover only for a few lightweight options; reserve a modal for a self-contained task that genuinely needs isolated focus, not for the primary list query workflow.

### Canvas-first workbench

Use when a map, heat map, node graph, timeline, or other visualization is the product. Keep the shared shell, page identity, typography, and palette, then give the canvas maximum space with a restrained toolbar and narrow evidence/inspector rail. Do not wrap the canvas in layers of ordinary cards.

### Journey evidence flow

Use for funnels and user journeys: KPI strip, full-width Sankey or path explorer, then session or event evidence. Removable selected path clauses may be chips; the actions that execute or edit the query remain compact rectangles.

## Interaction, state, and responsive behavior

- Prefer border, foreground, or pale-background changes on hover. Use motion only to communicate hierarchy or state; avoid generic card lift.
- Use visible focus rings with adequate contrast and preserve keyboard order.
- Persist page-wide lenses and sidebar preferences where the current system already does.
- Skeletons should match the final geometry. Show them only before useful data has rendered; background refresh should not blank the page.
- Empty states should explain what is absent and offer one clear next action. Errors use semantic tint and concise recovery guidance without abandoning the page hierarchy.
- Use [responsive-adaptation.md](responsive-adaptation.md) for shell transitions, content-pane minimums, mobile data treatments, and breakpoint-edge verification.

## Anti-patterns

- Page-wide radius overrides or “rounded by default” styling.
- Ordinary action bubbles, especially Query/Generate/Edit/Reset controls.
- Thick black borders, block shadows, and uppercase-heavy neo styling on every surface.
- Gradients, glassmorphism, broad blur, or large decorative color fields inside the analytical dashboard.
- A uniform grid of equal cards when the data has a clear primary insight.
- Multiple competing filter bars or repeated page titles.
- Hiding dense data to avoid responsive work; provide scroll, stacking, or a deliberate mobile representation instead.
- Copying marketing, settings, authentication, or detail-workbench styling into the primary dashboard without a deliberate reason.
