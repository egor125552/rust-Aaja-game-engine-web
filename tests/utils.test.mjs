import test from "node:test";
import assert from "node:assert/strict";
import {
  clamp,
  clamp01,
  createId,
  normalizeDirection,
  sanitizeRampMs,
  sanitizeVec3,
  setListenerOrientationParams,
  setListenerPositionParams,
  setOrientationParams,
  setPositionParams,
} from "../packages/engine/dist/utils.js";

test("numeric guards reject non-finite values and enforce ranges", () => {
  assert.equal(clamp(Number.NaN, 2, 8), 2);
  assert.equal(clamp(99, 2, 8), 8);
  assert.equal(clamp01(-1), 0);
  assert.equal(clamp01(0.45), 0.45);
  assert.equal(sanitizeRampMs(Number.NaN, 12), 12);
  assert.equal(sanitizeRampMs(-10), 0);
});

test("vectors preserve finite components and replace invalid components", () => {
  assert.deepEqual(sanitizeVec3([1, Number.NaN, Number.POSITIVE_INFINITY], [7, 8, 9]), [1, 8, 9]);
  assert.deepEqual(sanitizeVec3(undefined, [7, 8, 9]), [7, 8, 9]);
});

test("directions are normalized and zero vectors use the fallback", () => {
  const normalized = normalizeDirection([3, 0, 4], [0, 0, -1]);
  assert.ok(Math.abs(normalized[0] - 0.6) < 1e-9);
  assert.ok(Math.abs(normalized[2] - 0.8) < 1e-9);
  assert.deepEqual(normalizeDirection([0, 0, 0], [0, 1, 0]), [0, 1, 0]);
});

test("generated source identifiers are distinct", () => {
  const first = createId("sound");
  const second = createId("sound");
  assert.notEqual(first, second);
  assert.match(first, /^sound-/);
});

test("legacy Web Audio spatial setters are used when AudioParam fields are absent", () => {
  const calls = [];
  const context = { currentTime: 0 };
  const listener = {
    setPosition: (...values) => calls.push(["listener-position", ...values]),
    setOrientation: (...values) => calls.push(["listener-orientation", ...values]),
  };
  const panner = {
    setPosition: (...values) => calls.push(["panner-position", ...values]),
    setOrientation: (...values) => calls.push(["panner-orientation", ...values]),
  };

  setListenerPositionParams(listener, [1, 2, 3], context, 30);
  setListenerOrientationParams(listener, [0, 0, -1], [0, 1, 0], context, 30);
  setPositionParams(panner, [-4, 5, 6], context, 30);
  setOrientationParams(panner, [1, 0, 0], context, 30);

  assert.deepEqual(calls, [
    ["listener-position", 1, 2, 3],
    ["listener-orientation", 0, 0, -1, 0, 1, 0],
    ["panner-position", -4, 5, 6],
    ["panner-orientation", 1, 0, 0],
  ]);
});
