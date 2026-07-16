from __future__ import annotations

import json
from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    count = text.count(old)
    if count == 0 and new in text:
        return
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "demo/src/feature-tour-ui.js",
    'import { createTestEarconUrl, revokeTestEarconUrl } from "./test-earcon.js";\n',
    'import {\n'
    '  getSelectedSampleLabel,\n'
    '  getSelectedSampleSummary,\n'
    '  getSelectedSampleUrl,\n'
    '  releaseSampleLibrary,\n'
    '} from "./sample-library.js";\n',
)
replace_once(
    "demo/src/feature-tour-ui.js",
    'const section = byId("feature-tour");\nlet engine;\n',
    'const section = byId("feature-tour");\n'
    'const sampleSelect = byId("sample-source");\n'
    'const sampleDescription = byId("sample-description");\n'
    'let engine;\n',
)
replace_once(
    "demo/src/feature-tour-ui.js",
    "  createSampleUrl: createTestEarconUrl,\n",
    "  createSampleUrl: getSelectedSampleUrl,\n",
)
replace_once(
    "demo/src/feature-tour-ui.js",
    'levelSelect.addEventListener("change", updateDescription);\n',
    'function updateSampleDescription() {\n'
    '  sampleDescription.textContent = getSelectedSampleSummary();\n'
    '}\n\n'
    'sampleSelect.addEventListener("change", () => {\n'
    '  updateSampleDescription();\n'
    '  announce(`Тестовый звук изменён: ${getSelectedSampleLabel()}.`);\n'
    '});\n'
    'levelSelect.addEventListener("change", updateDescription);\n',
)
replace_once(
    "demo/src/feature-tour-ui.js",
    'window.addEventListener("beforeunload", revokeTestEarconUrl);\nupdateDescription();\n',
    'window.addEventListener("beforeunload", releaseSampleLibrary);\n'
    'updateSampleDescription();\n'
    'updateDescription();\n',
)

replace_once(
    "demo/src/main.js",
    'import { AudioGameEngine } from "@aaja/audio-game-engine";\n',
    'import { AudioGameEngine } from "@aaja/audio-game-engine";\n'
    'import { getSelectedSampleLabel, getSelectedSampleUrl, releaseSampleLibrary } from "./sample-library.js";\n',
)
replace_once(
    "demo/src/main.js",
    '''  const source = await audio.playTone({
    frequency: directionNotes[name],
    durationMs: 520,
    type: "sine",
    position: directionPosition(name, 4),
    category: "danger",
    priority: 100,
    occlusion: occlusionValues[occlusionIndex],
    roomAmount: 0.65,
  });
  disposeLater(source, 800);
  if (shouldAnnounce) announce(`Короткий источник ${directionLabels[name]}.`);
''',
    '''  const source = await audio.play(getSelectedSampleUrl(), {
    position: directionPosition(name, 4),
    category: "danger",
    priority: 100,
    occlusion: occlusionValues[occlusionIndex],
    roomAmount: 0.65,
    volume: 0.9,
  });
  disposeLater(source, 1_900);
  if (shouldAnnounce) announce(`Источник ${directionLabels[name]}: ${getSelectedSampleLabel()}.`);
''',
)
replace_once(
    "demo/src/main.js",
    "    await delay(720);\n",
    "    await delay(1_750);\n",
)
replace_once(
    "demo/src/main.js",
    '''  const source = await audio.playTone({
    frequency: 340,
    durationMs: 900,
    type: "triangle",
    position: directionPosition("front", 12),
    loop: true,
    volume: 0.7,
    category: "mechanisms",
    occlusion: occlusionValues[occlusionIndex],
  });
''',
    '''  const source = await audio.play(getSelectedSampleUrl(), {
    position: directionPosition("front", 12),
    loop: true,
    volume: 0.75,
    category: "mechanisms",
    occlusion: occlusionValues[occlusionIndex],
    roomAmount: 0.55,
  });
''',
)
replace_once(
    "demo/src/main.js",
    '''  const source = await audio.play(createWavUrl(), {
    position: directionPosition("right", 3),
    category: "ui",
    priority: 80,
    roomAmount: 0.25,
  });
  disposeLater(source, 1_000);
  announce("WAV-файл загружен через fetch, декодирован браузером и воспроизведён справа.");
''',
    '''  const source = await audio.play(getSelectedSampleUrl(), {
    position: directionPosition("right", 3),
    category: "ui",
    priority: 80,
    roomAmount: 0.25,
  });
  disposeLater(source, 2_000);
  announce(`Файл «${getSelectedSampleLabel()}» загружен, декодирован браузером и воспроизведён справа.`);
''',
)
replace_once(
    "demo/src/main.js",
    '''window.addEventListener("beforeunload", () => {
  if (generatedWavUrl) URL.revokeObjectURL(generatedWavUrl);
  void engine?.close();
});
''',
    '''window.addEventListener("beforeunload", () => {
  if (generatedWavUrl) URL.revokeObjectURL(generatedWavUrl);
  releaseSampleLibrary();
  void engine?.close();
});
''',
)

