import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import init, { CoreEngine } from "../packages/engine/wasm-pkg/audio_game_core.js";

const bytes = await readFile(new URL("../packages/engine/wasm-pkg/audio_game_core_bg.wasm", import.meta.url));
await init(bytes);

const core = new CoreEngine();
assert.match(core.version(), /^0\.1\./);
core.setListenerPosition(0, 0, 0);
core.upsertSource("near", 0, 0, -1, 1, 20, "music");
core.upsertSource("far", 0, 0, -20, 1, 20, "music");
core.setSourceActive("near", true);
core.setSourceActive("far", true);
assert.equal(core.selectVoiceToEvict("music", 1, 32), "far");
assert.equal(core.distanceToSource("near"), 1);
assert.ok(Number.isFinite(core.attenuationForSource("far", "inverse", 1, 100, 1)));

const cave = JSON.parse(core.roomPresetJson("cave"));
assert.equal(cave.schemaVersion, 1);
assert.equal(cave.name, "cave");
assert.throws(() => core.normalizeRoomPresetJson(JSON.stringify({ ...cave, schemaVersion: 2 })));
core.free();
console.log("WASM contract verified");
