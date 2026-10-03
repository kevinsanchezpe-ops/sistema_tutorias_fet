# Dashboard color system

Use this reference whenever choosing or reviewing page accents, KPI colors, icon tiles, charts, badges, alerts, or other data color. The dashboard is **multi-color but not decorative**: most pixels stay neutral, while a stable family of cyan, blue, green, pink, and violet carries identity and analytical meaning.

## Four color layers

Apply color in this order so route identity, data categories, and product state do not collapse into one undifferentiated blue treatment.

1. **Neutral foundation:** canvas, surfaces, borders, and text use the neutral tokens in `dashboard-visual-system.md`. White and `#f8fafd` should remain visually dominant.
2. **Route identity:** one strong/soft pair identifies the durable destination in the sidebar, page header, and primary selection. Store every route in one metadata registry so a new route chooses one pair and keeps it stable. Derive it from the destination or parent section—not from a transient healthy/error/loading state.
3. **Analytical palette:** distinct metrics and categorical series may rotate through the dashboard's cyan, blue, green, pink, and violet families. The mapping stays stable wherever the same metric/category reappears.
4. **Semantic state:** success, warning, danger, and informational colors override decorative/category choices when the element communicates actual state.

Do not solve the hierarchy by making every analytical element the route color. A blue route may still have green, pink, violet, and cyan data series or KPI accents when they distinguish separate measures.

## Accent families

Each family has three jobs: a light accent for thick data marks or a 3px strip, a strong color for icons/lines/text, and a soft tint for small selected or icon-tile backgrounds. When an icon is the sole visible control/destination cue, use or derive a contrast-safe UI variant that reaches at least 3:1 on its surface rather than applying opacity blindly.

| Family | Light accent | Strong | Soft tint | Typical analytical use |
| --- | --- | --- | --- | --- |
| Cyan | `#67e8f9` | `#0891b2` | `#ecfeff` | First KPI/category, overview identity, primary neutral analysis |
| Blue | `#5dadec` | `#2563eb` | `#eff6ff` | Comparison series, selection, second KPI/category, focus/action |
| Green | `#86efac` | `#059669` | `#ecfdf5` | Third KPI/category; success only when the context is stateful |
| Pink | `#f9a8d4` | `#db2777` | `#fdf2f8` | Fourth/fifth category, journey/funnel data, contrasting series |
| Violet | `#c4b5fd` | `#7c3aed` | `#f5f3ff` | Fourth KPI/category, device/segment data, forecast/scenario contrast |
| Orange · specialized | — | `#f97316` | `#fff7ed` | Heatmap identity or a deliberately assigned sixth category; not a default warning substitute |

Use pale colors for sufficiently thick marks such as card strips, donut arcs, bars, and area blocks. Use the strong counterpart for thin chart lines, small icons, focus, or text so contrast is not lost on white.

## Route identity versus analytical color

- Route identity is singular. Use its strong color for the page accent rail, active sidebar icon/rail, and optionally the primary time-series line; use its soft tint for the active nav wash and page icon tile.
- Analytical color is plural. Use it to distinguish different metrics, categories, cohorts, scenarios, or series inside the page.
- A route color does not require every KPI, chart, icon, or button on that page to use the same hue.
- Do not change an existing route's identity pair because a chart needs another series color. Choose the chart color from the analytical palette.
- Never choose a route color merely because its current data is healthy, at risk, or failing. For example, a reliability page keeps its registered identity while individual health states use semantic green/warning/red. If a proposed route identity collides with a dominant semantic meaning on that page, choose another durable family or add a non-color route cue.
- Ordinary primary actions may use the dark neutral selection or strong action blue. Do not color every action to match its nearest card.

### Sidebar allocation

The sidebar is product chrome, not a categorical chart. Use color there in three controlled layers:

- each semantic section heading receives one stable strong accent from the shared palette; adjacent groups should not all repeat cyan, while section labels and chevrons remain dark/neutral;
- each destination icon keeps its centrally registered route strong color at about `.78` opacity while inactive and accompanied by a visible label; its label remains neutral gray;
- the active destination raises the icon to full opacity and adds its route's 3px rail, soft row tint, and strong neutral label.

