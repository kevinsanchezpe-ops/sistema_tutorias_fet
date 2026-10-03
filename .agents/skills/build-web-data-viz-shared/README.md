# build-web-data-visualization (openai/plugins) — instalación local

Fuente: https://github.com/openai/plugins (`plugins/build-web-data-visualization`),
clonado por sparse-checkout y copiado el 2026-10-02.

## Contenido

- `../data-visualization/` — skill router (SKILL.md + `references/`, `agents/`)
- `../dashboards-and-real-time-visualization/` — skill de dashboards en vivo (SKILL.md + `references/`, `agents/`)
- `../testing-data-visualizations/` — skill de testing (dependencia directa del skill de dashboards: `../testing-data-visualizations/SKILL.md`)
- `references/` — fundamentos compartidos (`foundations/`, `source-index/`)
- `templates/` — plantillas compartidas (contracts, briefs, checklists, starters)

## Mapeo de rutas

Los SKILL.md usan rutas relativas al layout original del repo:

| Ruta en el SKILL | Equivalente local |
|---|---|
| `../../references/...` | `build-web-data-viz-shared/references/...` |
| `../../assets/templates/...` | `build-web-data-viz-shared/templates/...` |
| `../testing-data-visualizations/SKILL.md` | `testing-data-visualizations/SKILL.md` |
| `./references/...` | `references/` dentro de cada skill |
