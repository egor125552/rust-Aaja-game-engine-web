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

- One reusable `AudioContext` with bounded resume and recovery hooks.
- Cached short effects and optional media-element streaming.
- Independent replayable source handles with play, pause, stop, restart, fades, playback rate, and idempotent disposal.
- 3D source/listener coordinates, orientation, HRTF and equal-power modes, smooth movement, source cones, and browser-native distance models.
- Versioned rooms, generated impulse responses, custom preset import/export, and smooth occlusion.
- Category mixer, total/per-category limits, deterministic priority/distance-aware voice eviction, and speech ducking that leaves danger cues untouched.
- Immutable `getDiagnosticsSnapshot()` data for registered handles, source states, cache, ducking, category buses, eviction totals, quality, room, and context state.
- Keyboard and screen-reader accessible listening tools with no canvas-only controls.

## Listening tools

The main listening tour contains eight scripted levels. It can use three selectable references:

- a real CC0 wooden-footstep loop for movement, distance, and sustained scenes;
- a real CC0 door-close transient for direction, room, reverb, and occlusion comparisons;
- a locally generated synthetic earcon as a repeatable diagnostic control.

The production demo also contains two separate tools:

- `front-back.html`: a dry, zero-occlusion test using the same real door transient at equal distance and level, with front/rear repetition, eight angles, HRTF/equal-power A/B, immediate repeat, and subjective result buttons;
- `benchmark.html`: an accessible benchmark for 1, 8, 16, 32, 64, 128, or a safe custom source count, including movement, rooms, occlusion, categories, ducking, voice limits, repeated cleanup cycles, and JSON/text export.

Automation verifies the real WASM module, source lifecycle, controls, focus preservation, cleanup invariants, and browser console state. It does not prove that front/back HRTF, reverb character, or occlusion sound convincing to every listener.

A user headphone check has confirmed playback, strong left/right spatial effect, audible rooms/reverb, simultaneous sources, and accessible primary controls. Front/back separation was weak or uncertain. Device, browser, and headphone model were not recorded; see `docs/manual-tests/user-listening-results-2026-07-16.md`.

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
npm run test:package
npm run test:consumer-browser
npm run serve
```

Then open `http://127.0.0.1:4173`. Browser autoplay rules require a user action before audio can start.

`npm run test:package` creates a real tarball, checks its file list, installs it outside the workspace, runs strict TypeScript, and performs a Vite production build. `npm run test:consumer-browser` executes that installed package in direct browser ESM and in the Vite output, including WASM initialization, HRTF, room, occlusion, `stopAll`, dispose, and close.

The package name is currently `@aaja/audio-game-engine`, but npm scope ownership has not been confirmed. The repository prepares release `0.1.0`; it must not publish until the package name, scope, authorization, and irreversible publish action are confirmed.

See `AGENTS.md`, `PLAN.md`, `docs/api.md`, `docs/architecture.md`, `docs/benchmark.md`, and `docs/manual-tests/` for exact behavior and checks.
