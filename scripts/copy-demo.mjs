import { cp, mkdir, stat } from "node:fs/promises";

for (const required of [
  "packages/engine/dist/index.js",
  "packages/engine/dist/wasm/audio_game_core_bg.wasm",
]) {
  await stat(required);
}

await mkdir("demo/dist", { recursive: true });
await cp("demo/index.html", "demo/dist/index.html");
await cp("demo/styles.css", "demo/dist/styles.css");
await cp("demo/src", "demo/dist/src", { recursive: true });
await cp("demo/assets", "demo/dist/assets", { recursive: true });
await cp("demo/assets", "demo/dist/assets", { recursive: true });
await cp("packages/engine/dist", "demo/dist/engine", { recursive: true });
