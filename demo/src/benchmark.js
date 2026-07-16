import { AudioGameEngine } from "@aaja/audio-game-engine";

const SAMPLE_URL = "assets/audio/wood-footsteps-loop.wav";
const SAFE_MAX_SOURCES = 128;
const CATEGORIES = ["environment", "mechanisms", "footsteps", "ui", "music", "danger"];

const byId = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing benchmark element: ${id}`);
  return element;
};

const section = byId("benchmark-section");
const sourceCountSelect = byId("source-count");
const customCountInput = byId("custom-count");
const voiceLimitInput = byId("voice-limit");
const cyclesInput = byId("cycles");
const scenarioSelect = byId("scenario");
const progress = byId("progress");
const phase = byId("phase");
const status = byId("status");
const exportJsonButton = byId("export-json");
const exportTextButton = byId("export-text");
const runControls = [byId("enable"), byId("run-selected"), byId("run-smoke"), byId("run-matrix")];

let engine;
let engineVoiceLimit = 0;
let engineQueue = Promise.resolve();
let generation = 0;
let liveSources = [];
let movementTimer;
let lastReport;
let runInProgress = false;

const now = () => performance.now();
const round = (value) => Math.round(value * 100) / 100;
const clampInteger = (value, minimum, maximum, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
};

function requestedSourceCount() {
  if (sourceCountSelect.value === "custom") {
    return clampInteger(customCountInput.value, 1, SAFE_MAX_SOURCES, 8);
  }
  return clampInteger(sourceCountSelect.value, 1, SAFE_MAX_SOURCES, 8);
}

function requestedVoiceLimit() {
  return clampInteger(voiceLimitInput.value, 1, SAFE_MAX_SOURCES, SAFE_MAX_SOURCES);
}

function effectiveVoiceLimit(counts, scenario) {
  const requested = requestedVoiceLimit();
  if (scenario !== "total-limit") return requested;
  const smallestCount = Math.min(...counts);
  return Math.min(requested, Math.max(1, Math.floor(smallestCount / 2)));
}

function requestedCycles() {
  const minimum = scenarioSelect.value === "cleanup-cycles" ? 5 : 1;
  return clampInteger(cyclesInput.value, minimum, 10, Math.max(5, minimum));
}

const announce = (message) => {
  status.textContent = message;
};

const reportError = (error) => {
  console.error(error);
  section.setAttribute("aria-busy", "false");
  announce(`Ошибка benchmark: ${error instanceof Error ? error.message : String(error)}`);
};

function setRunControlsBusy(busy) {
  for (const control of runControls) {
    if (busy) control.setAttribute("aria-disabled", "true");
    else control.removeAttribute("aria-disabled");
  }
}

function scenarioConfiguration(scenario) {
  return {
    quality: scenario === "equal-static" ? "equal-power" : "hrtf",
    room: scenario === "hrtf-room" ? "large-room" : "dry",
    occlusion: scenario === "hrtf-occlusion" ? 0.72 : 0,
    moving: scenario === "hrtf-moving",
    multipleCategories: scenario === "categories",
    ducking: scenario === "ducking",
    categoryLimit: scenario === "category-limit",
  };
}

function ensureEngine(voiceLimit) {
  const operation = engineQueue.then(async () => {
    if (engine && engineVoiceLimit === voiceLimit) {
      await engine.resume();
      return engine;
    }
    await cleanupLiveSources(0);
    if (engine) await engine.close();
    engine = await AudioGameEngine.start({
      quality: "hrtf",
      maxVoices: voiceLimit,
      autoRecover: true,
      latencyHint: "interactive",
    });
    engineVoiceLimit = voiceLimit;
    engine.setListenerPosition([0, 0, 0], 0);
    engine.setListenerOrientation([0, 0, -1], [0, 1, 0], 0);
    byId("enable").textContent = "Возобновить звук";
    return engine;
  });
  engineQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

function sourceOptions(index, count, configuration) {
  const angle = index / Math.max(1, count) * Math.PI * 2;
  const radius = 3 + index % 5;
  let category = "environment";
  if (configuration.multipleCategories) category = CATEGORIES[index % CATEGORIES.length];
  if (configuration.ducking) category = index % 8 === 0 ? "speech" : index % 2 === 0 ? "music" : "environment";
  if (configuration.categoryLimit) category = "environment";
  return {
    autoStart: false,
    loop: true,
    position: [Math.sin(angle) * radius, 0, -Math.cos(angle) * radius],
    category,
    priority: category === "danger" ? 100 : category === "speech" ? 90 : 30 + index % 20,
    volume: Math.max(0.025, Math.min(0.22, 0.9 / Math.sqrt(Math.max(1, count)))),
    roomAmount: configuration.room === "dry" ? 0 : 0.65,
    occlusion: configuration.occlusion,
    distance: {
      model: "inverse",
      refDistance: 1,
      maxDistance: 100,
      rolloffFactor: 0.7,
    },
  };
}

function startMovement(sources, expectedGeneration) {
  let frame = 0;
  movementTimer = globalThis.setInterval(() => {
    if (generation !== expectedGeneration) return;
    frame += 1;
    sources.forEach((source, index) => {
      if (source.state !== "playing") return;
      const angle = frame * 0.08 + index / Math.max(1, sources.length) * Math.PI * 2;
      const radius = 3 + index % 5;
      source.setPosition([Math.sin(angle) * radius, 0, -Math.cos(angle) * radius], 90);
    });
  }, 100);
}

function stopMovement() {
  if (movementTimer !== undefined) globalThis.clearInterval(movementTimer);
  movementTimer = undefined;
}

async function cleanupLiveSources(fadeMs = 0) {
  stopMovement();
  const sources = liveSources;
  liveSources = [];
  if (engine) await engine.stopAll(fadeMs);
  for (const source of sources) {
    source.dispose();
    source.dispose();
  }
}

function startLongTaskObserver() {
  const supported = typeof PerformanceObserver !== "undefined"
    && PerformanceObserver.supportedEntryTypes?.includes("longtask");
  if (!supported) return { supported: false, entries: [], stop() {} };
  const entries = [];
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) entries.push(round(entry.duration));
  });
  try {
    observer.observe({ type: "longtask", buffered: false });
  } catch {
    observer.disconnect();
    return { supported: false, entries: [], stop() {} };
  }
  return {
    supported: true,
    entries,
    stop() { observer.disconnect(); },
  };
}

function memorySnapshot() {
  const memory = performance.memory;
  if (!memory || !Number.isFinite(memory.usedJSHeapSize)) return "недоступно";
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
  };
}

async function wait(milliseconds, expectedGeneration) {
  await new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
  return generation === expectedGeneration;
}

async function runCycle({
  count,
  cycle,
  cycleCount,
  scenario,
  voiceLimit,
  expectedGeneration,
  expectedEngine,
}) {
  const audio = await ensureEngine(voiceLimit);
  const sameEngine = audio === expectedEngine;
  const configuration = scenarioConfiguration(scenario);
  audio.setQuality(configuration.quality);
  audio.setRoom(configuration.room, 0);
  audio.room.setReverbAmount(configuration.room === "dry" ? 0 : 0.65, 0);
  audio.configureCategory("environment", {
    maxVoices: configuration.categoryLimit ? Math.min(4, voiceLimit) : Math.min(128, voiceLimit),
  });

  const voiceEvictionStart = audio.diagnostics.count("voice.evicted");
  const warningStart = audio.diagnostics.warningCount;
  const errorStart = audio.diagnostics.errorCount;
  const before = audio.getDiagnosticsSnapshot();
  const longTasks = startLongTaskObserver();
  const memoryBefore = memorySnapshot();
  phase.textContent = `Цикл ${cycle} из ${cycleCount}: создание ${count} источников.`;

  const createStarted = now();
  const created = await Promise.all(Array.from({ length: count }, (_, index) => (
    audio.play(SAMPLE_URL, sourceOptions(index, count, configuration))
  )));
  const createMs = round(now() - createStarted);
  liveSources = created;

  if (generation !== expectedGeneration) {
    await cleanupLiveSources(0);
    return null;
  }

  phase.textContent = `Цикл ${cycle} из ${cycleCount}: запуск ${created.length} источников.`;
  const startStarted = now();
  await Promise.all(created.map((source) => source.play()));
  const startMs = round(now() - startStarted);
  if (generation !== expectedGeneration) {
    await cleanupLiveSources(0);
    return null;
  }
  if (configuration.moving) startMovement(created, expectedGeneration);
  if (!await wait(500, expectedGeneration)) {
    await cleanupLiveSources(0);
    return null;
  }
  const during = audio.getDiagnosticsSnapshot();

  phase.textContent = `Цикл ${cycle} из ${cycleCount}: массовая остановка.`;
  const stopStarted = now();
  await audio.stopAll(scenario === "mass-stop" ? 0 : 20);
  const stopMs = round(now() - stopStarted);

  phase.textContent = `Цикл ${cycle} из ${cycleCount}: dispose и проверка очистки.`;
  const disposeStarted = now();
  stopMovement();
  for (const source of created) {
    source.dispose();
    source.dispose();
  }
  liveSources = [];
  const disposeMs = round(now() - disposeStarted);
  await Promise.resolve();
  const after = audio.getDiagnosticsSnapshot();
  const memoryAfter = memorySnapshot();
  longTasks.stop();

  const voiceEvictionEvents = audio.diagnostics.count("voice.evicted") - voiceEvictionStart;
  const warnings = audio.diagnostics.warningCount - warningStart;
  const errors = audio.diagnostics.errorCount - errorStart;
  const invariants = {
    playingIsZero: after.playing === 0,
    registeredHandlesIsZero: after.registeredHandles === 0,
    duckingIsZero: after.activeSpeechDuckingSessions === 0,
    noErrorSources: after.error === 0,
    contextReusedWithinRun: sameEngine,
    playingDidNotExceedLimit: during.playing <= voiceLimit,
  };

  return {
    cycle,
    requestedSources: count,
    createdObjects: created.length,
    peakPlaying: during.playing,
    voiceLimit,
    evicted: during.evictions - before.evictions,
    voiceEvictionEvents,
    cachedAssets: after.cachedAssets,
    timingsMs: { create: createMs, start: startMs, stop: stopMs, dispose: disposeMs },
    longTasks: longTasks.supported
      ? { count: longTasks.entries.length, durationsMs: [...longTasks.entries] }
      : "недоступно",
    memory: { before: memoryBefore, after: memoryAfter },
    warnings,
    errors,
    before,
    during,
    after,
    invariants,
    passedCleanup: Object.values(invariants).every(Boolean),
  };
}

function aggregateRun(count, scenario, voiceLimit, cycles) {
  const last = cycles.at(-1);
  const totals = cycles.reduce((result, cycle) => ({
    create: result.create + cycle.timingsMs.create,
    start: result.start + cycle.timingsMs.start,
    stop: result.stop + cycle.timingsMs.stop,
    dispose: result.dispose + cycle.timingsMs.dispose,
    evicted: result.evicted + cycle.evicted,
    voiceEvictionEvents: result.voiceEvictionEvents + cycle.voiceEvictionEvents,
    warnings: result.warnings + cycle.warnings,
    errors: result.errors + cycle.errors,
  }), { create: 0, start: 0, stop: 0, dispose: 0, evicted: 0, voiceEvictionEvents: 0, warnings: 0, errors: 0 });
  return {
    count,
    scenario,
    voiceLimit,
    cycleCount: cycles.length,
    cycles,
    peakPlaying: Math.max(0, ...cycles.map((cycle) => cycle.peakPlaying)),
    createdObjects: cycles.reduce((sum, cycle) => sum + cycle.createdObjects, 0),
    evicted: totals.evicted,
    voiceEvictionEvents: totals.voiceEvictionEvents,
    warnings: totals.warnings,
    errors: totals.errors,
    averageTimingsMs: {
      create: round(totals.create / cycles.length),
      start: round(totals.start / cycles.length),
      stop: round(totals.stop / cycles.length),
      dispose: round(totals.dispose / cycles.length),
    },
    cachedAssets: last?.cachedAssets ?? 0,
    remainingHandles: last?.after.registeredHandles ?? 0,
    remainingDucking: last?.after.activeSpeechDuckingSessions ?? 0,
    cleanupPassed: cycles.every((cycle) => cycle.passedCleanup),
  };
}

async function runCounts(counts, cycleCount, scenario) {
  if (runInProgress) {
    announce("Benchmark уже выполняется. Сначала останови текущий прогон.");
    return;
  }
  runInProgress = true;
  setRunControlsBusy(true);
  try {
    await cancelRun(false);
    const expectedGeneration = generation;
    const voiceLimit = effectiveVoiceLimit(counts, scenario);
    const audio = await ensureEngine(voiceLimit);
    const expectedEngine = audio;
    const runStarted = new Date().toISOString();
    const results = [];
    section.setAttribute("aria-busy", "true");
    progress.max = counts.length * cycleCount;
    progress.value = 0;
    announce(`Benchmark запущен: ${counts.join(", ")} источников, циклов на значение: ${cycleCount}, общий лимит: ${voiceLimit}.`);

    for (const count of counts) {
      const cycles = [];
      for (let cycle = 1; cycle <= cycleCount; cycle += 1) {
        if (generation !== expectedGeneration) return;
        const cycleResult = await runCycle({
          count,
          cycle,
          cycleCount,
          scenario,
          voiceLimit,
          expectedGeneration,
          expectedEngine,
        });
        if (!cycleResult) return;
        cycles.push(cycleResult);
        progress.value += 1;
      }
      results.push(aggregateRun(count, scenario, voiceLimit, cycles));
    }

    const snapshot = audio.getDiagnosticsSnapshot();
    lastReport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      startedAt: runStarted,
      browser: navigator.userAgent,
      userAgent: navigator.userAgent,
      platform: navigator.platform || "не указано",
      language: navigator.language || "не указано",
      sampleRate: snapshot.sampleRate,
      quality: scenarioConfiguration(scenario).quality,
      scenario,
      room: scenarioConfiguration(scenario).room,
      occlusion: scenarioConfiguration(scenario).occlusion,
      voiceLimit,
      requestedCounts: counts,
      results,
      finalSnapshot: snapshot,
      memoryApiAvailable: results.some((item) => item.cycles.some((cycle) => cycle.memory.before !== "недоступно")),
      longTaskApiAvailable: results.some((item) => item.cycles.some((cycle) => cycle.longTasks !== "недоступно")),
    };
    globalThis.__aajaBenchmarkLastReport = lastReport;
    renderReport(lastReport);
    exportJsonButton.disabled = false;
    exportTextButton.disabled = false;
    announce(`Benchmark завершён. Проверено значений: ${counts.length}. Очистка: ${results.every((item) => item.cleanupPassed) ? "успешно" : "есть нарушение"}.`);
  } finally {
    section.setAttribute("aria-busy", "false");
    await cleanupLiveSources(0);
    runInProgress = false;
    setRunControlsBusy(false);
  }
}

async function cancelRun(announceCancellation = true) {
  generation += 1;
  await cleanupLiveSources(0);
  if (engine) await engine.stopAll(0);
  section.setAttribute("aria-busy", "false");
  phase.textContent = "Benchmark остановлен, временные источники удалены.";
  if (announceCancellation) announce("Benchmark остановлен и очищен.");
}

function formatMilliseconds(value) {
  return Number.isFinite(value) ? `${value} мс` : "недоступно";
}

function reportAsText(report) {
  const lines = [
    "Aaja Audio Engine benchmark",
    `Создан: ${report.generatedAt}`,
    `Браузер: ${report.browser}`,
    `Sample rate: ${report.sampleRate} Гц`,
    `Сценарий: ${report.scenario}`,
    `Качество: ${report.quality}`,
    `Помещение: ${report.room}`,
    `Окклюзия: ${report.occlusion}`,
    `Общий voice limit: ${report.voiceLimit}`,
    `Long Task API: ${report.longTaskApiAvailable ? "доступно" : "недоступно"}`,
    `Memory API: ${report.memoryApiAvailable ? "доступно" : "недоступно"}`,
    "",
  ];
  for (const item of report.results) {
    lines.push(
      `Источники: ${item.count}`,
      `Циклов: ${item.cycleCount}`,
      `Создано объектов суммарно: ${item.createdObjects}`,
      `Максимально играло: ${item.peakPlaying}`,
      `Вытеснено: ${item.evicted}`,
      `События voice.evicted: ${item.voiceEvictionEvents}`,
      `Среднее создание: ${formatMilliseconds(item.averageTimingsMs.create)}`,
      `Средний запуск: ${formatMilliseconds(item.averageTimingsMs.start)}`,
      `Средняя остановка: ${formatMilliseconds(item.averageTimingsMs.stop)}`,
      `Средняя очистка: ${formatMilliseconds(item.averageTimingsMs.dispose)}`,
      `Ошибки: ${item.errors}`,
      `Предупреждения: ${item.warnings}`,
      `Handles после очистки: ${item.remainingHandles}`,
      `Ducking после очистки: ${item.remainingDucking}`,
      `Очистка: ${item.cleanupPassed ? "пройдена" : "не пройдена"}`,
      "",
    );
  }
  return lines.join("\n");
}

function renderReport(report) {
  const item = report.results.at(-1);
  if (!item) return;
  const lastCycle = item.cycles.at(-1);
  byId("requested").textContent = String(item.count);
  byId("created").textContent = String(item.createdObjects);
  byId("playing").textContent = String(item.peakPlaying);
  byId("limit").textContent = String(item.voiceLimit);
  byId("evicted").textContent = String(item.evicted);
  byId("eviction-events").textContent = String(item.voiceEvictionEvents);
  byId("cached").textContent = String(item.cachedAssets);
  byId("create-time").textContent = formatMilliseconds(item.averageTimingsMs.create);
  byId("start-time").textContent = formatMilliseconds(item.averageTimingsMs.start);
  byId("stop-time").textContent = formatMilliseconds(item.averageTimingsMs.stop);
  byId("dispose-time").textContent = formatMilliseconds(item.averageTimingsMs.dispose);
  byId("long-tasks").textContent = lastCycle?.longTasks === "недоступно"
    ? "недоступно"
    : `${lastCycle?.longTasks.count ?? 0}`;
  byId("memory").textContent = report.memoryApiAvailable ? "доступна в JSON" : "недоступно";
  byId("errors").textContent = String(item.errors);
  byId("warnings").textContent = String(item.warnings);
  byId("remaining").textContent = String(item.remainingHandles);
  byId("ducking-remaining").textContent = String(item.remainingDucking);
  byId("invariants").textContent = item.cleanupPassed
    ? "Проверка очистки пройдена: playing 0, handles 0, ducking 0, повторные dispose безопасны."
    : "Проверка очистки обнаружила нарушение. Подробности находятся в JSON по каждому циклу.";
  byId("report-text").textContent = reportAsText(report);
}

function download(name, type, content) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
}

byId("enable").addEventListener("click", () => {
  if (runInProgress) {
    announce("Benchmark уже выполняется. Кнопка включения не меняет движок до завершения прогона.");
    return;
  }
  const requestGeneration = generation;
  void ensureEngine(requestedVoiceLimit())
    .then(() => {
      if (generation === requestGeneration && !runInProgress) {
        announce("Звук включён. Нагрузочный стенд готов.");
      }
    })
    .catch(reportError);
});

sourceCountSelect.addEventListener("change", () => {
  customCountInput.disabled = sourceCountSelect.value !== "custom";
});

byId("run-selected").addEventListener("click", () => {
  void runCounts([requestedSourceCount()], requestedCycles(), scenarioSelect.value).catch(reportError);
});
byId("run-smoke").addEventListener("click", () => {
  void runCounts([8, 16], 3, scenarioSelect.value).catch(reportError);
});
byId("run-matrix").addEventListener("click", () => {
  void runCounts([8, 16, 32, 64, 128], requestedCycles(), scenarioSelect.value).catch(reportError);
});
byId("cancel").addEventListener("click", () => void cancelRun().catch(reportError));

exportJsonButton.addEventListener("click", () => {
  if (lastReport) download("aaja-benchmark.json", "application/json", JSON.stringify(lastReport, null, 2));
});
exportTextButton.addEventListener("click", () => {
  if (lastReport) download("aaja-benchmark.txt", "text/plain;charset=utf-8", reportAsText(lastReport));
});

window.addEventListener("pagehide", () => {
  generation += 1;
  stopMovement();
  for (const source of liveSources) source.dispose();
  liveSources = [];
  void engine?.close();
});
