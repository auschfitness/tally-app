import type { MetadataRoute } from "next";

// "Adicionar à tela de início": a Mercy abre como app (sem barra do navegador), direto
// na Bíblia. Ícone mascarável para o Android recortar no formato do aparelho.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mercy",
    short_name: "Mercy",
    description: "Estude a Palavra. Cuide das pessoas.",
    lang: "pt-BR",
    start_url: "/study/bible",
    scope: "/",
    display: "standalone",
    background_color: "#F8FAF8",
    theme_color: "#2A7E3B",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
