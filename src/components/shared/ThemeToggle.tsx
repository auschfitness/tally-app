"use client";

// Alterna claro/escuro: aplica na hora no <html data-theme> (sem flash) e
// persiste no cookie via Server Action. Preferência local — nunca dado sensível.
import { UiIcon } from "@/components/shared/UiIcon";
import { Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { setThemeAction } from "@/app/(dashboard)/actions";

// `row`: versão com o nome do tema para onde vai. Sem className = item do menu do perfil;
// com className = botão comum (Ajustes → Conta, que é o caminho no celular).
export function ThemeToggle({ row = false, className }: { row?: boolean; className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
    void setThemeAction(next);
  }

  if (row) {
    return (
      <button type="button" role={className ? undefined : "menuitem"} className={className ?? "sb-menuitem"} onClick={toggle}>
        <UiIcon icon={theme === "dark" ? Sun : Moon} />
        {theme === "dark" ? "Tema claro" : "Tema escuro"}
      </button>
    );
  }
  return (
    <button className={className ?? "iconbtn"} title="Alternar tema" onClick={toggle} aria-label="Alternar tema">
      <UiIcon icon={theme === "dark" ? Sun : Moon} />
    </button>
  );
}
