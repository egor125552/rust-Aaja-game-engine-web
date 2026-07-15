import test from "node:test";
import assert from "node:assert/strict";

 test("the public module can be imported without creating an AudioContext", async () => {
  const module = await import("../packages/engine/dist/index.js");
  assert.equal(typeof module.AudioGameEngine, "function");
});
