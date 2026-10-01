import { test, expect, type Page } from "@playwright/test";

// Fumaça da tela de leitura (spec 07). Exige a flag `study.reader` ligada para a org de
// teste (override no /admin) e a ligação de João carregada (Tarefa 9).
const EMAIL = process.env.TALLY_TEST_EMAIL ?? "";
const PASSWORD = process.env.TALLY_TEST_PASSWORD ?? "";

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("E-mail").fill(EMAIL);
  await page.getByPlaceholder("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$|\/onboarding$/);
}

// João 1 com a chave ligada e a aba Palavra aberta na área de trabalho.
async function openWordTab(page: Page): Promise<void> {
  await page.goto("/study/bible/JHN/1");
  await expect(page.getByTestId("reader-text")).toContainText("No princípio");
  await page.getByTestId("interlinear-toggle").check();
  const words = page.getByTestId("reader-text").locator("[data-strong]");
  expect(await words.count()).toBeGreaterThan(10);
  await words.first().click(); // abre direto, sem balão
  await expect(page.getByTestId("workspace")).toBeVisible();
  await expect(page.getByTestId("word-tab")).toBeVisible();
}

test.describe("Estudo → Bíblia (leitura)", () => {
  test.skip(!EMAIL || !PASSWORD, "fixture ausente (.env.test)");

  test("João 1 abre, a chave acende as palavras e o toque abre a palavra no painel", async ({ page }) => {
    await login(page);
    await openWordTab(page);
  });

  test("Gênesis 1 lê normal e não mostra a chave", async ({ page }) => {
    await login(page);
    await page.goto("/study/bible/GEN/1");
    await expect(page.getByTestId("reader-text")).toBeVisible();
    await expect(page.getByTestId("interlinear-toggle")).toHaveCount(0);
  });

  test("trocar de capítulo mantém a área de trabalho e a aba abertas", async ({ page }) => {
    await login(page);
    await openWordTab(page);
    // A área mora no layout (ReaderWorkspace): a página do capítulo remonta, ela não.
    await page.getByRole("navigation", { name: "Capítulos" }).getByRole("button", { name: /João 2/ }).click();
    await expect(page).toHaveURL(/\/study\/bible\/JHN\/2$/);
    await expect(page.getByTestId("reader-text")).toContainText("João 2");
    await expect(page.getByTestId("workspace")).toBeVisible();
    await expect(page.getByTestId("word-tab")).toBeVisible();
  });
});
