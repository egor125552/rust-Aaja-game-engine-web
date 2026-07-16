import { AudioGameEngine } from "@aaja/audio-game-engine";
import { getSelectedSampleLabel, getSelectedSampleUrl, releaseSampleLibrary } from "./sample-library.js";

const byId = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing demo element: ${id}`);
  return element;
};

const status = byId("status");
const enableButton = byId("enable");
const beaconButton = byId("beacon");
const rooms = [
  "dry",
  "small-room",
  "large-room",
  "long-corridor",
  "metal-corridor",
  "cave",
  "forest",
  "outdoors",
  "underwater",
];
const occlusionValues = [0, 0.25, 0.5, 0.75, 1];
const distanceValues = [2, 5, 10, 20];
const directionNotes = { left: 520, front: 620, right: 720, rear: 420 };
const directionLabels = { left: "слева", front: "спереди", right: "справа", rear: "сзади" };

let engine;
let beacon;
let roomIndex = 0;
let occlusionIndex = 0;
let distanceIndex = 1;
let quality = "hrtf";
let generatedWavUrl;
const listener = { x: 0, z: 0, yaw: 0 };

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function announce(message) {
  status.textContent = message;
  refreshState();
}

function reportError(error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(error);
  announce(`Ошибка: ${message}`);
}

function run(action) {
  void action().catch(reportError);
}

function refreshState() {
  byId("room-value").textContent = rooms[roomIndex];
  byId("occlusion-value").textContent = String(occlusionValues[occlusionIndex]);
  byId("quality-value").textContent = quality === "hrtf" ? "HRTF" : "облегчённый equal-power";
  byId("distance-value").textContent = `${distanceValues[distanceIndex]} метров`;
  byId("listener-value").textContent = `x ${listener.x}, z ${listener.z}, поворот ${listener.yaw} градусов`;
  if (!engine) return;
  byId("core-version").textContent = engine.coreVersion;
  byId("context-state").textContent = engine.state;
  byId("active-value").textContent = String(engine.activeSourceCount);
  byId("cache-value").textContent = String(engine.cachedAssetCount);
}

function forwardVector() {
  const radians = listener.yaw * Math.PI / 180;
  return [Math.sin(radians), 0, -Math.cos(radians)];
}

function worldPosition(localX, localZ) {
  const radians = listener.yaw * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [
    listener.x + localX * cosine - localZ * sine,
    0,
    listener.z + localX * sine + localZ * cosine,
  ];
}

function directionPosition(name, distance = distanceValues[distanceIndex]) {
  if (name === "left") return worldPosition(-distance, 0);
  if (name === "right") return worldPosition(distance, 0);
  if (name === "rear") return worldPosition(0, distance);
  return worldPosition(0, -distance);
}

function applyListener() {
  if (!engine) return;
  engine.setListenerPosition([listener.x, 0, listener.z]);
  engine.setListenerOrientation(forwardVector(), [0, 1, 0]);
}

async function start() {
  if (!engine) {
    engine = await AudioGameEngine.start({ quality, maxVoices: 24, autoRecover: true });
    engine.addEventListener("sourcestart", refreshState);
    engine.addEventListener("sourcestop", refreshState);
    engine.addEventListener("statechange", refreshState);
    engine.diagnostics.addEventListener("diagnostic", (event) => {
      if (event.detail?.level === "error") console.error(event.detail.message, event.detail.details);
    });
    applyListener();
    engine.setRoom(rooms[roomIndex]);
  } else {
    await engine.resume();
  }

  enableButton.textContent = "Возобновить звук";
  refreshState();
  announce(
    engine.state === "running"
      ? "Звук включён. Можно запускать слуховые сценарии."
      : "Движок создан, но браузер пока держит звук на паузе. Нажми кнопку ещё раз.",
  );
}

async function requireEngine() {
  if (!engine) await start();
  await engine.resume();
  return engine;
}

function disposeLater(source, milliseconds) {
  setTimeout(() => source.dispose(), milliseconds);
}

async function playDirection(name, shouldAnnounce = true) {
  const audio = await requireEngine();
  const source = await audio.play(getSelectedSampleUrl(), {
    position: directionPosition(name, 4),
    category: "danger",
    priority: 100,
    occlusion: occlusionValues[occlusionIndex],
    roomAmount: 0.65,
    volume: 0.9,
  });
  disposeLater(source, 1_900);
  if (shouldAnnounce) announce(`Источник ${directionLabels[name]}: ${getSelectedSampleLabel()}.`);
}

async function playDirectionSequence() {
  await requireEngine();
  announce("Проверка направлений: слева, спереди, справа, сзади.");
  for (const name of ["left", "front", "right", "rear"]) {
    await playDirection(name, false);
    await delay(1_750);
  }
  announce("Последовательность направлений завершена. Спереди и сзади должны различаться в HRTF-режиме.");
}

async function playApproach() {
  const audio = await requireEngine();
  const source = await audio.play(getSelectedSampleUrl(), {
    position: directionPosition("front", 12),
    loop: true,
    volume: 0.75,
    category: "mechanisms",
    occlusion: occlusionValues[occlusionIndex],
    roomAmount: 0.55,
  });
  source.moveTo(directionPosition("front", 1), 4_000);
  announce("Источник плавно приближается спереди с двенадцати метров до одного.");
  setTimeout(() => {
    void source.stop(120).finally(() => source.dispose());
    refreshState();
  }, 4_250);
}

async function toggleBeacon() {
  const audio = await requireEngine();
  if (beacon) {
    await beacon.stop(100);
    beacon.dispose();
    beacon = undefined;
    beaconButton.textContent = "Запустить маяк — B";
    announce("Маяк остановлен.");
    return;
  }

  beacon = await audio.playTone({
    frequency: 760,
    durationMs: 700,
    type: "sine",
    position: directionPosition("front"),
    loop: true,
    volume: 0.55,
    category: "environment",
    priority: 55,
    occlusion: occlusionValues[occlusionIndex],
    roomAmount: 0.85,
  });
  beaconButton.textContent = "Остановить маяк — B";
  announce(`Маяк запущен спереди на расстоянии ${distanceValues[distanceIndex]} метров.`);
}

async function changeBeaconDistance() {
  await requireEngine();
  distanceIndex = (distanceIndex + 1) % distanceValues.length;
  beacon?.setPosition(directionPosition("front"), 250);
  announce(`Дальность маяка: ${distanceValues[distanceIndex]} метров.`);
}

async function playManySources() {
  const audio = await requireEngine();
  announce("Проверка нескольких источников вокруг слушателя.");
  const positions = [
    [-4, 0], [-3, -3], [0, -4], [3, -3], [4, 0], [0, 4],
  ];
  const sources = await Promise.all(positions.map(([x, z], index) => audio.playTone({
    frequency: 300 + index * 85,
    durationMs: 1_100,
    type: index % 2 === 0 ? "sine" : "triangle",
    position: worldPosition(x, z),
    volume: 0.28,
    category: index === 5 ? "danger" : "environment",
    priority: index === 5 ? 100 : 25,
    roomAmount: 0.55,
  })));
  for (const source of sources) disposeLater(source, 1_400);
}

function createWavUrl() {
  if (generatedWavUrl) return generatedWavUrl;
  const sampleRate = 22_050;
  const duration = 0.65;
  const sampleCount = Math.floor(sampleRate * duration);
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
    const envelope = Math.sin(Math.PI * progress) ** 2;
    const sample = Math.sin(Math.PI * 2 * 680 * time) * envelope * 0.55;
    view.setInt16(44 + index * 2, Math.round(sample * 32_767), true);
  }

  generatedWavUrl = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
  return generatedWavUrl;
}

async function playLoadedFile() {
  const audio = await requireEngine();
  const source = await audio.play(getSelectedSampleUrl(), {
    position: directionPosition("right", 3),
    category: "ui",
    priority: 80,
    roomAmount: 0.25,
  });
  disposeLater(source, 2_000);
  announce(`Файл «${getSelectedSampleLabel()}» загружен, декодирован браузером и воспроизведён справа.`);
}

async function changeRoom() {
  const audio = await requireEngine();
  roomIndex = (roomIndex + 1) % rooms.length;
  audio.setRoom(rooms[roomIndex]);
  announce(`Помещение: ${rooms[roomIndex]}. Переключение выполнено плавным кроссфейдом.`);
}

async function changeOcclusion() {
  await requireEngine();
  occlusionIndex = (occlusionIndex + 1) % occlusionValues.length;
  const value = occlusionValues[occlusionIndex];
  beacon?.setOcclusion(value, 180);
  announce(`Заглушение: ${value}. Меняются громкость прямого сигнала, фильтр и отражения.`);
}

async function changeQuality() {
  const audio = await requireEngine();
  quality = quality === "hrtf" ? "equal-power" : "hrtf";
  audio.setQuality(quality);
  announce(
    quality === "hrtf"
      ? "Включён HRTF-режим пространственного звука."
      : "Включён облегчённый equal-power режим: HRTF отключён, а реверберация сокращена.",
  );
}

async function playDuckingScenario() {
  const audio = await requireEngine();
  const music = await audio.playTone({
    frequency: 220,
    durationMs: 850,
    type: "triangle",
    loop: true,
    volume: 0.38,
    category: "music",
    position: directionPosition("front", 3),
  });
  const danger = await audio.playTone({
    frequency: 900,
    durationMs: 420,
    type: "sine",
    loop: true,
    volume: 0.22,
    category: "danger",
    priority: 100,
    position: directionPosition("right", 2),
  });
  await delay(500);
  const speech = await audio.playTone({
    frequency: 510,
    durationMs: 1_150,
    type: "sine",
    volume: 0.75,
    category: "speech",
    priority: 90,
    position: directionPosition("front", 1),
  });
  announce("Ducking: музыка и окружение стали тише на время речи, сигнал опасности справа остаётся слышимым.");
  disposeLater(speech, 1_400);
  setTimeout(() => {
    void Promise.all([music.stop(160), danger.stop(160)]).finally(() => {
      music.dispose();
      danger.dispose();
      refreshState();
    });
  }, 1_800);
}

async function moveListener(step) {
  await requireEngine();
  const [forwardX, , forwardZ] = forwardVector();
  listener.x = Math.round((listener.x + forwardX * step) * 10) / 10;
  listener.z = Math.round((listener.z + forwardZ * step) * 10) / 10;
  applyListener();
  announce(`Слушатель перемещён: x ${listener.x}, z ${listener.z}.`);
}

async function turnListener(degrees) {
  await requireEngine();
  listener.yaw = (listener.yaw + degrees + 360) % 360;
  applyListener();
  beacon?.setPosition(directionPosition("front"), 200);
  announce(`Поворот слушателя: ${listener.yaw} градусов.`);
}

async function emergencyStop() {
  if (!engine) {
    announce("Движок ещё не запущен, останавливать нечего.");
    return;
  }
  await engine.stopAll(20);
  if (beacon) {
    beacon.dispose();
    beacon = undefined;
    beaconButton.textContent = "Запустить маяк — B";
  }
  announce("Все звуки аварийно остановлены.");
}

enableButton.addEventListener("click", () => run(start));
for (const button of document.querySelectorAll("[data-direction]")) {
  button.addEventListener("click", () => run(() => playDirection(button.dataset.direction)));
}
byId("sequence").addEventListener("click", () => run(playDirectionSequence));
byId("approach").addEventListener("click", () => run(playApproach));
beaconButton.addEventListener("click", () => run(toggleBeacon));
byId("distance").addEventListener("click", () => run(changeBeaconDistance));
byId("many").addEventListener("click", () => run(playManySources));
byId("loaded-file").addEventListener("click", () => run(playLoadedFile));
byId("listener-forward").addEventListener("click", () => run(() => moveListener(1)));
byId("listener-back").addEventListener("click", () => run(() => moveListener(-1)));
byId("turn-left").addEventListener("click", () => run(() => turnListener(-45)));
byId("turn-right").addEventListener("click", () => run(() => turnListener(45)));
byId("room").addEventListener("click", () => run(changeRoom));
byId("occlusion").addEventListener("click", () => run(changeOcclusion));
byId("quality").addEventListener("click", () => run(changeQuality));
byId("ducking").addEventListener("click", () => run(playDuckingScenario));
byId("stop").addEventListener("click", () => run(emergencyStop));

document.addEventListener("keydown", (event) => {
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const shortcuts = {
    "1": () => playDirection("left"),
    "2": () => playDirection("front"),
    "3": () => playDirection("right"),
    "4": () => playDirection("rear"),
    r: playDirectionSequence,
    a: playApproach,
    b: toggleBeacon,
    c: changeRoom,
    o: changeOcclusion,
    h: changeQuality,
    d: playDuckingScenario,
    m: playManySources,
    l: playLoadedFile,
    w: () => moveListener(1),
    s: () => moveListener(-1),
    q: () => turnListener(-45),
    e: () => turnListener(45),
    Escape: emergencyStop,
  };
  const action = shortcuts[key];
  if (!action) return;
  event.preventDefault();
  run(action);
});

window.addEventListener("unhandledrejection", (event) => reportError(event.reason));
window.addEventListener("error", (event) => reportError(event.error ?? event.message));
window.addEventListener("beforeunload", () => {
  if (generatedWavUrl) URL.revokeObjectURL(generatedWavUrl);
  releaseSampleLibrary();
  void engine?.close();
});

refreshState();
