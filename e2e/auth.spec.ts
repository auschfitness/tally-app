import { test, expect } from "@playwright/test";

// E2e leve dos fluxos críticos de auth SSR (login → página protegida com dados
// reais semeados → logout), contra a org de teste. Credenciais vêm de .env.test.
const EMAIL = process.env.TALLY_TEST_EMAIL ?? "";
const PASSWORD = process.env.TALLY_TEST_PASSWORD ?? "";

test.describe("auth SSR + render autenticado", () => {
  test("não-autenticado em /sticks é redirecionado para /login", async ({ page }) => {
    await page.goto("/sticks");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByPlaceholder("E-mail")).toBeVisible();
  });

  test("login mostra dados semeados e logout volta ao login", async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, "fixture ausente (.env.test)");

    // Login
    await page.goto("/login");
    await page.getByPlaceholder("E-mail").fill(EMAIL);
    await page.getByPlaceholder("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();

    // Chega no app (Home protegida)
    await expect(page).toHaveURL(/\/$|\/study$|\/onboarding$/);

    // Modo só Estudo (src/config/nav.ts): Sticks desligado redireciona para /study.
    await page.goto("/sticks");
    await expect(page).toHaveURL(/\/study$/);

    // Logout → volta pro login (sessão invalidada no servidor).
    // dispatchEvent: o indicador de dev do Next fica por cima do "Sair" no canto.
    await page.getByRole("button", { name: "Sair" }).dispatchEvent("click");
    await expect(page).toHaveURL(/\/login$/);
  });
});
