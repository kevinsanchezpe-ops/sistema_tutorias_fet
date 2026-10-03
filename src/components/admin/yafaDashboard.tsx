import React, { useId, useState } from 'react';

/**
 * Yafa-UI Dashboard primitives adaptados a la identidad FET.
 * - Ruta institucional: verde FET #11770e (strong) / #eaf8ea (tint)
 * - Paleta analítica estable: cyan, blue, green(FET), violet
 * - Geometría: cards 8px, acciones rectangulares 6-8px, sin píldoras para acciones/estados
 * No contiene lógica de negocio: solo presentación.
 */

export const YAFA = {
  canvas: '#f8fafd',
  surface: '#ffffff',
  border: '#dadce0',
  divider: '#e8eaed',
  grid: '#e8eef6',
  strongText: '#202124',
  bodyText: '#3c4043',
  mutedText: '#5f6368',
  routeStrong: '#11770e',
  routeTint: '#eaf8ea',
} as const;

export type YafaAccent = 'cyan' | 'blue' | 'green' | 'violet' | 'pink';

export const YAFA_ACCENTS: Record<YafaAccent, { strong: string; light: string; tint: string }> = {
  cyan: { strong: '#0891b2', light: '#67e8f9', tint: '#ecfeff' },
  blue: { strong: '#2563eb', light: '#5dadec', tint: '#eff6ff' },
  green: { strong: '#11770e', light: '#86efac', tint: '#eaf8ea' },
  violet: { strong: '#7c3aed', light: '#c4b5fd', tint: '#f5f3ff' },
  pink: { strong: '#db2777', light: '#f9a8d4', tint: '#fdf2f8' },
};

export const YAFA_SEMANTIC = {
  info: '#2563eb',
  success: '#059669',
  warning: '#b45309',
  danger: '#dc2626',
} as const;

// ---------- Page identity ----------

export const YafaPageHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}> = ({ icon, title, subtitle, right }) => (
  <div className="rounded-xl border border-[#e2e6e2] bg-white px-4 py-3 sm:px-5">
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#edf6ec] text-[#11770e]">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight text-[#202820] leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[#687168]">{subtitle}</p>
          )}
        </div>
      </div>
      {right && (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end min-w-0">{right}</div>
      )}
    </div>
  </div>
);

// ---------- Cards ----------

export const YafaCard: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  accent?: YafaAccent;
  children: React.ReactNode;
  summary?: string;
}> = ({ title, subtitle, action, accent, children, summary }) => (
  <section
    aria-label={title}
    className="overflow-hidden rounded-xl border border-[#e2e6e2] bg-white"
  >
    <div className="flex items-start justify-between gap-3 border-b border-[#edf0ed] px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-tight text-[#202820]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs leading-snug text-[#687168]">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    <div className="px-4 py-4 sm:px-5">{children}</div>
    {summary && <p className="sr-only">{summary}</p>}
  </section>
);

// ---------- KPI ----------

export const YafaKpiCard: React.FC<{
  title: string;
  definition: string;
  value: string | number;
  comparison?: React.ReactNode;
  accent: YafaAccent;
  footer?: React.ReactNode;
}> = ({ title, definition, value, comparison, accent, footer }) => {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const a = YAFA_ACCENTS[accent];
  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-[#e2e6e2] bg-white">
      <div className="flex min-h-[112px] flex-col gap-2.5 p-4">
        <div className="relative flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: a.strong }} />
          <button
            type="button"
            aria-describedby={tipId}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
            className="text-left text-xs font-medium leading-tight text-[#687168] cursor-help"
          >
            {title}
          </button>
          {open && (
            <div
              role="tooltip"
              id={tipId}
              className="absolute left-0 top-full z-20 mt-2 w-56 max-w-[70vw] rounded-lg bg-[#202820] px-3 py-2 text-xs leading-snug text-white shadow-lg"
            >
              {definition}
            </div>
          )}
        </div>
        <div aria-hidden="true" className="h-px w-full bg-[#edf0ed]" />
        <div className="text-2xl font-semibold leading-none tabular-nums text-[#202820]">
          {value}
        </div>
        {comparison && <div className="text-[11px] leading-snug text-[#687168]">{comparison}</div>}
        {footer && <div className="mt-auto">{footer}</div>}
      </div>
    </article>
  );
};

export const YafaDelta: React.FC<{
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
}> = ({ tone, children }) => {
  const color =
    tone === 'success'
      ? YAFA_SEMANTIC.success
      : tone === 'warning'
        ? YAFA_SEMANTIC.warning
        : tone === 'danger'
          ? YAFA_SEMANTIC.danger
          : tone === 'info'
            ? YAFA_SEMANTIC.info
            : '#5f6368';
  return (
    <span className="inline-flex items-center gap-1 bg-white border border-[#dadce0] rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums">
      <span style={{ color }}>{children}</span>
    </span>
  );
};

// ---------- Status (dot + plain text, sin cápsula) ----------

export const YafaStatus: React.FC<{
  dot: string;
  label: string;
  icon?: React.ReactNode;
}> = ({ dot, label, icon }) => (
  <span className="inline-flex items-center gap-1.5 text-xs text-[#3c4043] whitespace-nowrap">
    {icon ?? (
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
    )}
    <span>{label}</span>
  </span>
);

// ---------- Skeletons / empty / error ----------

export const YafaKpiSkeleton: React.FC = () => (
  <div aria-hidden="true" className="bg-white rounded-lg border border-[#dadce0] overflow-hidden">
    <div className="h-1 w-full bg-[#e8eaed] yafa-shimmer" />
    <div className="p-4 space-y-2.5">
      <div className="h-3.5 w-2/3 rounded bg-[#e8eaed] yafa-shimmer" />
      <div className="h-px w-full bg-[#e8eaed]" />
      <div className="h-8 w-1/2 rounded bg-[#e8eaed] yafa-shimmer" />
      <div className="h-3 w-3/4 rounded bg-[#e8eaed] yafa-shimmer" />
    </div>
  </div>
);

export const YafaChartSkeleton: React.FC<{ height?: number }> = ({ height = 288 }) => (
  <div
    aria-hidden="true"
    className="rounded-md border border-[#e8eaed] bg-[#f8fafd] yafa-shimmer"
    style={{ height }}
  />
);

export const YafaEmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}> = ({ icon, title, hint, action }) => (
  <div className="py-10 px-4 text-center bg-[#f8fafd] rounded-md border border-dashed border-[#dadce0]">
    <div className="mx-auto w-9 h-9 rounded-md bg-white border border-[#e8eaed] flex items-center justify-center text-[#5f6368] mb-2">
      {icon}
    </div>
    <p className="text-[13px] font-semibold text-[#3c4043]">{title}</p>
    {hint && <p className="text-xs text-[#5f6368] mt-1 max-w-md mx-auto">{hint}</p>}
    {action && <div className="mt-3 flex justify-center">{action}</div>}
  </div>
);
