# Public API

## Start or resume

```ts
const audio = await AudioGameEngine.start({
  quality: "hrtf",
  maxVoices: 32,
  masterVolume: 0.9,
});
```

Repeated `start()` calls return the same open engine and attempt to resume its context. Call `close()` only when the whole game is finished.

## Play a cached short effect

```ts
const source = await audio.play("/audio/beacon.mp3", {
  position: [4, 0, -8],
  loop: true,
  category: "danger",
  priority: 100,
  fadeInMs: 80,
});

source.setPosition([2, 0, -4]);
source.moveTo([0, 0, -1], 1_500);
source.setOcclusion(0.7);
source.pause();
await source.play();
await source.restart();
await source.stop(100);
source.dispose();
```

Short files are fetched, decoded, and cached once. Multiple handles can independently replay the same `AudioBuffer`.

## Stream a long recording

```ts
const music = await audio.play("/audio/long-score.mp3", {
  stream: true,
  loop: true,
  category: "music",
});
```

Streaming uses an `HTMLAudioElement`; the server must allow cross-origin media use when the URL is on another origin.

## Listener and quality

```ts
audio.setListenerPosition([0, 0, 0]);
audio.setListenerOrientation([0, 0, -1], [0, 1, 0]);
audio.setQuality("equal-power");
```

The default listener faces negative `Z`. Standard browser HRTF does not guarantee confident front/back perception for every listener or device.

## Rooms

```ts
audio.setRoom("metal-corridor");
audio.room.setReverbAmount(0.7);
const json = audio.room.exportPreset();
audio.room.importPreset(json);
```

Preset JSON is versioned with `schemaVersion: 1`. Unknown future versions fail explicitly.

## Categories and ducking

```ts
audio.configureCategory("environment", {
  volume: 0.8,
  priority: 30,
  maxVoices: 12,
});
```

Starting a source in `speech` automatically ducks `music` and `environment`. `danger` is not ducked. When a limit is exceeded, Rust chooses the lowest-priority, least-audible, oldest eligible active source deterministically.

## Development diagnostics

```ts
const snapshot = audio.getDiagnosticsSnapshot();
console.log(snapshot.registeredHandles, snapshot.playing, snapshot.evictions);
console.log(audio.diagnostics.count("voice.evicted"));
```

The snapshot is a frozen copy. It contains only primitive values:

- context state, sample rate, quality, room preset, and total voice limit;
- registered handles and loading/playing/paused/stopped/error counts;
- buffer and streaming handle counts;
- active speech ducking sessions and category bus count;
- cached asset count and cumulative evictions;
- cumulative info, warning, and error diagnostic counts.

`audio.diagnostics.events` is a bounded recent-event window for detailed inspection. `infoCount`, `warningCount`, `errorCount`, and `count(code)` are cumulative and therefore remain exact when older detailed events leave that window. `audio.diagnostics.clear()` resets both the retained window and all cumulative counters.

The snapshot does not expose mutable `AudioNode`, `AudioBuffer`, media element, timer, or Rust objects. A decoded cache entry can remain after every source handle has been disposed; that is intentional reuse, not an active-source leak.

## Cleanup

`stop()` makes a handle reusable. `dispose()` permanently removes its Rust state, listeners, media element, and audio nodes, and is safe to call repeatedly. Use `audio.stopAll()` as an emergency stop and `audio.close()` to destroy the whole engine and remove recovery listeners.
