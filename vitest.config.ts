import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Vitest para testes de unidade (regras de domínio puras) e de integração
// (queries/actions contra uma sessão de usuário de teste — gated por env).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
