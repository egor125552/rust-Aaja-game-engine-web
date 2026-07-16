import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("artifacts/full-benchmark");
await mkdir(outputDirectory, { recursive: true });
const server = spawn("npm", ["run", "serve"], { stdio: "inherit", shell: process.platform === "win32" });

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:4173/benchmark.html");
      if (response.ok) return;
    } catch {
      // Server startup is still in progress.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Benchmark server did not start");
}

const browser = await chromium.launch();
try {
  await waitForServer();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("http://127.0.0.1:4173/benchmark.html", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Включить или возобновить звук" }).click();
  await page.getByLabel("Количество последовательных циклов создания и очистки").fill("5");
  await page.getByRole("button", { name: "Матрица: 8, 16, 32, 64 и 128" }).click();
  await page.locator("#status").filter({ hasText: "Benchmark завершён" }).waitFor({ timeout: 180_000 });
  const report = await page.evaluate(() => globalThis.__aajaBenchmarkLastReport);
  if (!report) throw new Error("Benchmark did not expose a report");
  if (errors.length > 0) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  if (report.results.some((result) => !result.cleanupPassed)) {
    throw new Error("At least one full benchmark cleanup cycle failed");
  }
  await writeFile(path.join(outputDirectory, "benchmark.json"), JSON.stringify(report, null, 2));
  await writeFile(path.join(outputDirectory, "benchmark.txt"), await page.locator("#report-text").textContent() ?? "");
  console.log(JSON.stringify(report.results.map((result) => ({
    count: result.count,
    peakPlaying: result.peakPlaying,
    evicted: result.evicted,
    createMs: result.averageTimingsMs.create,
    disposeMs: result.averageTimingsMs.dispose,
    cleanupPassed: result.cleanupPassed,
  })), null, 2));
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
