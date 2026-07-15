export const ALL_ROOM_PRESETS = Object.freeze([
  "dry",
  "small-room",
  "large-room",
  "long-corridor",
  "basement",
  "metal-room",
  "metal-corridor",
  "cave",
  "street",
  "outdoors",
  "forest",
  "underwater",
]);

export const FEATURE_LEVELS = Object.freeze([
  {
    id: "1",
    title: "Файл и жизненный цикл",
    description: "Загрузка WAV, кэш, запуск, пауза, продолжение, скорость, громкость, stop и restart.",
  },
  {
    id: "2",
    title: "Направления и движение",
    description: "Слева, спереди, справа, сзади, несколько источников, плавная траектория и направленный конус.",
  },
  {
    id: "3",
    title: "Расстояние и качество",
    description: "Модели затухания, приближение и сравнение HRTF с equal-power.",
  },
  {
    id: "4",
    title: "Все помещения и реверберация",
    description: "Один и тот же звук последовательно проходит через все встроенные пресеты комнаты.",
  },
  {
    id: "5",
    title: "Заглушение и отражения",
    description: "Occlusion от 0 до 1, фильтрация прямого сигнала и изменение доли отражений.",
  },
  {
    id: "6",
    title: "Микшер, ducking и лимиты",
    description: "Категории, речь поверх музыки, неизменный danger-сигнал и вытеснение лишних голосов.",
  },
  {
    id: "7",
    title: "Пресеты, мастер и очистка",
    description: "Экспорт/импорт пользовательской комнаты, master volume, повторное использование кэша и stopAll.",
  },
  {
    id: "8",
    title: "Параллельная игровая сцена",
    description: "Движение, комнаты, occlusion, HRTF, ducking и несколько категорий работают одновременно.",
  },
]);

class TourStopped extends Error {
  constructor() {
    super("Feature tour stopped");
    this.name = "TourStopped";
  }
}

const positionsAroundListener = [
  [-4, 0, 0],
  [-3, 0, -3],
  [0, 0, -4],
  [3, 0, -3],
  [4, 0, 0],
  [3, 0, 3],
  [0, 0, 4],
  [-3, 0, 3],
];

