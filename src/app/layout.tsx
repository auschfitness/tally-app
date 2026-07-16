import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
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
