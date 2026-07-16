# Implementation and release-readiness plan

Status legend:

- `[A]` implemented and automatically verified in authoritative CI;
- `[M]` implemented and manually confirmed by the user;
- `[P]` works partially or has a documented subjective limitation;
- `[E]` requires external hardware, account ownership, credentials, or a human listening decision;
- `[~]` implemented on the release-readiness branch and awaiting its final CI result;
- `[ ]` not implemented.

## Environment facts

- Node.js/TypeScript checks can run locally where dependencies are present.
- The autonomous release-readiness session had no local Rust toolchain and no external DNS, so Rust/WASM and browser authority remains GitHub Actions.
- The latest verified `main` before this work built real optimized WASM and passed automated smoke checks in Chromium, Firefox, and WebKit.
- Browser automation validates loading, lifecycle, controls, focus preservation, cleanup invariants, and Web Audio graph creation. It does not prove subjective acoustic quality.
- A user headphone session has now been recorded. Device, browser, and headphone model were not specified.

## Phase 0 — research and skeleton

- `[A]` Minimal hybrid Rust/WASM plus Web Audio stack selected and documented.
- `[A]` Workspace, agent guide, build scripts, ADRs, and demo skeleton created.
- `[A]` Rust/WASM crate and TypeScript façade contract aligned.
- `[A]` Generated WASM loaded and executed in Chromium, Firefox, and WebKit automation.

## Phase 1 — working vertical slice

- `[A]` One reusable `AudioContext`, bounded resume/recovery hooks, state reporting, and repeat initialization guard.
- `[A]` Buffer loading/cache, streaming path, play, pause, stop, restart, errors, and disposal.
- `[A]` Typed public API and browser lifecycle tests.
- `[M]` Real sound playback confirmed by the user in headphones.

## Phase 2 — spatial core

- `[A]` Listener and source position/orientation with modern AudioParam and legacy Web Audio compatibility paths.
- `[A]` HRTF/equal-power quality modes and native distance models.
- `[A]` Smooth movement, source cones, finite parameter guards, and reproducible direction scenarios.
- `[M]` Left/right localization and an obvious HRTF spatial effect manually confirmed.
- `[P]` Front/back separation is weak or uncertain for the user. Coordinates and browser HRTF routing are implemented, but subjective front/back quality is not guaranteed.
- `[~]` Dedicated dry front/back page with real Foley, equal distance/level, eight angles, repeat, ratings, and HRTF/equal-power A/B.
- `[E]` Repeat the focused front/back page on recorded browser/device/headphone combinations.

## Phase 3 — rooms and occlusion

- `[A]` Versioned built-in room presets and custom normalization.
- `[A]` Procedural impulse response, wet mix, pre-delay, tone filtering, and bounded impulse cache.
- `[A]` Smooth `0..1` occlusion affecting level, low-pass, and room send.
- `[M]` Room switching and audible reverb manually confirmed.
- `[E]` Subjective comparison across additional devices and headphones.

## Phase 4 — mixer and accessibility

- `[A]` Categories, volume, mute, priority, total/per-category limits.
- `[A]` Speech ducking and deterministic priority/distance-aware voice eviction.
- `[A]` Emergency stop and semantic keyboard listening lab.
- `[A]` Automated focus preservation, keyboard actions, status output, and console checks in three browser engines.
- `[M]` Multiple simultaneous sources and primary accessible controls manually confirmed.
- `[E]` Full physical iPhone/VoiceOver recovery checklist remains a user-hardware test.

## Phase 5 — resilience, diagnostics, and performance

- `[A]` One-shot node disconnection, explicit idempotent handle disposal, cached buffers, and no graph rebuild per frame.
- `[A]` Context recovery hooks, bounded resume attempts, runtime quality switching, and listener cleanup on close.
- `[~]` Immutable `getDiagnosticsSnapshot()` for handles, states, source kinds, ducking, category buses, cache, eviction totals, quality, room, and context state.
- `[~]` Accessible benchmark supports 1, 8, 16, 32, 64, 128, and custom safe counts.
- `[~]` Benchmark scenarios cover static equal-power/HRTF, moving HRTF, occlusion, room, categories, ducking, total/category limits, mass stop, dispose, repeat, and at least five cleanup cycles.
- `[~]` Benchmark exports JSON and text, reports real timing and supported Long Task/memory data, and writes `недоступно` when an API is absent.
- `[~]` CI smoke uses 8 and 16 sources for three cycles; a manual workflow runs five cycles for 8, 16, 32, 64, and 128.
- `[E]` Record representative physical iPhone benchmark results; CI timings are not substitutes for phone timings.

## Phase 6 — package readiness

- `[A]` Typed entry point, examples, architecture, limitations, and clean-build commands.
- `[A]` CI pipeline for Rust, WASM contract, TypeScript, and three browser engines.
- `[~]` Package metadata, ESM-only statement, repository/homepage/bugs/keywords, and public publish configuration.
- `[~]` `npm pack --dry-run`, real tarball creation, exact tarball-content checks, and exclusion of demo/test/source files.
- `[~]` Clean external consumer installation from tarball with no workspace or symlink resolution.
- `[~]` Consumer TypeScript check, direct browser ESM smoke, Vite production build, emitted `.wasm`, and installed-package browser runtime smoke.
- `[~]` Static WASM import replaces the previous Vite-ignored runtime URL so bundlers can discover the generated loader and binary.
- `[E]` Confirm ownership of package name and npm scope, authenticate, and authorize irreversible publication.

## Release 0.1.0

- `[~]` Documentation synchronized with real CC0 Foley plus synthetic control.
- `[~]` User manual results recorded without inventing device details.
- `[~]` Focused front/back limitation and test documented.
- `[~]` Benchmark, cleanup diagnostics, tarball consumer, and CI artifacts implemented.
- `[E]` Create tag and GitHub Release only after final CI succeeds.
- `[E]` Publish to npm only after scope/name ownership and authorization are explicitly confirmed.
