import { createTestEarconUrl, revokeTestEarconUrl } from "./test-earcon.js";

const SOUND_URLS = Object.freeze({
  steps: "assets/audio/wood-footsteps-loop.wav",
  door: "assets/audio/door-close.wav",
});

const SOUND_LABELS = Object.freeze({
  steps: "реальные деревянные шаги",
  door: "реальное закрытие двери",
  synthetic: "синтетический контрольный сигнал",
});

function selectedMode() {
  const element = document.getElementById("sample-source");
  return element instanceof HTMLSelectElement ? element.value : "steps";
}

export function getSelectedSampleUrl() {
  const mode = selectedMode();
  if (mode === "synthetic") return createTestEarconUrl();
  return SOUND_URLS[mode] ?? SOUND_URLS.steps;
}

export function getSelectedSampleLabel() {
  return SOUND_LABELS[selectedMode()] ?? SOUND_LABELS.steps;
}

export function getSelectedSampleSummary() {
  const mode = selectedMode();
  if (mode === "door") {
    return "Короткое реальное закрытие двери: лучше всего слышны реверберация, расстояние, occlusion и направление одного импульса.";
  }
  if (mode === "synthetic") {
    return "Синтетический сигнал оставлен как контрольный эталон для чистого сравнения математики движка.";
  }
  return "Реальные деревянные шаги с естественными паузами: основной звук для движения, расстояния, направлений и длительных тестов.";
}

export function releaseSampleLibrary() {
  revokeTestEarconUrl();
}
