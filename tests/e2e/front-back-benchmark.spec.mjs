import { test, expect } from "@playwright/test";

test("clean front-back test keeps focus, uses HRTF by default, and cleans handles", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/front-back.html");
  await expect(page.getByRole("heading", { name: "Чистый тест спереди и сзади" })).toBeVisible();
  await expect(page.getByLabel("Пространственный режим")).toHaveValue("hrtf");

  await page.getByRole("button", { name: "Включить или возобновить звук" }).click();
  const run = page.getByRole("button", { name: "Спереди, сзади, спереди, сзади" });
  await run.focus();
  await run.click();
  await expect(run).toBeFocused();
  await expect(page.locator("#status")).toContainText("Тест «спереди, сзади, спереди, сзади» завершён", {
    timeout: 12_000,
  });
  await expect(page.locator("#active-state")).toHaveText("0");
  await expect(page.locator("#handles-state")).toHaveText("0");

  await page.getByLabel("Пространственный режим").selectOption("equal-power");
  await expect(page.locator("#quality-state")).toHaveText("equal-power");
  expect(pageErrors).toEqual([]);
});

test("benchmark smoke measures 8 and 16 sources across cleanup cycles", async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/benchmark.html");
  await page.getByRole("button", { name: "Включить или возобновить звук" }).click();
  const run = page.getByRole("button", { name: "Быстрый smoke: 8 и 16, три цикла" });
  await run.focus();
  await run.click();
  await expect(run).toBeFocused();
  await expect(page.locator("#status")).toContainText("Benchmark завершён", { timeout: 45_000 });

  const report = await page.evaluate(() => globalThis.__aajaBenchmarkLastReport);
  expect(report.requestedCounts).toEqual([8, 16]);
  expect(report.results).toHaveLength(2);
  expect(report.results.every((item) => item.cycleCount === 3)).toBe(true);
  expect(report.results.every((item) => item.cleanupPassed)).toBe(true);
  expect(report.finalSnapshot.playing).toBe(0);
  expect(report.finalSnapshot.registeredHandles).toBe(0);
  expect(report.finalSnapshot.activeSpeechDuckingSessions).toBe(0);
  await expect(page.getByRole("button", { name: "Скачать JSON" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Скачать текстовый отчёт" })).toBeEnabled();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
