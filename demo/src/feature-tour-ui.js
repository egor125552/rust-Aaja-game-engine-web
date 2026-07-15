import { AudioGameEngine } from "@aaja/audio-game-engine";
import { FEATURE_LEVELS, createFeatureTour } from "./feature-tour.js";
import { createTestEarconUrl, revokeTestEarconUrl } from "./test-earcon.js";

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
let engine;

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
  engine = await AudioGameEngine.start({ quality: "hrtf", maxVoices: 24, autoRecover: true });
  engine.addEventListener("sourcestart", refreshSharedState);
  engine.addEventListener("sourcestop", refreshSharedState);
  engine.addEventListener("statechange", refreshSharedState);
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
  createSampleUrl: createTestEarconUrl,
  onProgress: updateProgress,
  refreshState: refreshSharedState,
});

const run = (action) => void action().catch((error) => {
  console.error(error);
  announce(`Ошибка сценария: ${error instanceof Error ? error.message : String(error)}`);
});

async function runSelected() {
  await tour.run(levelSelect.value);
}

async function runAll() {
  levelSelect.value = "all";
  updateDescription();
  await tour.run("all");
}

levelSelect.addEventListener("change", updateDescription);
byId("tour-run").addEventListener("click", () => run(runSelected));
byId("tour-repeat").addEventListener("click", () => run(tour.repeat));
byId("tour-all").addEventListener("click", () => run(runAll));
byId("tour-stop").addEventListener("click", () => run(() => tour.stop()));

document.addEventListener("keydown", (event) => {
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
  const target = event.target;
  const isFormControl = target instanceof HTMLElement
    && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
  if (isFormControl && event.key !== "Escape") return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const actions = {
    t: runSelected,
    p: tour.repeat,
    g: runAll,
    x: () => tour.stop(),
    Escape: () => tour.stop("Сценарный прогон остановлен аварийной клавишей."),
  };
  const action = actions[key];
  if (!action) return;
  event.preventDefault();
  run(action);
});

window.addEventListener("beforeunload", revokeTestEarconUrl);
updateDescription();
