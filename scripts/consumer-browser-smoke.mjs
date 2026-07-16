import { chromium } from "@playwright/test";
import { createReadStream } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const root = path.resolve("artifacts/consumer-smoke");
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".wasm", "application/wasm"],
]);

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    const relative = pathname === "/" ? "direct.html" : pathname.replace(/^\/+/, "");
    let filename = path.resolve(root, relative);
    if (!filename.startsWith(`${root}${path.sep}`) && filename !== root) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const metadata = await stat(filename);
    if (metadata.isDirectory()) filename = path.join(filename, "index.html");
    response.writeHead(200, {
      "content-type": contentTypes.get(path.extname(filename)) ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(filename).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Unable to start consumer smoke server");
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch();
const results = [];

try {
  for (const target of [
    { name: "direct-browser-esm", path: "/direct.html" },
    { name: "vite-production", path: "/dist/index.html" },
  ]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(`${origin}${target.path}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Run installed package" }).click();
    await page.locator("#status").filter({ hasText: "passed" }).waitFor({ timeout: 20_000 });
    const result = await page.evaluate(() => globalThis.__aajaConsumerSmoke);
    if (!result?.coreVersion?.startsWith("0.1.")) throw new Error(`${target.name}: Rust/WASM core did not initialize`);
    if (result.during.quality !== "hrtf") throw new Error(`${target.name}: HRTF was not active`);
    if (result.during.roomPreset !== "small-room") throw new Error(`${target.name}: room preset did not apply`);
    if (result.after.playing !== 0) throw new Error(`${target.name}: playing sources remained after stopAll`);
    if (result.after.registeredHandles !== 0) throw new Error(`${target.name}: handles remained after dispose`);
    if (result.after.activeSpeechDuckingSessions !== 0) throw new Error(`${target.name}: ducking remained after cleanup`);
    if (errors.length > 0) throw new Error(`${target.name}: browser errors: ${errors.join(" | ")}`);
    results.push({ target: target.name, coreVersion: result.coreVersion, during: result.during, after: result.after });
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

await writeFile(
  path.join(root, "browser-smoke.json"),
  JSON.stringify({ browser: "chromium", results }, null, 2),
);
console.log(JSON.stringify(results, null, 2));
