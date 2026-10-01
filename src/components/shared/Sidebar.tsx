"use client";

// Menu lateral (redesign 2026-10-01, estilo "source list" do macOS). No desktop: marca,
// "Ir para passagem" (Ctrl+K), destinos, capítulos recentes e, embaixo, Ajustes e o
// perfil (tema, sair). Recolhe para só ícones (Ctrl+\), lembrado neste aparelho. No
// celular o menu some e vira barra de abas embaixo, ao alcance do polegar.
// Modo só Estudo (STUDY_ONLY): destinos = Bíblia, Sermões, Notas. Fora dele, os grupos
// do app viram seções (cabeçalho quieto + itens).
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "@/components/shared/LogoMark";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { NAV_GROUPS, TOP_ITEMS, PLANS_ITEM, SETTINGS_ITEM, ADMIN_ITEM, STUDY_ONLY, STUDY_ITEMS } from "@/config/nav";
import { planAllows, type PlanCode, type FeatureKey } from "@/features/plans/catalog";
import { logoutAction } from "@/app/(dashboard)/actions";
import { parseRefs } from "@/lib/bible/parse";
import { RECENT_KEY, chapterLabel, parseRecent, type ChapterRef } from "@/features/study/reader";

export interface NavCounts {
  inbox: number;
  people: number;
  tasks: number;
}

