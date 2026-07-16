import { AudioGameEngine } from "@aaja/audio-game-engine";

const DOOR_URL = "assets/audio/door-close.wav";
const DISTANCE = 4;
const STEP_DELAY_MS = 1_300;
const ANGLES = [0, 30, 90, 150, 180, 210, 270, 330];

const byId = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing front/back element: ${id}`);
  return element;
};

const enableButton = byId("enable");
const qualitySelect = byId("quality");
const repeatButton = byId("repeat");
const status = byId("status");
const step = byId("step");
const result = byId("result");

let engine;
let generation = 0;
let lastRun;
let lastRunName = "";
const liveSources = new Set();

const announce = (message) => {
  status.textContent = message;
  refreshState();
};

const reportError = (error) => {
  console.error(error);
  announce(`Ошибка: ${error instanceof Error ? error.message : String(error)}`);
};

const delay = (milliseconds, expectedGeneration) => new Promise((resolve) => {
  globalThis.setTimeout(() => resolve(generation === expectedGeneration), milliseconds);
});

const positionForAngle = (degrees) => {
  const radians = degrees * Math.PI / 180;
  return [Math.sin(radians) * DISTANCE, 0, -Math.cos(radians) * DISTANCE];
};

function refreshState() {
  byId("quality-state").textContent = qualitySelect.value === "hrtf" ? "HRTF" : "equal-power";
  if (!engine) return;
  const snapshot = engine.getDiagnosticsSnapshot();
  byId("context-state").textContent = snapshot.contextState;
  byId("room-state").textContent = snapshot.roomPreset;
  byId("active-state").textContent = String(snapshot.playing);
  byId("handles-state").textContent = String(snapshot.registeredHandles);
}

async function requireEngine() {
  if (!engine) {
    engine = await AudioGameEngine.start({
      quality: qualitySelect.value,
      maxVoices: 8,
      autoRecover: true,
    });
    engine.setListenerPosition([0, 0, 0], 0);
    engine.setListenerOrientation([0, 0, -1], [0, 1, 0], 0);
    engine.setRoom("dry", 0);
    engine.room.setReverbAmount(0, 0);
    engine.addEventListener("sourcestart", refreshState);
    engine.addEventListener("sourcestop", refreshState);
    engine.addEventListener("statechange", refreshState);
  } else {
    await engine.resume();
  }
  engine.setQuality(qualitySelect.value);
  engine.setRoom("dry", 0);
  engine.room.setReverbAmount(0, 0);
  enableButton.textContent = "Возобновить звук";
  refreshState();
  return engine;
}

async function disposeLiveSources(fadeMs = 0) {
  const sources = [...liveSources];
  liveSources.clear();
  await Promise.allSettled(sources.map((source) => source.stop(fadeMs)));
  for (const source of sources) source.dispose();
  refreshState();
}

async function stopTest(announceStop = true) {
  generation += 1;
  await disposeLiveSources(0);
  if (engine) await engine.stopAll(0);
  step.textContent = "Тест остановлен.";
  if (announceStop) announce("Тест остановлен и временные источники удалены.");
}

async function playAngle(degrees, label, expectedGeneration) {
  if (generation !== expectedGeneration) return false;
  const audio = await requireEngine();
  const source = await audio.play(DOOR_URL, {
    position: positionForAngle(degrees),
    category: "danger",
    priority: 100,
    volume: 0.9,
    roomAmount: 0,
    occlusion: 0,
    distance: {
      model: "inverse",
      refDistance: 1,
      maxDistance: 100,
      rolloffFactor: 1,
    },
  });
  liveSources.add(source);
  step.textContent = `${label}. Угол ${degrees} градусов, расстояние ${DISTANCE} метра.`;
  const shouldContinue = await delay(STEP_DELAY_MS, expectedGeneration);
  liveSources.delete(source);
  source.dispose();
  refreshState();
  return shouldContinue;
}

async function execute(name, runner) {
  await stopTest(false);
  const expectedGeneration = generation;
  lastRun = runner;
  lastRunName = name;
  repeatButton.disabled = false;
  result.textContent = "Последняя последовательность ещё не оценена.";
  announce(`Начинается тест: ${name}. Фокус остаётся на использованной кнопке.`);
  try {
    await runner(expectedGeneration);
    if (generation === expectedGeneration) {
      step.textContent = `Последовательность «${name}» завершена.`;
      announce(`Тест «${name}» завершён. Отметь, насколько уверенно различались направления.`);
    }
  } finally {
    await disposeLiveSources(0);
  }
}

async function runFrontBack(expectedGeneration) {
  const sequence = [
    [0, "Спереди"],
    [180, "Сзади"],
    [0, "Спереди"],
    [180, "Сзади"],
  ];
  for (const [angle, label] of sequence) {
    if (!await playAngle(angle, label, expectedGeneration)) return;
  }
}

async function runCircle(expectedGeneration) {
  for (const angle of ANGLES) {
    if (!await playAngle(angle, `Источник на угле ${angle}`, expectedGeneration)) return;
  }
}

async function runQualityComparison(expectedGeneration) {
  const original = qualitySelect.value;
  try {
    for (const quality of ["hrtf", "equal-power"]) {
      qualitySelect.value = quality;
      const audio = await requireEngine();
      audio.setQuality(quality);
      byId("settings-summary").textContent = quality === "hrtf"
        ? "Сухая сцена, HRTF, 4 метра, одинаковая громкость."
        : "Сухая сцена, equal-power, 4 метра, одинаковая громкость.";
      announce(`${quality === "hrtf" ? "HRTF" : "Equal-power"}: сейчас прозвучат спереди и сзади.`);
      if (!await playAngle(0, `${quality}: спереди`, expectedGeneration)) return;
      if (!await playAngle(180, `${quality}: сзади`, expectedGeneration)) return;
    }
  } finally {
    qualitySelect.value = original;
    if (engine) engine.setQuality(original);
    byId("settings-summary").textContent = original === "hrtf"
      ? "Сухая сцена, HRTF, 4 метра, одинаковая громкость."
      : "Сухая сцена, equal-power, 4 метра, одинаковая громкость.";
    refreshState();
  }
}

enableButton.addEventListener("click", () => {
  void requireEngine()
    .then(() => announce("Звук включён. Можно запускать чистые последовательности."))
    .catch(reportError);
});

qualitySelect.addEventListener("change", () => {
  const quality = qualitySelect.value;
  byId("settings-summary").textContent = quality === "hrtf"
    ? "Сухая сцена, HRTF, 4 метра, одинаковая громкость."
    : "Сухая сцена, equal-power, 4 метра, одинаковая громкость.";
  if (engine) engine.setQuality(quality);
  announce(quality === "hrtf" ? "Выбран HRTF." : "Выбран equal-power для контрольного сравнения.");
});

byId("run-front-back").addEventListener("click", () => {
  void execute("спереди, сзади, спереди, сзади", runFrontBack).catch(reportError);
});
byId("run-circle").addEventListener("click", () => {
  void execute("круг из восьми углов", runCircle).catch(reportError);
});
byId("run-ab").addEventListener("click", () => {
  void execute("сравнение HRTF и equal-power", runQualityComparison).catch(reportError);
});
repeatButton.addEventListener("click", () => {
  if (lastRun) void execute(lastRunName, lastRun).catch(reportError);
});
byId("stop").addEventListener("click", () => void stopTest().catch(reportError));

document.querySelectorAll("[data-rating]").forEach((button) => {
  button.addEventListener("click", () => {
    const rating = button.getAttribute("data-rating") ?? "не указано";
    result.textContent = `Последний тест: ${lastRunName || "не запускался"}. Оценка: ${rating}.`;
    announce(`Оценка сохранена в текущем сеансе: ${rating}.`);
  });
});

window.addEventListener("pagehide", () => {
  generation += 1;
  for (const source of liveSources) source.dispose();
  liveSources.clear();
  void engine?.close();
});

refreshState();
