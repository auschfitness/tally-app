// Tema claro/escuro. Preferência do aparelho, guardada no localStorage
// (é a única coisa que ainda usa localStorage — dados do app vão pro Supabase).

const MOON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const SUN='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>';
export function curTheme(){return localStorage.getItem("tally_theme")||"light";}
export function applyTheme(){const t=curTheme();document.documentElement.setAttribute("data-theme",t);const b=document.getElementById("themeBtn");if(b)b.innerHTML=t==="dark"?SUN:MOON;}
export function setTheme(v){if(v==="system")localStorage.removeItem("tally_theme");else localStorage.setItem("tally_theme",v);applyTheme();}
export function toggleTheme(){localStorage.setItem("tally_theme",curTheme()==="dark"?"light":"dark");applyTheme();}
