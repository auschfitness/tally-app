"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/shared/LogoMark";
import { NAV, SETTINGS_ITEM, type NavItem } from "@/config/nav";
import { logoutAction } from "@/app/(dashboard)/actions";

export interface NavCounts {
  inbox: number;
  people: number;
  tasks: number;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
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
  return (
    <aside className="side">
      <div className="brand">
        <LogoMark size={28} />
        <span className="wm">Tally</span>
      </div>
      {NAV.map((item) => (
        <Item key={item.key} item={item} counts={counts} active={isActive(pathname, item.href)} />
      ))}
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