type IconName = "book" | "sermon" | "notes" | "settings" | "admin" | "dot" | "panel" | "search" | "logout";
const PATHS: Record<IconName, string> = {
  book: "M12 6.5C10 5 7 4.6 3.5 5.2v13c3.5-.6 6.5-.2 8.5 1.3 2-1.5 5-1.9 8.5-1.3v-13C17 4.6 14 5 12 6.5zM12 6.5v13",
  sermon: "M9 3.5h6a1 1 0 0 1 1 1V11a4 4 0 0 1-8 0V4.5a1 1 0 0 1 1-1zM5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v3.5M8.5 20.5h7",
  notes: "M5 3.5h10l4 4v13H5zM15 3.5v4h4M8.5 12h7M8.5 15.5h7",
  settings: "M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zM19.4 13.5l1.6 1.2-1.8 3.1-1.9-.7a7.3 7.3 0 0 1-2.3 1.3l-.3 2.1h-3.6l-.3-2.1a7.3 7.3 0 0 1-2.3-1.3l-1.9.7-1.8-3.1 1.6-1.2a7.4 7.4 0 0 1 0-2.9L3 9.3l1.8-3.1 1.9.7A7.3 7.3 0 0 1 9 5.6l.3-2.1h3.6l.3 2.1a7.3 7.3 0 0 1 2.3 1.3l1.9-.7 1.8 3.1-1.6 1.2a7.4 7.4 0 0 1 0 2.9z",
  admin: "M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z",
  dot: "M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
  panel: "M4 4.5h16v15H4zM9.5 4.5v15",
  search: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5L20 20",
  logout: "M14 4.5h4.5v15H14M10 8l-4 4 4 4M6 12h9",
};
function Icon({ name }: { name: IconName }) {
  return (
    <svg className="sb-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}

interface Dest {
  key: string;
  label: string;
  href: string;
  icon: IconName;
  match: string[];
  count?: number;
  feature?: FeatureKey;
}
const isOn = (path: string, d: Dest): boolean =>
  d.match.some((m) => (m === "/" || m === "/study" ? path === m : path === m || path.startsWith(m + "/")));
const plain = (href: string): string[] => [href];

const MINI_KEY = "tally.nav.mini";

export function Sidebar({
  userLabel,
  orgName,
  counts,
  isPlatformAdmin = false,
  plan = "free",
}: {
  userLabel: string;
  orgName: string;
  counts: NavCounts;
  isPlatformAdmin?: boolean;
  plan?: PlanCode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [mini, setMini] = useState(false);
  const [recent, setRecent] = useState<ChapterRef[]>([]);
  const [menu, setMenu] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Preferência e recentes vêm do aparelho, depois de montar (sem divergir da hidratação).
  useEffect(() => {
    try {
      setMini(localStorage.getItem(MINI_KEY) === "1");
    } catch {
      /* armazenamento bloqueado: menu aberto */
    }
  }, []);
  useEffect(() => {
    const load = (): void => {
      try {
        setRecent(parseRecent(localStorage.getItem(RECENT_KEY)));
      } catch {
        setRecent([]);
      }
    };
    load();
    window.addEventListener("tally:recent", load);
    return () => window.removeEventListener("tally:recent", load);
  }, []);

  const toggleMini = useCallback((): void => {
    setMini((m) => {
      try {
        localStorage.setItem(MINI_KEY, m ? "0" : "1");
      } catch {
        /* só nesta visita */
      }
      return !m;
    });
  }, []);

  // Atalhos: Ctrl/Cmd+K vai para a busca de passagem; Ctrl/Cmd+\ recolhe o menu.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (mini) toggleMini();
        requestAnimationFrame(() => searchRef.current?.focus());
      } else if (e.key === "\\") {
        e.preventDefault();
        toggleMini();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mini, toggleMini]);

  // Menu do perfil: fecha com Esc e com clique fora.
  useEffect(() => {
    if (!menu) return;
    function onDown(e: PointerEvent): void {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setMenu(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setMenu(false);
    }
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);
  useEffect(() => setMenu(false), [path]);

  function goToPassage(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const input = searchRef.current;
    const ref = parseRefs(input?.value ?? "")[0];
    if (!ref) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    if (input) {
      input.value = "";
      input.blur();
    }
    router.push(`/study/bible/${ref.book}/${ref.chapter}`);
  }

  const countOf = (c?: "inbox" | "people" | "tasks"): number | undefined => (c ? counts[c] || undefined : undefined);
  const dests: Dest[] = STUDY_ONLY ? STUDY_ITEMS : [];
  // ponytail: fora do modo só Estudo os itens usam um ícone genérico; desenhar um por módulo quando eles voltarem.
  const groups = STUDY_ONLY
    ? []
    : [
        { key: "top", label: "", items: TOP_ITEMS },
        ...NAV_GROUPS,
      ].map((g) => ({
        key: g.key,
        label: g.label,
        items: g.items.map<Dest>((i) => ({ key: i.key, label: i.label, href: i.href, icon: "dot", match: plain(i.href), count: countOf(i.count), feature: i.feature })),
      }));
  const footer: Dest[] = [
    ...(STUDY_ONLY ? [] : [{ key: PLANS_ITEM.key, label: PLANS_ITEM.label, href: PLANS_ITEM.href, icon: "dot" as const, match: plain(PLANS_ITEM.href) }]),
    { key: SETTINGS_ITEM.key, label: "Ajustes", href: SETTINGS_ITEM.href, icon: "settings", match: plain(SETTINGS_ITEM.href) },
    ...(isPlatformAdmin ? [{ key: ADMIN_ITEM.key, label: ADMIN_ITEM.label, href: ADMIN_ITEM.href, icon: "admin" as const, match: plain(ADMIN_ITEM.href) }] : []),
  ];
  const locked = (d: Dest): boolean => !STUDY_ONLY && Boolean(d.feature) && !planAllows(plan, d.feature as FeatureKey);

  const item = (d: Dest): React.ReactElement => {
    const on = isOn(path, d);
    return (
      <Link key={d.key} href={d.href} className={`sb-item${on ? " on" : ""}`} aria-current={on ? "page" : undefined} title={mini ? d.label : undefined}>
        <Icon name={d.icon} />
        <span className="sb-label">{d.label}</span>
        {d.count ? <span className="sb-count">{d.count}</span> : null}
        {locked(d) ? <span className="sb-count" title="Recurso do plano Igreja">Igreja</span> : null}
      </Link>
    );
  };

  const initial = (userLabel.trim()[0] ?? "?").toUpperCase();
  const tabs = STUDY_ONLY ? [...STUDY_ITEMS, { key: "settings", label: "Ajustes", href: SETTINGS_ITEM.href, icon: "settings" as const, match: plain(SETTINGS_ITEM.href) }] : [];

  return (
    <>
      <aside className={`side sb${mini ? " mini" : ""}`} aria-label="Menu">
        <div className="sb-head">
          <Link href={STUDY_ONLY ? "/study/bible" : "/"} className="sb-brand" aria-label="Tally, início">
            <LogoMark size={26} />
            <span className="sb-label">Tally</span>
          </Link>
          <button type="button" className="sb-iconbtn" onClick={toggleMini} aria-label={mini ? "Expandir menu" : "Recolher menu"} title={`${mini ? "Expandir" : "Recolher"} menu (Ctrl+\\)`}>
            <Icon name="panel" />
          </button>
        </div>

        {mini ? (
          <button type="button" className="sb-item" onClick={() => { toggleMini(); requestAnimationFrame(() => searchRef.current?.focus()); }} title="Ir para passagem (Ctrl+K)" aria-label="Ir para passagem">
            <Icon name="search" />
          </button>
        ) : (
          <form className="sb-search" onSubmit={goToPassage} role="search">
            <Icon name="search" />
            <input ref={searchRef} placeholder="Ir para… João 3:16" aria-label="Ir para passagem" onChange={() => notFound && setNotFound(false)} />
            <kbd>Ctrl K</kbd>
          </form>
        )}
        {notFound && !mini ? <p className="sb-hint" role="status">Não achei essa passagem.</p> : null}

        <nav className="sb-nav">
          {dests.map(item)}
          {groups.map((g) => (
            <div key={g.key} className="sb-section">
              {g.label && !mini ? <p className="sb-sectionhd">{g.label}</p> : null}
              {g.items.map(item)}
            </div>
          ))}
        </nav>

        {STUDY_ONLY && recent.length && !mini ? (
          <div className="sb-section">
            <p className="sb-sectionhd">Recentes</p>
            {recent.map((r) => {
              const href = `/study/bible/${r.book}/${r.chapter}`;
              return (
                <Link key={href} href={href} className={`sb-item sb-recent${path === href ? " on" : ""}`}>
                  <span className="sb-label">{chapterLabel(r)}</span>
                </Link>
              );
            })}
          </div>
        ) : null}

        <div className="sb-foot">
          {footer.map(item)}
          <div className="sb-profile" ref={profileRef}>
            <button type="button" className="sb-item sb-me" data-testid="profile-menu" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} title={mini ? userLabel : undefined}>
              <span className="sb-avatar" aria-hidden>{initial}</span>
              <span className="sb-label sb-who">
                <b>{userLabel}</b>
                <span>{orgName}</span>
              </span>
            </button>
            {menu ? (
              <div className="sb-menu" role="menu">
                <ThemeToggle row />
                <form action={logoutAction}>
                  <button type="submit" role="menuitem" className="sb-menuitem"><Icon name="logout" />Sair</button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      {tabs.length ? (
        <nav className="sb-tabbar" aria-label="Menu">
          {tabs.map((d) => {
            const on = isOn(path, d);
            return (
              <Link key={d.key} href={d.href} className={on ? "on" : undefined} aria-current={on ? "page" : undefined}>
                <Icon name={d.icon} />
                <span>{d.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </>
  );
}
