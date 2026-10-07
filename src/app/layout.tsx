import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Figtree, Literata } from "next/font/google";
import "./globals.css";

// Figtree: a família da marca Mercy (manual de identidade), do wordmark (900) à interface.
const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "800", "900"],
  variable: "--font-figtree",
  display: "swap",
});

// Literata: serifa de leitura longa (Google Play Livros), com eixo óptico e grego
// politônico. Só a tela da Bíblia pede a família, então também sem preload.
const literata = Literata({
  subsets: ["latin", "latin-ext", "greek", "greek-ext"],
  variable: "--font-read",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://joinmercy.com"),
  title: "Mercy · Church OS",
  description: "Church OS com uma camada de inteligência pastoral — ninguém passa despercebido.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2A7E3B",
};

// Tema lido do cookie NO SERVIDOR → sem flash e sem erro de hidratação.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const theme = jar.get("tally-theme")?.value === "dark" ? "dark" : "light";
  // Preferências de leitura (menu "Aa" do Estudo); valor fora da lista = padrão.
  const readSize = ["m", "l"].find((v) => v === jar.get("mercy-read-size")?.value);
  const readTone = jar.get("mercy-read-tone")?.value === "sepia" ? "sepia" : undefined;
  return (
    <html lang="pt-BR" data-theme={theme} data-read-size={readSize} data-read-tone={readTone} className={`${figtree.variable} ${literata.variable}`}>
      <body>{children}</body>
    </html>
  );
}
