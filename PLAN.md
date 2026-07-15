# Implementation plan

Status legend: `[x]` implemented and verified in the available environment, `[~]` implemented but awaiting the named external check, `[ ]` not started.

## Environment facts

- Node.js/TypeScript checks can run locally.
- This container has no Rust toolchain and cannot download one, so native Rust and generated WASM checks must run in GitHub Actions.
- Local Chromium navigation to `localhost` and `file://` is blocked by an administrator policy (`ERR_BLOCKED_BY_ADMINISTRATOR`), so browser execution must run in GitHub Actions or on user hardware.
- A physical iPhone and VoiceOver are not available; a precise manual script is included.

## Phase 0 — research and skeleton

- [x] Minimal hybrid stack selected and documented.
- [x] Workspace, agent guide, build scripts, ADRs, and demo skeleton created.
- [x] Rust/WASM crate and TypeScript façade contract aligned.
- [~] Generated WASM loads in a browser — GitHub Actions check pending.

## Phase 1 — working vertical slice

- [x] One reusable `AudioContext`, resume hooks, state reporting, and repeat initialization guard.
- [x] Buffer loading/cache, streaming path, play, pause, stop, restart, errors, and disposal implemented.
- [x] Simple typed public API implemented and TypeScript-checked.
- [~] Real browser playback through generated WASM — cross-browser CI pending.

## Phase 2 — spatial core

- [x] Listener and source position/orientation implemented.
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
- [~] Automated focus/console checks — cross-browser CI pending.
- [~] Physical VoiceOver check — user-hardware script supplied.

## Phase 5 — resilience and performance

- [x] One-shot node disconnection, explicit handle disposal, cached buffers, and no graph rebuild per frame.
- [x] Context recovery hooks and runtime quality switching.
- [x] Size-oriented release profile and CI artifact checks.
- [~] Chromium, Firefox, and WebKit smoke — GitHub Actions pending.
- [~] Real iPhone background/lock recovery — user hardware pending.
- [ ] Profile real scenes with dozens of concurrent sources and record CPU/memory measurements.

## Phase 6 — package readiness

- [x] Typed entry point, examples, architecture, limitations, and clean-build commands.
- [x] CI pipeline for Rust, WASM contract, TypeScript, package layout, and three browser engines; it uses only GitHub-owned actions plus shell-installed Rust to reduce repository policy blockers.
- [~] Clean CI run and resulting bug fixes pending on branch `agent/audio-engine-foundation`.
- [ ] npm publication intentionally deferred until package ownership and final public name are chosen.
