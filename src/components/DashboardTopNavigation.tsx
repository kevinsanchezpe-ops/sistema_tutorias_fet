import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export interface DashboardNavigationItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  onSelect: () => void;
}

export interface DashboardNavigationGroup {
  label: string;
  items: DashboardNavigationItem[];
}

interface DashboardTopNavigationProps {
  groups: DashboardNavigationGroup[];
  activeId: string;
  ariaLabel: string;
}

export const DashboardTopNavigation: React.FC<DashboardTopNavigationProps> = ({ groups, activeId, ariaLabel }) => {
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setHeaderSlot(document.getElementById('dashboard-navigation-slot'));
  }, []);

  useEffect(() => {
    if (!headerSlot) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) {
        navRef.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach((menu) => {
          menu.open = false;
        });
      }
    };
    document.addEventListener('click', closeOnOutsideClick);
    return () => document.removeEventListener('click', closeOnOutsideClick);
  }, [headerSlot]);

  const closeOpenMenus = () => {
    navRef.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach((menu) => {
      menu.open = false;
    });
  };

  if (!headerSlot) return null;

  return createPortal(
  <nav ref={navRef} aria-label={ariaLabel} className="relative z-20 w-full rounded-lg border border-stone-200 bg-white text-slate-700 shadow-sm">
    <div className="flex min-h-12 flex-wrap items-center gap-1 overflow-visible px-2 py-1 sm:px-3">
      {groups.map((group) => {
        const active = group.items.some((item) => item.id === activeId);
        if (group.items.length === 1) {
          const item = group.items[0];
          return (
            <button
              key={group.label}
              type="button"
              onClick={() => {
                closeOpenMenus();
                item.onSelect();
              }}
              aria-current={item.id === activeId ? 'page' : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded px-3 text-sm transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 ${item.id === activeId ? 'bg-green-50 font-semibold text-green-800' : 'font-medium'}`}
            >
              <span>{item.label}</span>{item.count !== undefined && <span className="rounded-full bg-stone-100 px-1.5 text-xs text-stone-600">{item.count}</span>}
            </button>
          );
        }
        return (
          <details key={group.label} className="group relative shrink-0" onToggle={(event) => {
            if (!event.currentTarget.open) return;
            const siblings = event.currentTarget.parentElement?.querySelectorAll('details[open]') ?? [];
            siblings.forEach((sibling) => {
              if (sibling !== event.currentTarget) (sibling as HTMLDetailsElement).open = false;
            });
          }}>
            <summary className={`flex min-h-10 cursor-pointer list-none items-center gap-2 rounded px-3 text-sm transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 [&::-webkit-details-marker]:hidden ${active ? 'bg-green-50 font-semibold text-green-800' : 'font-medium'}`}>
              {group.label}<ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute left-0 top-full z-30 mt-1 min-w-56 overflow-hidden rounded-md border border-stone-200 bg-white py-1 text-slate-700 shadow-lg">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={(event) => {
                    item.onSelect();
                    const details = event.currentTarget.closest('details');
                    if (details) details.open = false;
                  }}
                  aria-current={item.id === activeId ? 'page' : undefined}
                  className={`flex min-h-10 w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-green-700 ${item.id === activeId ? 'bg-green-50 font-semibold text-green-800' : ''}`}
                >
                  <span className="flex-1">{item.label}</span>
                  {item.count !== undefined && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs tabular-nums text-stone-600">{item.count}</span>}
                </button>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  </nav>,
  headerSlot
  );
};
