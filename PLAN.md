# Implementation plan

Status legend: `[x]` implemented and verified in the available environment, `[~]` implemented but awaiting the named external check, `[ ]` not started.

## Environment facts

- Node.js/TypeScript checks ran locally.
- The local container had no Rust toolchain and external DNS blocked installation, so authoritative Rust/WASM checks ran in GitHub Actions.
- GitHub Actions built the real optimized WASM package and completed automated smoke checks in Chromium, Firefox, and WebKit.
- Headless browser checks validate loading, lifecycle, controls, focus preservation, console cleanliness, and Web Audio graph creation; they do not prove subjective acoustic quality.
- A physical iPhone, VoiceOver, and headphone listening session were not available; precise manual scripts are included.

## Phase 0 — research and skeleton

- [x] Minimal hybrid stack selected and documented.
- [x] Workspace, agent guide, build scripts, ADRs, and demo skeleton created.
- [x] Rust/WASM crate and TypeScript façade contract aligned.
- [x] Generated WASM loaded and executed in Chromium, Firefox, and WebKit automation.

## Phase 1 — working vertical slice

- [x] One reusable `AudioContext`, bounded resume/recovery hooks, state reporting, and repeat initialization guard.
- [x] Buffer loading/cache, streaming path, play, pause, stop, restart, errors, and disposal implemented.
- [x] Simple typed public API implemented and TypeScript-checked.
- [x] Browser automation created sources, exercised controls, repeated lifecycle operations, and loaded the real generated WASM.

## Phase 2 — spatial core

- [x] Listener and source position/orientation implemented with modern AudioParam and legacy Web Audio compatibility paths.
- [x] HRTF/equal-power quality modes and native distance models implemented.
- [x] Smooth movement and finite parameter guards implemented.
- [x] Reproducible direction and approach scenarios created.
- [~] Subjective front/rear and movement quality — headphone listening check pending.

## Phase 3 — rooms and occlusion

- [x] Versioned built-in room presets and custom normalization implemented.
- [x] Procedural impulse response, wet mix, pre-delay, and tone filtering implemented.
- [x] Smooth `0..1` occlusion affecting level, low-pass, and room send implemented.
- [~] Subjective acoustic quality — headphone listening check pending.

## Phase 4 — mixer and accessibility

- [x] Categories, volume, mute, priority, total/per-category limits implemented.
- [x] Speech ducking and deterministic priority/distance-aware voice eviction implemented.
- [x] Emergency stop and semantic keyboard listening lab implemented.
- [x] Automated focus preservation, keyboard actions, status output, and console checks passed in three browser engines.
- [~] Physical VoiceOver check — user-hardware script supplied.

## Phase 5 — resilience and performance

- [x] One-shot node disconnection, explicit handle disposal, cached buffers, and no graph rebuild per frame.
- [x] Context recovery hooks, bounded resume attempts, and runtime quality switching.
- [x] Size-oriented release profile, bulk-memory-compatible `wasm-opt`, and CI artifact checks.
- [x] Chromium, Firefox, and WebKit smoke checks passed.
- [~] Real iPhone background/lock recovery — user hardware pending.
- [ ] Profile real scenes with dozens of concurrent sources and record CPU/memory measurements.

## Phase 6 — package readiness

- [x] Typed entry point, examples, architecture, limitations, and clean-build commands.
- [x] CI pipeline for Rust, WASM contract, TypeScript, and three browser engines.
- [x] Clean CI run completed after fixing formatter, WASM optimization, Firefox resume, and legacy listener compatibility issues.
- [ ] npm publication intentionally deferred until package ownership and final public name are chosen.
