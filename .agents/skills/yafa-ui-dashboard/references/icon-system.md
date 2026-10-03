# Dashboard icon system

Use this reference whenever adding, replacing, sizing, coloring, or reviewing an interface icon or the Yafa-UI mark.

## Official source

Use **Lucide** for ordinary dashboard interface icons (`lucide-react` in React projects, or the official Lucide package for the host framework). Import named components and preserve their code-native vector geometry. Verify that prescribed component names exist in the installed Lucide version; if not, choose the closest semantically correct named Lucide icon or document/pin the minimum version instead of hand-drawing a substitute. Do not mix icon packs within one dashboard, substitute emoji, sketch lookalike SVG controls, or use AI-generated raster icons.

Custom vectors are limited to source-attributed brand marks, flags or avatars, and genuine data-visualization geometry such as charts, Sankey paths, maps, or heat-map overlays. Wrap exceptions in shared components and document their provenance. A hand-authored generic UI icon is not an exception.

## Canonical sizes and stroke

| Context | Size | Stroke width | Notes |
| --- | ---: | ---: | --- |
| Sidebar section identity | 20px | `2.7` | Strong optical anchor; use the registered section color |
| Sidebar disclosure chevron | 16px | `2.5` | Neutral; preserve expansion semantics |
| Sidebar destination | 18px | `2.25` | Route color at `.78` inactive opacity when a label is visible; full-opacity contrast-safe token when icon-only |
| Page-header icon | 18px inside a 36px tile | `2.25` | Route strong color on route soft tint |
| Platform or view lens | 14px | `2` | Compact and aligned with its label |
| Top-bar chrome | 14–16px inside 32px controls | `2–3` | Use the heavier treatment only when the product chrome establishes it |
| Small shared button | 14px inside 32px control | `2` | Named Lucide component |
| Medium or icon-only button | 16px inside 36–40px control | `2` | Default ordinary action scale |
| Large shared button | 20px inside 44–48px control | `2` | Only when the control scale is genuinely large |
| Inline metadata or row action | 12–14px | `2` | Avoid strokes thinner than surrounding type |

Use Lucide's round line caps and joins. Keep icons unfilled by default; add `fill="currentColor"` only for an established state or action such as playback. Use `currentColor` or a centralized metadata color so hover, active, disabled, and high-contrast states remain coherent.

Standard KPI cards do **not** use a decorative trailing icon. Their identity comes from the top rule, dotted-underlined metric title, value, and comparison.

## Centralized registries

Choose one icon and color for each semantic section and route, then reuse the mapping in the expanded sidebar, collapsed rail, mobile drawer, page header, search results, and route metadata.

Suggested product-analytics sections:

| Section | Lucide icon | Color |
| --- | --- | --- |
| Automations | `Workflow` | `#0891b2` |
| Growth | `ChartNoAxesColumnIncreasing` | `#2563eb` |
| Developer | `CodeXml` | `#7c3aed` |
| Alerts | `BellRing` | `#b45309` |
| Workspace | `Settings` | `#475569` |
| You | `User` | `#64748b` |

Suggested revenue-dashboard sections:

| Section | Lucide icon | Color |
| --- | --- | --- |
| Revenue | `ChartNoAxesColumnIncreasing` | `#0891b2` |
| Performance | `ChartNoAxesCombined` | `#2563eb` |
| Planning | `BadgeDollarSign` | `#7c3aed` |
| Alerts | `BellRing` | `#d97706` |

Useful route identities include `LayoutDashboard` for overview, `Users` for customers, `Boxes` for products, `ChartNoAxesCombined` for acquisition, `RefreshCw` for retention, `PanelsTopLeft` for cohorts, `Activity` for forecasts, `Target` for targets, `Video` for replays, `Globe` for geography, `Route` for journeys, `Flame` for heat maps, `AlertTriangle` for reliability, `CodeXml` or `Activity` for APIs, `Smartphone` for devices, and `Mail` for alerts.

Do not fork an icon choice inside an individual row or header. Change the registry when a route identity changes.

## Interaction and accessibility

- Decorative icons use `aria-hidden="true"` and do not repeat adjacent text.
- Icon-only actions require an accessible name and visible focus treatment; add a tooltip when the action is not universally recognizable.
- Do not change an icon solely between desktop, collapsed rail, drawer, or mobile presentation.
- In the 64px collapsed rail, render destination icons only; do not insert section-heading icons that duplicate the first route in each group. Because each icon becomes the sole visible destination cue, use a registered full-opacity route variant with at least 3:1 contrast on the rail surface.
- Pair warning and error icons with text. Icon color alone must not carry state.

## Skill and repository mark

The reusable mark is [the code-native SVG](../assets/yafa-ui-dashboard-mark.svg). It uses Lucide's `LayoutDashboard` geometry on white. Its four rectangles use the dashboard's exact light analytical accents: cyan `#67e8f9`, green `#86efac`, pink `#f9a8d4`, and violet `#c4b5fd`.

Do not replace the mark with generated artwork, substitute saturated interaction colors, or recolor the entire glyph blue. When raster output is required, render the SVG at the target size rather than redrawing it.
