import assert from "node:assert/strict";
import test from "node:test";

import { Diagnostics } from "../packages/engine/dist/index.js";

test("diagnostics keep cumulative counts beyond the retained event ring", () => {
  const diagnostics = new Diagnostics(2);

  diagnostics.warning("voice.evicted", "first");
  diagnostics.warning("voice.evicted", "second");
  diagnostics.warning("voice.evicted", "third");
  diagnostics.info("benchmark.complete", "done");

  assert.equal(diagnostics.events.length, 2);
  assert.equal(diagnostics.warningCount, 3);
  assert.equal(diagnostics.infoCount, 1);
  assert.equal(diagnostics.errorCount, 0);
  assert.equal(diagnostics.count("voice.evicted"), 3);
  assert.equal(diagnostics.count("benchmark.complete"), 1);

  diagnostics.clear();

  assert.equal(diagnostics.events.length, 0);
  assert.equal(diagnostics.warningCount, 0);
  assert.equal(diagnostics.infoCount, 0);
  assert.equal(diagnostics.count("voice.evicted"), 0);
});
