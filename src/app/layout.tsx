import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Poppins } from "next/font/google";
import "./globals.css";

// A Poppins é a fonte do design v1. `preload: false` de propósito: sem o <link
// rel="preload">, o arquivo só é baixado quando algum texto realmente pede a família —
// ou seja, o design v2 (que usa a stack do sistema, docs/design-tokens.md) não baixa
// webfont nenhum, e o v1 continua com Poppins. O custo para o v1 é o arquivo ser
// descoberto pelo CSS em vez do preload; `display: "swap"` já cobre esse intervalo.
// ponytail: `preload: false` sai junto com o v1, quando o v2 for aprovado.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Tally · Church OS",
  description: "Church OS com uma camada de inteligência pastoral — ninguém passa despercebido.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Tema lido do cookie NO SERVIDOR → sem flash e sem erro de hidratação.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("tally-theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="pt-BR" data-theme={theme} className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
