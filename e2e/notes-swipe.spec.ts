import { test, expect, type Page } from "@playwright/test";
// Celular: a nota aberta fecha arrastando para a direita (peteleco ou mais da metade da tela).
const EMAIL = process.env.TALLY_TEST_EMAIL ?? "";
const PASSWORD = process.env.TALLY_TEST_PASSWORD ?? "";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

async function swipe(page: Page, x0: number, x1: number, steps: number, ms: number) {
  const cdp = await page.context().newCDPSession(page);
  const y = 400;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y }] });
    await page.waitForTimeout(ms / steps);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

test("arrastar a nota para a direita fecha; arrasto curto volta", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("E-mail").fill(EMAIL);
  await page.getByPlaceholder("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/study/, { timeout: 30000 });
  await page.goto("/study/notes");
  await page.getByText("João 2:6").first().click();
  await expect(page).toHaveURL(/\?n=/);
  const pane = page.locator('[class*="nPaneOpen"]');
  await expect(pane).toBeVisible();
  await page.waitForTimeout(400);

  // curto e lento: continua aberta
  await swipe(page, 120, 190, 10, 800);
  await page.waitForTimeout(500);
  await expect(page.locator('[class*="nPaneOpen"]')).toHaveCount(1);

  // peteleco: fecha e o endereço perde o ?n
  await swipe(page, 120, 200, 4, 60);
  await page.waitForTimeout(600);
  await expect(page.locator('[class*="nPaneOpen"]')).toHaveCount(0);
  await expect(page).not.toHaveURL(/\?n=/);

  // longo e lento também fecha
  await page.getByText("João 2:6").first().click();
  await page.waitForTimeout(400);
  await swipe(page, 60, 330, 20, 1200);
  await page.waitForTimeout(600);
  await expect(page.locator('[class*="nPaneOpen"]')).toHaveCount(0);
});
