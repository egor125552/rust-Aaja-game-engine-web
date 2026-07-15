# Aaja Audio Engine

An accessible browser audio engine for audio games. The public API is TypeScript; deterministic scene state, parameter validation, room presets, distance math, and voice eviction live in a Rust core compiled to WebAssembly. Browser-native Web Audio nodes perform playback, HRTF spatialization, filtering, mixing, and convolution.

```ts
import { AudioGameEngine } from "@aaja/audio-game-engine";

const audio = await AudioGameEngine.start();
audio.setRoom("cave");

const beacon = await audio.play("/sounds/beacon.mp3", {
  position: [4, 0, -8],
  loop: true,
  category: "danger",
  priority: 100,
});

beacon.setOcclusion(0.6);
beacon.moveTo([0, 0, -2], 1_500);
```

## Implemented in v0.1

- One reusable `AudioContext` with resume/recovery hooks.
- Cached short effects and optional media-element streaming.
- Independent replayable source handles with play, pause, stop, restart, fades, playback rate, and disposal.
- 3D source/listener coordinates, orientation, HRTF and equal-power modes, smooth movement, and browser-native distance models.
- Versioned rooms, generated impulse responses, custom preset import/export, and smooth occlusion.
- Category mixer, per-category limits, deterministic priority/distance-aware voice eviction, and speech ducking that leaves danger cues untouched.
- Keyboard and screen-reader accessible listening lab with no canvas-only controls.

## Prerequisites

- Node.js 20 or newer.
- Current stable Rust with target `wasm32-unknown-unknown`.
- `wasm-pack`.

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --locked
npm install
```

## Build and test

```bash
npm run build
npm run check
npm run test:wasm
npx playwright install chromium firefox webkit
npm run test:e2e
npm run serve
```

Then open `http://127.0.0.1:4173` and activate **Enable or resume audio** once. Browser autoplay rules require this user action.

See `AGENTS.md`, `docs/api.md`, `docs/architecture.md`, and `docs/manual-tests/` for exact behavior and checks.
