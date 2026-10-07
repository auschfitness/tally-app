import { test, expect } from "@playwright/test";

// Modo púlpito: abre pelo editor, mostra a passagem principal citada, abre versículo
// citado no texto (inclusive Isaías, que o leitor de referências perdia), muda letra e tema.
const EMAIL = process.env.TALLY_TEST_EMAIL ?? "";
const PASSWORD = process.env.TALLY_TEST_PASSWORD ?? "";

test("modo púlpito pelo editor", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/login");
  await page.getByPlaceholder("E-mail").fill(EMAIL);
  await page.getByPlaceholder("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/study/, { timeout: 30000 });
  await page.goto("/study");
  await page.getByText("Sermão Teste").first().click();
  await expect(page.getByTestId("sermon-preach")).toBeVisible();
  const body = page.getByPlaceholder(/Comece a escrever/);
  await body.fill("Jesus se apresenta como o pão que desce do céu. Não é só comida para hoje, é vida que não acaba.\n\nOlhe para o contexto: no dia anterior ele alimentou cinco mil pessoas (João 6:11). A multidão queria mais pão, não o Pão.\n\nO convite continua o mesmo: vir e crer. Veja também Isaías 55:1-2.");
  await page.waitForTimeout(1500);
  await page.getByTestId("sermon-preach").click();
  await expect(page).toHaveURL(/\/pregar\//);
  await expect(page.locator("blockquote")).toHaveCount(1, { timeout: 20000 });
  await page.getByRole("button", { name: "João 6:11" }).click();
  await expect(page.locator("blockquote")).toHaveCount(2, { timeout: 20000 });
  await expect(page.getByRole("button", { name: "Isaías 55:1-2" })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.getByRole("button", { name: "Aumentar letra" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await page.getByRole("button", { name: "Diminuir letra" }).click();
  await page.setViewportSize({ width: 800, height: 1100 });
  await page.emulateMedia({ media: "print" });
  await page.emulateMedia({ media: "screen" });
  await expect(page.getByText(/\d:\d\d/).first()).toBeVisible();
});
