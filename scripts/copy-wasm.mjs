import { cp, mkdir, rm, stat } from "node:fs/promises";

const source = "packages/engine/wasm-pkg";
const destination = "packages/engine/dist/wasm";
const files = [
  "audio_game_core.js",
  "audio_game_core_bg.wasm",
  "audio_game_core.d.ts",
  "audio_game_core_bg.wasm.d.ts",
];

try {
  for (const file of files) await stat(`${source}/${file}`);
} catch (error) {
  throw new Error("WASM output is missing. Run `npm run build:wasm` first.", { cause: error });
}

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const file of files) await cp(`${source}/${file}`, `${destination}/${file}`);