export function createFeatureTour({
  requireEngine,
  announce,
  createSampleUrl,
  onProgress = () => undefined,
  refreshState = () => undefined,
}) {
  let generation = 0;
  let running = false;
  let lastSelection = "1";
  let activeEngine;
  const trackedSources = new Set();

  const assertCurrent = (token) => {
    if (token !== generation) throw new TourStopped();
  };

  const wait = async (milliseconds, token) => {
    await new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
    assertCurrent(token);
  };

  const track = (source) => {
    trackedSources.add(source);
    return source;
  };

  const disposeSource = async (source, fadeOutMs = 70) => {
    trackedSources.delete(source);
    try {
      await source.stop(fadeOutMs);
    } catch {
      // A one-shot source may already have ended. Disposal is still required.
    }
    source.dispose();
    refreshState();
  };

  const disposeAllTracked = async () => {
    const sources = [...trackedSources];
    trackedSources.clear();
    await Promise.allSettled(sources.map(async (source) => {
      try {
        await source.stop(50);
      } finally {
        source.dispose();
      }
    }));
    refreshState();
  };

  const progress = (level, step, total, message) => {
    onProgress({ running: true, level, step, total, message });
  };

  const playSample = async (audio, options = {}) => track(await audio.play(createSampleUrl(), {
    position: [0, 0, -3],
    category: "ui",
    priority: 60,
    roomAmount: 0.8,
    ...options,
  }));

  const level1 = async (audio, token) => {
    const level = FEATURE_LEVELS[0];
    progress(level, 1, 6, "Загрузка локального WAV и первый запуск.");
    const source = await playSample(audio, {
      autoStart: false,
      loop: true,
      fadeInMs: 100,
      position: [0, 0, -2],
    });
    await source.play();
    await wait(900, token);

    progress(level, 2, 6, "Пауза.");
    source.pause();
    await wait(500, token);

    progress(level, 3, 6, "Продолжение и замедление.");
    await source.play();
    source.setPlaybackRate(0.65, 120);
    await wait(900, token);

    progress(level, 4, 6, "Ускорение и плавное снижение громкости.");
    source.setPlaybackRate(1.55, 140);
    source.setVolume(0.32, 250);
    await wait(850, token);

    progress(level, 5, 6, "Плавный stop.");
    await source.stop(220);
    await wait(350, token);

    progress(level, 6, 6, "Restart того же независимого handle.");
    source.setPlaybackRate(1, 0);
    source.setVolume(0.75, 0);
    await source.restart();
    await wait(900, token);
    await disposeSource(source, 140);
  };

  const level2 = async (audio, token) => {
    const level = FEATURE_LEVELS[1];
    audio.setListenerPosition([0, 0, 0], 0);
    audio.setListenerOrientation([0, 0, -1], [0, 1, 0], 0);
    const directions = [
      ["слева", [-4, 0, 0]],
      ["спереди", [0, 0, -4]],
      ["справа", [4, 0, 0]],
      ["сзади", [0, 0, 4]],
    ];

    for (let index = 0; index < directions.length; index += 1) {
      const [label, position] = directions[index];
      progress(level, index + 1, 7, `Источник ${label}.`);
      const source = await playSample(audio, { position, roomAmount: 0.25 });
      await wait(1_050, token);
      await disposeSource(source, 20);
    }

    progress(level, 5, 7, "Четыре источника одновременно.");
    const parallel = await Promise.all(directions.map(([, position], index) => playSample(audio, {
      position,
      playbackRate: 0.8 + index * 0.12,
      volume: 0.28,
      category: index === 3 ? "danger" : "environment",
      priority: index === 3 ? 100 : 30,
    })));
    await wait(1_150, token);
    await Promise.all(parallel.map((source) => disposeSource(source, 60)));

    progress(level, 6, 7, "Плавный обход источника вокруг слушателя.");
    const moving = await playSample(audio, { loop: true, position: [-5, 0, 0], category: "mechanisms" });
    for (const position of [[0, 0, -5], [5, 0, 0], [0, 0, 5], [-5, 0, 0]]) {
      moving.moveTo(position, 720);
      await wait(800, token);
    }

    progress(level, 7, 7, "Направленный конус: от слушателя и к слушателю.");
    moving.setCone(35, 90, 0.05);
    moving.setPosition([0, 0, -3], 200);
    moving.setOrientation([0, 0, -1], 150);
    await wait(800, token);
    moving.setOrientation([0, 0, 1], 150);
    await wait(900, token);
    await disposeSource(moving, 140);
  };

  const level3 = async (audio, token) => {
    const level = FEATURE_LEVELS[2];
    const models = ["linear", "inverse", "exponential"];
    for (let index = 0; index < models.length; index += 1) {
      const model = models[index];
      progress(level, index + 1, 6, `Модель расстояния ${model}: источник приближается.`);
      const source = await playSample(audio, {
        loop: true,
        position: [0, 0, -14],
        distance: { model, refDistance: 1, maxDistance: 20, rolloffFactor: 1 },
        category: "mechanisms",
      });
      source.moveTo([0, 0, -1], 2_000);
      await wait(2_150, token);
      await disposeSource(source, 100);
    }

    progress(level, 4, 6, "HRTF: источник сзади.");
    audio.setQuality("hrtf");
    let source = await playSample(audio, { position: [0, 0, 4], roomAmount: 0.2 });
    await wait(1_100, token);
    await disposeSource(source, 30);

    progress(level, 5, 6, "Equal-power: тот же источник сзади.");
    audio.setQuality("equal-power");
    source = await playSample(audio, { position: [0, 0, 4], roomAmount: 0.2 });
    await wait(1_100, token);
    await disposeSource(source, 30);

    progress(level, 6, 6, "Возврат к HRTF.");
    audio.setQuality("hrtf");
    await wait(300, token);
  };

  const level4 = async (audio, token) => {
    const level = FEATURE_LEVELS[3];
    for (let index = 0; index < ALL_ROOM_PRESETS.length; index += 1) {
      const room = ALL_ROOM_PRESETS[index];
      progress(level, index + 1, ALL_ROOM_PRESETS.length, `Помещение ${room}.`);
      audio.setRoom(room, 180);
      await wait(240, token);
      const source = await playSample(audio, {
        position: [0, 0, -2.5],
        roomAmount: room === "dry" ? 0 : 1,
        volume: 0.72,
      });
      await wait(1_050, token);
      await disposeSource(source, 30);
    }
  };

  const level5 = async (audio, token) => {
    const level = FEATURE_LEVELS[4];
    audio.setRoom("cave", 180);
    const source = await playSample(audio, {
      loop: true,
      position: [0, 0, -3],
      roomAmount: 0.9,
      category: "environment",
    });
    const values = [0, 0.25, 0.5, 0.75, 1, 0];
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      progress(level, index + 1, values.length + 2, `Occlusion ${value}.`);
      source.setOcclusion(value, 240);
      await wait(1_050, token);
    }

    progress(level, 7, 8, "Только сухой тракт, без комнаты.");
    source.setRoomAmount(0, 250);
    await wait(950, token);
    progress(level, 8, 8, "Возврат отражений.");
    source.setRoomAmount(1, 250);
    await wait(950, token);
    await disposeSource(source, 160);
  };

  const level6 = async (audio, token) => {
    const level = FEATURE_LEVELS[5];
    audio.configureCategory("music", { volume: 0.8, priority: 15, maxVoices: 2 });
    audio.configureCategory("environment", { volume: 0.8, priority: 25, maxVoices: 3 });
    audio.configureCategory("speech", { volume: 1, priority: 90, maxVoices: 2 });
    audio.configureCategory("danger", { volume: 1, priority: 100, maxVoices: 4 });

    progress(level, 1, 5, "Музыка, окружение и danger одновременно.");
    const music = await playSample(audio, {
      loop: true,
      playbackRate: 0.52,
      volume: 0.35,
      position: [0, 0, -4],
      category: "music",
      priority: 10,
    });
    const environment = await playSample(audio, {
      loop: true,
      playbackRate: 0.78,
      volume: 0.25,
      position: [-3, 0, -2],
      category: "environment",
      priority: 20,
    });
    const danger = await playSample(audio, {
      loop: true,
      playbackRate: 1.7,
      volume: 0.35,
      position: [3, 0, -1],
      category: "danger",
      priority: 100,
      roomAmount: 0.25,
    });
    await wait(1_000, token);

    progress(level, 2, 5, "Speech запускает ducking музыки и окружения.");
    const speech = await playSample(audio, {
      playbackRate: 0.72,
      volume: 0.9,
      position: [0, 0, -1],
      category: "speech",
      priority: 90,
      roomAmount: 0.15,
    });
    await wait(1_200, token);
    await disposeSource(speech, 40);

    progress(level, 3, 5, "После речи музыка возвращается, danger не должен был исчезнуть.");
    await wait(850, token);

    progress(level, 4, 5, "Шесть environment-источников при лимите три: проверка voice stealing.");
    const overflow = await Promise.all(positionsAroundListener.slice(0, 6).map((position, index) => playSample(audio, {
      loop: true,
      position,
      playbackRate: 0.75 + index * 0.1,
      volume: 0.18,
      category: "environment",
      priority: 5 + index,
    })));
    await wait(1_500, token);

    progress(level, 5, 5, "Остановка категорий и очистка.");
    await Promise.all([music, environment, danger, ...overflow].map((source) => disposeSource(source, 120)));
    audio.configureCategory("environment", { maxVoices: 12 });
  };

  const level7 = async (audio, token) => {
    const level = FEATURE_LEVELS[6];
    progress(level, 1, 5, "Экспорт текущего room preset.");
    audio.setRoom("small-room", 100);
    const exported = JSON.parse(audio.room.exportPreset());
    await wait(250, token);

    progress(level, 2, 5, "Импорт изменённого пользовательского preset.");
    const custom = {
      ...exported,
      name: "tour-custom-room",
      wet: 0.78,
      decaySeconds: 1.65,
      preDelaySeconds: 0.035,
      highFrequencyAbsorption: 0.42,
      earlyReflections: 0.72,
      size: 0.66,
      toneHz: 5_600,
    };
    audio.room.importPreset(JSON.stringify(custom), 180);
    let source = await playSample(audio, { roomAmount: 1, position: [0, 0, -2] });
    await wait(1_150, token);
    await disposeSource(source, 50);

    progress(level, 3, 5, "Master volume уменьшается и возвращается.");
    source = await playSample(audio, { loop: true, volume: 0.75 });
    audio.setMasterVolume(0.25, 300);
    await wait(850, token);
    audio.setMasterVolume(1, 300);
    await wait(850, token);

    progress(level, 4, 5, "Два независимых handle используют один кэшированный WAV.");
    const second = await playSample(audio, { position: [3, 0, -2], playbackRate: 1.25 });
    await wait(1_050, token);

    progress(level, 5, 5, "stopAll, dispose и возврат к dry.");
    await audio.stopAll(120);
    await disposeSource(source, 0);
    await disposeSource(second, 0);
    audio.setRoom("dry", 120);
  };

  const level8 = async (audio, token) => {
    const level = FEATURE_LEVELS[7];
    audio.setQuality("hrtf");
    audio.setRoom("large-room", 150);
    progress(level, 1, 5, "Создание параллельной сцены.");

    const ambience = await playSample(audio, {
      loop: true,
      playbackRate: 0.58,
      volume: 0.25,
      position: [-5, 0, -3],
      category: "environment",
      priority: 20,
    });
    const mechanism = await playSample(audio, {
      loop: true,
      playbackRate: 0.92,
      volume: 0.35,
      position: [0, 0, -5],
      category: "mechanisms",
      priority: 45,
    });
    const danger = await playSample(audio, {
      loop: true,
      playbackRate: 1.75,
      volume: 0.32,
      position: [4, 0, 0],
      category: "danger",
      priority: 100,
      roomAmount: 0.2,
    });
    const ring = await Promise.all(positionsAroundListener.slice(0, 5).map((position, index) => playSample(audio, {
      loop: true,
      playbackRate: 0.68 + index * 0.09,
      volume: 0.13,
      position,
      category: "environment",
      priority: 15,
    })));

    const movePath = async () => {
      const path = [[0, 0, -5], [5, 0, 0], [0, 0, 5], [-5, 0, 0]];
      for (const position of path) {
        ambience.moveTo(position, 700);
        await wait(760, token);
      }
    };
    const occlusionSweep = async () => {
      for (const value of [0, 0.35, 0.75, 1, 0]) {
        mechanism.setOcclusion(value, 220);
        await wait(610, token);
      }
    };
    const roomSweep = async () => {
      for (const room of ["large-room", "metal-room", "cave", "forest"]) {
        audio.setRoom(room, 220);
        await wait(790, token);
      }
    };
    const qualitySweep = async () => {
      await wait(1_100, token);
      audio.setQuality("equal-power");
      await wait(950, token);
      audio.setQuality("hrtf");
    };
    const speechDucking = async () => {
      await wait(900, token);
      const speech = await playSample(audio, {
        playbackRate: 0.7,
        volume: 0.9,
        position: [0, 0, -1],
        category: "speech",
        priority: 90,
        roomAmount: 0.15,
      });
      await wait(1_050, token);
      await disposeSource(speech, 40);
    };

    progress(level, 2, 5, "Одновременно меняются движение, occlusion, room, quality и ducking.");
    await Promise.all([movePath(), occlusionSweep(), roomSweep(), qualitySweep(), speechDucking()]);
    assertCurrent(token);

    progress(level, 3, 5, "Перемещение listener API и возврат в исходную точку.");
    audio.setListenerPosition([1.5, 0, -1], 350);
    audio.setListenerOrientation([1, 0, -1], [0, 1, 0], 350);
    await wait(850, token);
    audio.setListenerPosition([0, 0, 0], 350);
    audio.setListenerOrientation([0, 0, -1], [0, 1, 0], 350);
    await wait(850, token);

    progress(level, 4, 5, "Параллельная сцена стабильна перед остановкой.");
    await wait(700, token);

    progress(level, 5, 5, "Аварийная остановка и полная очистка сцены.");
    await audio.stopAll(140);
    await Promise.all([ambience, mechanism, danger, ...ring].map((source) => disposeSource(source, 0)));
    audio.setRoom("dry", 120);
    audio.setQuality("hrtf");
  };

  const runners = new Map([
    ["1", level1],
    ["2", level2],
    ["3", level3],
    ["4", level4],
    ["5", level5],
    ["6", level6],
    ["7", level7],
    ["8", level8],
  ]);

  const stop = async (message = "Тестовый прогон остановлен.") => {
    generation += 1;
    running = false;
    await activeEngine?.stopAll(40).catch(() => undefined);
    await disposeAllTracked();
    onProgress({ running: false, level: undefined, step: 0, total: 0, message });
    announce(message);
  };

  const runSelection = async (selection) => {
    const selected = selection === "all" ? "all" : String(selection);
    if (running) await stop("Предыдущий прогон остановлен. Запускается новый.");
    const token = ++generation;
    running = true;
    lastSelection = selected;
    const ids = selected === "all" ? FEATURE_LEVELS.map((level) => level.id) : [selected];

    try {
      activeEngine = await requireEngine();
      assertCurrent(token);
      for (let index = 0; index < ids.length; index += 1) {
        assertCurrent(token);
        const id = ids[index];
        const level = FEATURE_LEVELS.find((item) => item.id === id);
        const runner = runners.get(id);
        if (!level || !runner) throw new Error(`Неизвестный уровень теста: ${id}`);
        announce(`Уровень ${level.id}: ${level.title}. ${level.description}`);
        onProgress({
          running: true,
          level,
          step: 0,
          total: 1,
          message: selected === "all"
            ? `Общий прогон: уровень ${index + 1} из ${ids.length}.`
            : "Уровень запущен.",
        });
        await runner(activeEngine, token);
        await disposeAllTracked();
        assertCurrent(token);
        announce(`Уровень ${level.id} завершён: ${level.title}.`);
        if (index < ids.length - 1) await wait(650, token);
      }

      running = false;
      onProgress({
        running: false,
        level: undefined,
        step: ids.length,
        total: ids.length,
        message: selected === "all" ? "Все восемь уровней завершены." : "Выбранный уровень завершён.",
      });
      announce(selected === "all" ? "Полная проверка всех уровней завершена." : "Проверка выбранного уровня завершена.");
    } catch (error) {
      await disposeAllTracked();
      running = false;
      if (error instanceof TourStopped) return;
      throw error;
    }
  };

  return {
    get isRunning() {
      return running;
    },
    get lastSelection() {
      return lastSelection;
    },
    run: runSelection,
    repeat: () => runSelection(lastSelection),
    stop,
  };
}
