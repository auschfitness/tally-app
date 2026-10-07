// Roda os e2e contra um build de produção já no ar (npm run build && npx next start -p 3020).
// Uso: SW=1 npx playwright test e2e/offline.spec.ts --config playwright.prod.config.ts
import base from "./playwright.config";
const { webServer: _ws, ...rest } = base as Record<string, unknown> & { use?: Record<string, unknown> };
export default { ...rest, use: { ...(rest.use ?? {}), baseURL: "http://localhost:3020" } };
