import { AudioGameEngine } from "@aaja/audio-game-engine";
import { FEATURE_LEVELS, createFeatureTour } from "./feature-tour.js";
import {
  getSelectedSampleLabel,
  getSelectedSampleSummary,
  getSelectedSampleUrl,
  releaseSampleLibrary,
} from "./sample-library.js";

const byId = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing feature-tour element: ${id}`);
  return element;
};

const status = byId("status");
const levelSelect = byId("tour-level");
const description = byId("tour-description");
const progressElement = byId("tour-progress");
const stepText = byId("tour-step");
const section = byId("feature-tour");
const sampleSelect = byId("sample-source");
const sampleDescription = byId("sample-description");
let engine;

const categoryDefaults = Object.freeze({
  ui: { volume: 1, muted: false, priority: 80, maxVoices: 8 },
  speech: { volume: 1, muted: false, priority: 90, maxVoices: 4 },
  music: { volume: 0.8, muted: false, priority: 20, maxVoices: 2 },
  environment: { volume: 0.85, muted: false, priority: 30, maxVoices: 12 },
  footsteps: { volume: 1, muted: false, priority: 55, maxVoices: 8 },
  mechanisms: { volume: 0.9, muted: false, priority: 50, maxVoices: 10 },
  danger: { volume: 1, muted: false, priority: 100, maxVoices: 8 },
});

function refreshSharedState() {
  if (!engine) return;
  byId("core-version").textContent = engine.coreVersion;
  byId("context-state").textContent = engine.state;
  byId("active-value").textContent = String(engine.activeSourceCount);
  byId("cache-value").textContent = String(engine.cachedAssetCount);
  byId("room-value").textContent = engine.room.preset.name;
  byId("quality-value").textContent = engine.quality === "hrtf" ? "HRTF" : "облегчённый equal-power";
}

function announce(message) {
  status.textContent = message;
  refreshSharedState();
}

async function requireEngine() {
  const next = await AudioGameEngine.start({ quality: "hrtf", maxVoices: 24, autoRecover: true });
  if (engine !== next) {
    engine?.removeEventListener("sourcestart", refreshSharedState);
    engine?.removeEventListener("sourcestop", refreshSharedState);
    engine?.removeEventListener("statechange", refreshSharedState);
    engine = next;
    engine.addEventListener("sourcestart", refreshSharedState);
    engine.addEventListener("sourcestop", refreshSharedState);
    engine.addEventListener("statechange", refreshSharedState);
  }
  refreshSharedState();
  return engine;
}

function updateDescription() {
  if (levelSelect.value === "all") {
    description.textContent = "Полный прогон последовательно запускает все восемь уровней.";
    return;
  }
  const level = FEATURE_LEVELS.find((item) => item.id === levelSelect.value);
  description.textContent = level
    ? `Уровень ${level.id}: ${level.title}. ${level.description}`
    : "Выбери уровень проверки.";
}

function updateProgress({ running, level, step, total, message }) {
  section.setAttribute("aria-busy", String(running));
  progressElement.max = Math.max(1, total || 1);
  progressElement.value = Math.min(progressElement.max, Math.max(0, step || 0));
  stepText.textContent = level
    ? `Уровень ${level.id}, ${level.title}. Шаг ${step} из ${total}. ${message}`
    : message;
  refreshSharedState();
}

const tour = createFeatureTour({
  requireEngine,
  announce,
  createSampleUrl: getSelectedSampleUrl,
  onProgress: updateProgress,
  refreshState: refreshSharedState,
});

const run = (action) => void action().catch((error) => {
  console.error(error);
  announce(`Ошибка сценария: ${error instanceof Error ? error.message : String(error)}`);
});

function restoreBaseline() {
  if (!engine) return;
  engine.setMasterVolume(1, 80);
  engine.setQuality("hrtf");
  engine.setRoom("dry", 100);
  engine.setListenerPosition([0, 0, 0], 100);
  engine.setListenerOrientation([0, 0, -1], [0, 1, 0], 100);
  for (const [category, options] of Object.entries(categoryDefaults)) {
    engine.configureCategory(category, options);
  }
  refreshSharedState();
}

async function runSelected() {
  try {
    await tour.run(levelSelect.value);
  } finally {
    restoreBaseline();
  }
}

async function repeatLast() {
  try {
    await tour.repeat();
  } finally {
    restoreBaseline();
  }
}

async function runAll() {
  levelSelect.value = "all";
  updateDescription();
  try {
    await tour.run("all");
  } finally {
    restoreBaseline();
  }
}

async function stopTour(message) {
  try {
    await tour.stop(message);
  } finally {
    restoreBaseline();
  }
}

function updateSampleDescription() {
  sampleDescription.textContent = getSelectedSampleSummary();
}

sampleSelect.addEventListener("change", () => {
  updateSampleDescription();
  announce(`Тестовый звук изменён: ${getSelectedSampleLabel()}.`);
});
function updateSampleDescription() {
  sampleDescription.textContent = getSelectedSampleSummary();
}

sampleSelect.addEventListener("change", () => {
  updateSampleDescription();
  announce(`Тестовый звук изменён: ${getSelectedSampleLabel()}.`);
});
levelSelect.addEventListener("change", updateDescription);
byId("tour-run").addEventListener("click", () => run(runSelected));
byId("tour-repeat").addEventListener("click", () => run(repeatLast));
byId("tour-all").addEventListener("click", () => run(runAll));
byId("tour-stop").addEventListener("click", () => run(() => stopTour()));
byId("stop").addEventListener("click", () => run(() => stopTour("Все звуки аварийно остановлены.")));

document.addEventListener("keydown", (event) => {
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
  const target = event.target;
  const isFormControl = target instanceof HTMLElement
    && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
  if (isFormControl && event.key !== "Escape") return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const actions = {
    t: runSelected,
    p: repeatLast,
    g: runAll,
    x: () => stopTour(),
    Escape: () => stopTour("Все звуки аварийно остановлены."),
  };
  const action = actions[key];
  if (!action) return;
  event.preventDefault();
  run(action);
});

window.addEventListener("beforeunload", releaseSampleLibrary);
updateSampleDescription();
updateDescription();
