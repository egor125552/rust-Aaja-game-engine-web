import test from "node:test";
import assert from "node:assert/strict";

import {
  ALL_ROOM_PRESETS,
  FEATURE_LEVELS,
  createFeatureTour,
} from "../demo/src/feature-tour.js";
import { createTestEarconBytes } from "../demo/src/test-earcon.js";

test("feature tour exposes eight unique levels and every built-in room", () => {
  assert.equal(FEATURE_LEVELS.length, 8);
  assert.equal(new Set(FEATURE_LEVELS.map((level) => level.id)).size, 8);
  assert.deepEqual(ALL_ROOM_PRESETS, [
    "dry",
    "small-room",
    "large-room",
    "long-corridor",
    "basement",
    "metal-room",
    "metal-corridor",
    "cave",
    "street",
    "outdoors",
    "forest",
    "underwater",
  ]);
});

test("generated listening sample is a non-empty mono PCM WAV", () => {
  const bytes = createTestEarconBytes();
  const view = new DataView(bytes);
  const text = (offset, length) => Array.from(
    new Uint8Array(bytes, offset, length),
    (value) => String.fromCharCode(value),
  ).join("");

  assert.equal(text(0, 4), "RIFF");
  assert.equal(text(8, 4), "WAVE");
  assert.equal(view.getUint16(20, true), 1);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 48_000);
  assert.ok(bytes.byteLength > 80_000);
});

test("stopping an idle tour is safe and announces its state", async () => {
  const messages = [];
  const tour = createFeatureTour({
    requireEngine: async () => { throw new Error("should not start"); },
    announce: (message) => messages.push(message),
    createSampleUrl: () => "blob:test",
  });

  await tour.stop("Остановлено тестом.");
  assert.equal(tour.isRunning, false);
  assert.deepEqual(messages, ["Остановлено тестом."]);
});
