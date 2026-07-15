import { test, expect } from "@playwright/test";

test("WASM demo starts, keeps focus, and exposes critical keyboard actions", async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Aaja Audio Game Engine" })).toBeVisible();

  const enable = page.getByRole("button", { name: "Включить звук" });
  await enable.click();
  await expect(page.locator("#core-version")).not.toHaveText("не загружено");
  await expect(page.locator("#status")).toContainText(/Звук включён|Движок создан/);

  const front = page.getByRole("button", { name: "Спереди — 2" });
  await front.focus();
  await front.click();
  await expect(front).toBeFocused();
  await expect(page.locator("#status")).toContainText("спереди");

  const levelSelect = page.getByLabel("Уровень проверки");
  await levelSelect.selectOption("1");
  const runLevel = page.getByRole("button", { name: "Запустить выбранный уровень — T" });
  await runLevel.focus();
  await runLevel.click();
  await expect(runLevel).toBeFocused();
  await expect(page.locator("#status")).toContainText("Уровень 1");
  await expect(page.locator("#tour-progress")).toHaveAttribute("max", "6");
  await page.getByRole("button", { name: "Остановить сценарий — X" }).click();
  await expect(page.locator("#status")).toContainText("остановлен");

  await page.keyboard.press("h");
  await expect(page.locator("#quality-value")).toContainText("equal-power");
  await page.keyboard.press("Escape");
  await expect(page.locator("#status")).toContainText("аварийно остановлены");

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
