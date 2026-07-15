import { rm } from "node:fs/promises";

await Promise.all([
  rm("packages/engine/dist", { recursive: true, force: true }),
  rm("packages/engine/wasm-pkg", { recursive: true, force: true }),
  rm("demo/dist", { recursive: true, force: true }),
  rm("test-results", { recursive: true, force: true }),
  rm("playwright-report", { recursive: true, force: true }),
]);
