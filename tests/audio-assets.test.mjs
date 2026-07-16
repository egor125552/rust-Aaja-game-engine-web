import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const AUDIO_FILES = [
  "demo/assets/audio/door-close.wav",
  "demo/assets/audio/wood-footsteps-loop.wav",
];

function parseWav(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WAVE");
  assert.equal(buffer.toString("ascii", 12, 16), "fmt ");
  return {
    format: buffer.readUInt16LE(20),
    channels: buffer.readUInt16LE(22),
    sampleRate: buffer.readUInt32LE(24),
    bitsPerSample: buffer.readUInt16LE(34),
  };
}

test("real Foley references are iPhone-safe PCM WAV files", async () => {
  for (const path of AUDIO_FILES) {
    const info = await stat(path);
    assert.ok(info.size > 20_000, `${path} is unexpectedly small`);
    const wav = parseWav(await readFile(path));
    assert.deepEqual(wav, { format: 1, channels: 1, sampleRate: 48_000, bitsPerSample: 16 });
  }
});

test("listening lab exposes real sounds and copies assets to production", async () => {
  const html = await readFile("demo/index.html", "utf8");
  assert.match(html, /id="sample-source"/);
  assert.match(html, /value="steps" selected/);
  assert.match(html, /Реальное закрытие двери/);

  const copyScript = await readFile("scripts/copy-demo.mjs", "utf8");
  assert.match(copyScript, /demo\/assets/);
});

test("real-audio integration fragments are not duplicated", async () => {
  const main = await readFile("demo/src/main.js", "utf8");
  assert.equal((main.match(/from "\.\/sample-library\.js"/g) ?? []).length, 1);

  const tourUi = await readFile("demo/src/feature-tour-ui.js", "utf8");
  assert.equal((tourUi.match(/function updateSampleDescription/g) ?? []).length, 1);
  assert.equal((tourUi.match(/sampleSelect\.addEventListener/g) ?? []).length, 1);

  const copyScript = await readFile("scripts/copy-demo.mjs", "utf8");
  assert.equal((copyScript.match(/demo\/assets/g) ?? []).length, 2);
});