Choose section and route colors through centralized sidebar/page metadata; do not choose them from render order. Reuse the same mappings in expanded, collapsed, drawer, hover/focus, and loading states. Hover may use the shared cyan wash while the destination icon keeps its registered hue. In the icon-only collapsed rail, switch both the icon and active 3px rail to a registered full-opacity `uiStrong` variant that reaches 3:1 against their surfaces; use `#d97706` for accessible orange rather than `#f97316`. Counts may use a compact count treatment, but a status in the rail still follows the plain dot/icon-plus-text rule rather than becoming a capsule.

Recommended section-heading accents for a product-analytics information architecture are:

| Section | Strong icon accent |
| --- | --- |
| Automations | cyan `#0891b2` |
| Growth | blue `#2563eb` |
| Developer | violet `#7c3aed` |
| Alerts | amber `#b45309` |
| Workspace | slate `#475569` |
| You | muted slate `#64748b` |

Destination icons use the product's centralized route identity registry, not the section color by default.

For a new standalone revenue navigation, use this deterministic group registry unless the product brief supplies an established one:

| Section | Strong icon accent | Optional soft selection tint |
| --- | --- | --- |
| Revenue / overview | cyan `#0891b2` | `#ecfeff` |
| Performance | blue `#2563eb` | `#eff6ff` |
| Planning / forecast | violet `#7c3aed` | `#f5f3ff` |
| Alerts | orange `#d97706` | `#fffbeb` |

Register destination identities separately from group identities. For the standalone revenue example, use: overview cyan, customers blue, products green, acquisition pink, retention green, cohorts violet, forecast violet, targets cyan, and revenue alerts orange. Use each family's strong/soft pair from the table above, bind it to the destination key, and reuse it everywhere that route appears. The active destination normally uses its route identity pair. If a one-off destination truly has no registered route identity, inherit its section pair temporarily and add a central registry entry when the route becomes product work; never invent a hue inside a component.

## KPI and summary strips

For a strip of distinct KPIs, use a stable accent sequence rather than one repeated hue or a random rainbow:

1. cyan;
2. blue;
3. green;
4. violet;
5. pink when a fifth distinct measure exists.

Each KPI keeps a white surface and neutral typography. Apply its family through:

- a 3–4px light accent rule;
- optionally a small chart/data mark when the KPI itself contains one.

Do not place a decorative family-colored icon tile at the upper right of a standard KPI card. The delta remains semantic and independent of the card's family: keep its capsule white/transparent with a neutral border and color only the arrow/sign plus numeric text. A green-accented neutral KPI is not automatically “good,” and a negative delta still uses its danger/warning text. A labeled status is never a pill: pair a small semantic dot/icon with plain neutral text and no border or tinted container.

Use one repeated route accent instead of the sequence only when the cards are the **same measure** split by time, platform, or another directly comparable dimension. Distinct measures should not become an all-blue or all-cyan row merely because they share a page.

## Charts and rankings

### Time series and comparison

- Use the route strong color for the primary series when it represents the page's main measure.
- Use a contrast-safe strong blue such as `#2563eb` or `#1a73e8`, or the next unused strong family, for a thin plan/comparison series. Reserve light blue `#5dadec` for thicker marks, areas, or a line with a strong outline plus a distinct dash/marker treatment.
- Keep series mapping stable across cards, expanded views, tooltips, and responsive layouts.
- Use the muted `#e8eef6` chart grid; data color should not leak into axes or card chrome.

### Categorical data

Start with this ordered palette and keep the legend/order mapping stable:

1. cyan `#67e8f9`;
2. green `#86efac`;
3. pink `#f9a8d4`;
4. violet `#c4b5fd`;
5. blue `#5dadec`.

These light accents work for bars, donut arcs, stacked areas, and large markers. Use strong counterparts for thin lines or tiny marks. Do not recolor categories when sorting, filtering, or moving from desktop to mobile.

Bind category colors to a stable domain key or explicit registry, never the current array/sort index. For more than five simultaneous categories, preserve the first five mappings and distinguish additional series with direct labels plus line style, marker shape, or a documented strong/light variant; do not silently invent unrelated hues.

