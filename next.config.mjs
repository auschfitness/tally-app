import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Há outros lockfiles acima desta pasta (o app Vite legado e o home do usuário).
  // Fixa a raiz de tracing nesta app para o Next não inferir a pasta errada.
  outputFileTracingRoot: __dirname,
  eslint: {
    // O lint roda no passo de verificação (npm run lint); não bloquear o build por lint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
