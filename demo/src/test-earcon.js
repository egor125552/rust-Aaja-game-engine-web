// Deterministic mono PCM earcon generated locally so the listening lab never
// depends on a remote server. The parameter recipe is inspired by the CC0
// BeepBank-500 corpus: short FM/chord earcons, controlled envelopes, 48 kHz WAV.

let objectUrl;

const clampSample = (value) => Math.max(-1, Math.min(1, value));

export function createTestEarconBytes() {
  const sampleRate = 48_000;
  const durationSeconds = 0.92;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const bytes = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(bytes);

  const writeText = (offset, text) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, sampleCount * 2, true);

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const progress = index / sampleCount;
    const attack = Math.min(1, progress / 0.045);
    const release = Math.min(1, (1 - progress) / 0.18);
    const envelope = Math.sin(Math.PI * Math.min(1, attack)) ** 2
      * Math.sin(Math.PI * 0.5 * Math.max(0, release)) ** 2;

    const baseFrequency = 390 + progress * 90;
    const modulation = Math.sin(Math.PI * 2 * 5.5 * time) * 24;
    const fundamental = Math.sin(Math.PI * 2 * (baseFrequency + modulation) * time);
    const majorThird = Math.sin(Math.PI * 2 * baseFrequency * 1.25 * time) * 0.42;
    const fifth = Math.sin(Math.PI * 2 * baseFrequency * 1.5 * time) * 0.28;
    const pulse = 0.76 + Math.sin(Math.PI * 2 * 8 * time) * 0.24;
    const sample = clampSample((fundamental + majorThird + fifth) * envelope * pulse * 0.34);
    view.setInt16(44 + index * 2, Math.round(sample * 32_767), true);
  }

  return bytes;
}

export function createTestEarconUrl() {
  if (objectUrl) return objectUrl;
  objectUrl = URL.createObjectURL(new Blob([createTestEarconBytes()], { type: "audio/wav" }));
  return objectUrl;
}

export function revokeTestEarconUrl() {
  if (!objectUrl) return;
  URL.revokeObjectURL(objectUrl);
  objectUrl = undefined;
}
