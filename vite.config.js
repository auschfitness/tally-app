import { defineConfig } from "vite";

// App estático (JavaScript vanilla, sem framework).
// O Vite serve tudo em dev com recarga automática e gera a pasta dist/ no build.
export default defineConfig({
  server: { port: 5173, open: false },
  build: { outDir: "dist" },
});
