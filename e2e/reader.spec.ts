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
  await expect(page).toHaveURL(/\/$|\/study$|\/onboarding$/);
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

  // Spec 08. Exige a tabela study_highlights (m55). Deixa o versículo limpo no fim.
  test("seleção pelo número: pinta, troca, tira e anota (lápis no texto)", async ({ page }) => {
    await login(page);
    await page.goto("/study/bible/JHN/3");
    const verse = page.locator('[data-verse="16"]');
    const num = verse.getByRole("button", { name: /^Versículo João 3:16$/ });
    const hl = verse.getByTestId("verse-text");
    const bar = page.getByTestId("selection-bar");
    // A cor aparece na hora; a gravação (server action, POST) vai por trás.
    async function pick(name: string | RegExp): Promise<void> {
      await num.click();
      const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/study/bible/"));
      await bar.getByRole("button", { name }).click();
      await saved;
    }

    const left = await hl.getAttribute("data-hl"); // sobra de rodada anterior
    if (left) await pick("Tirar destaque");
    await expect(hl).not.toHaveAttribute("data-hl", /.+/);

    await num.click();
    await expect(bar).toContainText("João 3:16");
    await expect(num).toHaveAttribute("aria-pressed", "true");
    await num.click(); // tocar de novo desfaz a seleção
    await expect(bar).toHaveCount(0);

    await pick("Amarelo");
    await expect(hl).toHaveAttribute("data-hl", "yellow");
    await expect(bar).toHaveCount(0);
    await pick("Verde");
    await expect(hl).toHaveAttribute("data-hl", "green");
    await page.reload();
    await expect(hl).toHaveAttribute("data-hl", "green"); // gravou no banco
    await pick("Tirar destaque");
    await expect(hl).not.toHaveAttribute("data-hl", /.+/);

    await num.click();
    await bar.getByRole("button", { name: "Anotar" }).click();
    await expect(page.getByTestId("notes-tab")).toContainText("João 3:16");
    await page.locator("#reader-note").fill("teste e2e spec 08");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(verse.getByTestId("note-mark")).toBeVisible();

    const mine = page.getByTestId("notes-tab").locator("li", { hasText: "teste e2e spec 08" });
    await mine.getByRole("button", { name: "Excluir" }).click();
    await expect(verse.getByTestId("note-mark")).toHaveCount(0);
  });

  test("toque no texto seleciona o versículo sem Interlinear; Esc limpa", async ({ page }) => {
    await login(page);
    await page.goto("/study/bible/GEN/1");
    const bar = page.getByTestId("selection-bar");
    await page.locator('[data-verse="3"] [data-testid="verse-text"]').click();
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("Gênesis 1:3");
    await page.keyboard.press("Escape");
    await expect(bar).toHaveCount(0);
  });
  test("dicionário UBS: batismo em Efésios 4:5 mostra glosas, domínio e o versículo citado", async ({ page }) => {
    await login(page);
    await page.goto("/study/bible/EPH/4");
    await page.getByTestId("interlinear-toggle").check();
    await page.getByTestId("reader-text").locator('[data-strong="G0908"]').first().click();
    const tab = page.getByTestId("word-tab");
    await expect(tab.getByRole("heading", { name: "batizar, batismo" })).toBeVisible();
    await expect(tab).toContainText("Atividades religiosas");
    await expect(tab.locator("blockquote mark")).toHaveText(/batismo/);
    await page.screenshot({ path: "test-results/ubs-ef4.png" });
  });
});
