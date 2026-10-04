import { test, expect } from "@playwright/test";

const EMAIL = process.env.TALLY_TEST_EMAIL ?? "";
const PASSWORD = process.env.TALLY_TEST_PASSWORD ?? "";

test("SDBH: criou em Gn 1.1 mostra sentido e crédito portugueses", async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, "fixture ausente (.env.test)");
  // Prévia antes da carga: só a consulta UBS de H1254 é simulada.
  await page.route("**/rest/v1/ubs_senses?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("strong") !== "eq.H1254") return route.continue();
    const sense = { sense_id: "001155001001000", lemma: "ברא", entry_code: null, ord: 0,
      glosses: ["criar"], definition: "ação causativa pela qual uma deidade traz à existência algo que não existia antes",
      comments: null, domains: ["Existir"], subdomains: [] };
    await route.fulfill({ json: [url.searchParams.get("select") === "sense_id" ? { sense_id: sense.sense_id } : sense] });
  });
  await page.goto("/login");
  await page.getByPlaceholder("E-mail").fill(EMAIL);
  await page.getByPlaceholder("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/$|\/study(\/bible.*)?$|\/onboarding$/, { timeout: 30000 });
  await page.goto("/study/bible/GEN/1");
  await expect(page.getByTestId("reader-text")).toContainText("No princípio");
  await page.getByTestId("interlinear-toggle").check();
  await page.locator('[data-verse="1"] [data-strong="H1254"]').first().click();
  const word = page.getByTestId("word-tab");
  await expect(word).toContainText("traz à existência");
  await expect(word).toContainText("Dicionário de Hebraico Bíblico da UBS");
  await expect(word).toContainText("edição em português da UBS");
  await expect(word).not.toContainText("tradução Tally");
  await page.screenshot({ path: "docs/previews/task5-hebrew-gen1.png", fullPage: true });
});
