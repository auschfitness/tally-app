"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/shared/LogoMark";
import { NAV_GROUPS, TOP_ITEMS, SETTINGS_ITEM, type NavGroup, type NavItem } from "@/config/nav";
import { logoutAction } from "@/app/(dashboard)/actions";

export interface NavCounts {
  inbox: number;
  people: number;
  tasks: number;
}

const OPEN_KEY = "tally.nav.open";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function groupHasActive(pathname: string, group: NavGroup): boolean {
  return group.items.some((it) => isActive(pathname, it.href));
}

function Item({ item, counts, active }: { item: NavItem; counts: NavCounts; active: boolean }) {
  const count = item.count ? counts[item.count] : null;
  return (
    <Link href={item.href} className={`navitem${active ? " active" : ""}`}>
      <span>{item.label}</span>
      {count ? <span className="cnt">{count}</span> : null}
    </Link>
  );
}

export function Sidebar({ userLabel, counts }: { userLabel: string; counts: NavCounts }) {
  const pathname = usePathname();

  // Estado inicial determinístico (server + 1º render client): abre só o grupo do
  // item ativo — revelação progressiva (design-principles #2). A preferência salva
  // do usuário entra depois, no efeito, evitando divergência de hidratação.
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of NAV_GROUPS) init[g.key] = groupHasActive(pathname, g);
    return init;
  });

  // Após montar: mescla o que o usuário deixou aberto/fechado por último.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPEN_KEY);
      if (raw) setOpen((cur) => ({ ...cur, ...(JSON.parse(raw) as Record<string, boolean>) }));
    } catch {
      /* localStorage indisponível — segue com o default */
    }
  }, []);

  // Ao navegar, garante que o grupo do item ativo esteja aberto.
  useEffect(() => {
    const active = NAV_GROUPS.find((g) => groupHasActive(pathname, g));
    if (active) setOpen((cur) => (cur[active.key] ? cur : { ...cur, [active.key]: true }));
  }, [pathname]);

  function toggle(key: string) {
    setOpen((cur) => {
      const next = { ...cur, [key]: !cur[key] };
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <aside className="side">
      <div className="brand">
        <LogoMark size={28} />
        <span className="wm">Tally</span>
      </div>

      {TOP_ITEMS.map((item) => (
        <Item key={item.key} item={item} counts={counts} active={isActive(pathname, item.href)} />
      ))}

      {NAV_GROUPS.map((group) => {
        const isOpen = open[group.key] ?? false;
        return (
          <div className="navgroup" key={group.key}>
            <button
              type="button"
              className={`navgroup-hd${groupHasActive(pathname, group) ? " has-active" : ""}`}
              aria-expanded={isOpen}
              onClick={() => toggle(group.key)}
            >
              <span>{group.label}</span>
              <svg
                className={`chev${isOpen ? " open" : ""}`}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {isOpen ? (
              <div className="navgroup-items">
                {group.items.map((item) => (
                  <Item
                    key={item.key}
                    item={item}
                    counts={counts}
                    active={isActive(pathname, item.href)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="navsep" />
      <Item item={SETTINGS_ITEM} counts={counts} active={isActive(pathname, SETTINGS_ITEM.href)} />
      <div className="foot">
        <span>{userLabel}</span>
        <br />
        <form action={logoutAction}>
          <button type="submit">Sair</button>
        </form>
      </div>
    </aside>
  );
}
