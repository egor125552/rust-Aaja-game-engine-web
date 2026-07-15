import { cp, mkdir, stat } from "node:fs/promises";

const source = "packages/engine/wasm-pkg";
try {
  await stat(`${source}/audio_game_core_bg.wasm`);
  await stat(`${source}/audio_game_core.js`);
} catch (error) {
  throw new Error("WASM output is missing. Run `npm run build:wasm` first.", { cause: error });
}

await mkdir("packages/engine/dist/wasm", { recursive: true });
await cp(source, "packages/engine/dist/wasm", { recursive: true });
