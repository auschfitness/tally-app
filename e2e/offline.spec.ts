import { test, expect } from "@playwright/test";

// Leitura sem internet (service worker, que só existe no build de produção). Guarda o
// capítulo aberto direto e o trocado pelo botão do app; sem rede, o capítulo guardado
// abre e as outras telas mostram /offline.html com a lista. Ver playwright.prod.config.ts.
test.skip(process.env.SW !== "1", "precisa do build de produção: SW=1 com playwright.prod.config.ts");
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test("lê sem internet", async ({ page, context }) => {
  test.setTimeout(120000);
  await page.goto("/login");
  await page.getByPlaceholder("E-mail").fill(process.env.TALLY_TEST_EMAIL ?? "");
  await page.getByPlaceholder("Senha").fill(process.env.TALLY_TEST_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/study/, { timeout: 30000 });
  await page.goto("/study/bible/JHN/1");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); // agora a página é controlada pelo service worker
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // troca de capítulo pelo próprio app (sem recarregar) também guarda
  await page.goto("/study/bible/PSA/23");
  await page.getByRole("link", { name: /próximo capítulo/i }).or(page.getByRole("button", { name: /próximo capítulo/i })).first().click();
  await expect(page).toHaveURL(/PSA\/24/);
  await page.waitForTimeout(3000);
  const kept = await page.evaluate(async () => (await (await caches.open("mercy-pages-v1")).keys()).map((r) => new URL(r.url).pathname));
  expect(kept).toEqual(expect.arrayContaining(["/study/bible/JHN/1", "/study/bible/PSA/24"]));
  await context.setOffline(true);
  await page.goto("/study/bible/JHN/1");
  await expect(page.getByTestId("reader-text")).toContainText("No princípio");
  await page.goto("/study/notes");
  await expect(page.getByRole("heading", { name: "Sem internet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "João 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Salmos 24" })).toBeVisible();
  await context.setOffline(false);
});