When the chart itself represents semantic outcomes—success/failure, healthy/at-risk, error/non-error—use semantic state colors instead of the neutral category order and label the meaning directly.

### Forecast and scenarios

- Committed/base scenario: cyan light/strong pair.
- Expected scenario: green light/strong pair when it is a neutral labeled scenario, not an inferred success state.
- Upside scenario: violet light/strong pair.
- Downside or at-risk outcome: semantic warning/danger only when the data actually carries that meaning.
- A confidence band uses the light family of its central scenario; historical actuals retain the route identity and a thin plan/comparison line uses contrast-safe strong blue.

Keep the scenario labels visible so green/violet cannot be mistaken for unlabeled good/bad decoration.

### Rankings and tables

- Use color for a slim rank/state accent, small data mark, or plain status dot/icon, not as a full-row rainbow.
- Keep numeric values and labels neutral. A colored dot or bar must have a text label or legend.
- Do not put status dots and labels inside capsules, and do not turn other cells into colored pills.

## Semantic state

| State | Strong | Soft tint | Use |
| --- | --- | --- | --- |
| Informational / selected | `#2563eb` | `#eff6ff` | Active selection, scheduled/in-progress state, focus |
| Success | `#059669` | `#ecfdf5` | Positive completed/healthy state |
| Warning | `#be185d` | `#fdf2f8` | Review/at-risk attention state |
| Danger / error | `#dc2626` | `#fef2f2` | Failure, destructive consequence, negative error state |

Pair semantic color with text, icon, shape, or position. In tables and lists, the default status treatment is a 6px semantic dot or a compact icon beside a plain neutral label: no enclosing border, tinted background, capsule radius, or pill padding. Do not rely on color alone, and do not reuse danger red as an ordinary category color. Because the warning token shares the pink family, pair warning with explicit language and a warning icon/shape whenever neutral pink categories appear nearby; never ask hue alone to distinguish them.

## Distribution and contrast

- Keep broad surfaces neutral. Color belongs in thin rules, icon tiles, small selections, status marks, and data marks.
- Do not use pastel colors for body text. Use the strong counterpart and verify contrast.
- Aim for at least 4.5:1 contrast for normal text and 3:1 for large text, essential icons, and control boundaries. When a light chart accent does not reach 3:1 against its background, add a strong outline/marker, direct value label, pattern, or other non-color distinction so the boundary and meaning remain perceivable.
- Adjacent chart colors must remain distinguishable without hue alone where the comparison is critical; add direct labels, patterns/dashes, or marker shapes as needed.
- Preserve the exact color-to-meaning mapping in exports, responsive variants, loading states, and expanded chart views.
- This reference defines a light dashboard foundation. If the host product supports dark mode, derive role-based dark tokens with verified contrast while preserving family-to-meaning mappings; do not paste these pale light-mode hex values onto dark surfaces or auto-invert charts.

## Anti-patterns

- Making every KPI, icon, and chart blue because the page identity is blue.
- Giving every surface a different tinted background; surfaces stay white/pale neutral.
- Assigning colors by array index when sorting can change the category-to-color mapping.
- Using semantic green/red for neutral categories in a context where viewers will read them as good/bad.
- Using low-contrast pastel text or thin pastel lines on white.
- Adding gradients, glow, glass, or saturated decorative fields to make the palette feel “richer.”
- Treating the multi-color palette as permission for random accent rotation. The sequence and repeated mappings must be intentional.
- Making every sidebar section/destination icon the same hue, graying every inactive destination icon, or assigning hues from current row order instead of stable group/route registries.
- Wrapping a status dot and label in a bordered or tinted capsule.

## Standalone page example

For a new revenue overview with four distinct KPIs:

- use cyan/teal as the page identity and primary revenue line;
- use cyan, blue, green, and violet KPI top-rule families in that order, without trailing metric icons;
- use cyan, green, pink, and violet for categorical product or scenario data;
- use contrast-safe strong blue for a thin plan/comparison line, reserving light brand blue for a thick mark or filled area;
- keep positive/negative deltas semantic, and render invoice statuses as a semantic dot plus plain text with no capsule, independent of the KPI/category family.

This illustrates the allocation grammar; adapt the labels to the host product without changing the color-to-meaning contract accidentally.