replace_once(
    "demo/index.html",
    '''      <p>
        Выбери отдельный уровень или полный прогон. Каждый уровень использует один и тот же
        локально сгенерированный WAV-earcon, поэтому различия создаёт именно движок, а не разные записи.
        Рецепт звука основан на принципах открытого набора BeepBank-500, где аудио опубликовано как CC0.
      </p>
      <p>
        <label for="tour-level">Уровень проверки</label>
''',
    '''      <p>
        Выбери реальную запись, затем отдельный уровень или полный прогон. По умолчанию используются
        деревянные шаги. Закрытие двери особенно удобно для проверки реверберации, расстояния и заглушения.
        Синтетический сигнал оставлен только как контрольный эталон.
      </p>
      <p>
        <label for="sample-source">Тестовый звук</label>
        <select id="sample-source">
          <option value="steps" selected>Реальные деревянные шаги</option>
          <option value="door">Реальное закрытие двери</option>
          <option value="synthetic">Синтетический контрольный сигнал</option>
        </select>
      </p>
      <p id="sample-description">Выбраны реальные деревянные шаги.</p>
      <p>
        <label for="tour-level">Уровень проверки</label>
''',
)

replace_once(
    "scripts/copy-demo.mjs",
    'await cp("demo/src", "demo/dist/src", { recursive: true });\n',
    'await cp("demo/src", "demo/dist/src", { recursive: true });\n'
    'await cp("demo/assets", "demo/dist/assets", { recursive: true });\n',
)

package_path = Path("package.json")
package = json.loads(package_path.read_text(encoding="utf-8"))
syntax = package["scripts"]["test:syntax"]
needle = "node --check demo/src/test-earcon.js"
addition = "node --check demo/src/sample-library.js"
if addition not in syntax:
    if needle not in syntax:
        raise SystemExit("package.json: test:syntax anchor not found")
    package["scripts"]["test:syntax"] = syntax.replace(needle, f"{needle} && {addition}")
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

Path("docs/audio-assets.md").write_text(
    """# Real-world audio assets

The listening lab uses two real Foley references from Kenney:

- **RPG Audio**: `doorClose_2.ogg`, converted to `demo/assets/audio/door-close.wav`.
- **Impact Sounds**: `footstep_wood_000.ogg`, converted and repeated with silence as `demo/assets/audio/wood-footsteps-loop.wav`.

Both source packs are published under Creative Commons CC0 1.0. Copies of the pack license files are stored next to the WAV derivatives.

The browser files are PCM16, mono, 48 kHz WAV. Processing is limited to decoding, mono conversion, resampling, and insertion of silence between unmodified footstep events. The synthetic earcon remains available only as a diagnostic control.

Source pages:

- https://kenney.nl/assets/rpg-audio
- https://kenney.nl/assets/impact-sounds
- https://creativecommons.org/publicdomain/zero/1.0/
""",
    encoding="utf-8",
)

Path("tests/audio-assets.test.mjs").write_text(
    '''import assert from "node:assert/strict";
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
''',
    encoding="utf-8",
)

for temporary in [
    ".github/workflows/inspect-kenney-audio.yml",
    ".github/workflows/materialize-real-audio.yml",
    "docs/audio-materialization-trigger.md",
]:
    Path(temporary).unlink(missing_ok=True)

print("Real-audio listening lab finalized.")
