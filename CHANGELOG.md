# Changelog

## 0.1.0 - 2026-07-15

- Added Rust/WASM scene core with finite-value validation, versioned room presets, distance attenuation, and deterministic priority/distance-aware voice eviction.
- Added typed Web Audio façade with one reusable context, asset cache, short and streaming sources, replay/pause/stop/fades, spatial movement, HRTF/equal-power modes, and explicit cleanup.
- Added procedural rooms, custom preset import/export, smooth occlusion, category mixer, limits, automatic speech ducking, emergency stop, and diagnostics.
- Added keyboard and screen-reader listening lab with reproducible direction, approach, room, occlusion, ducking, and recovery scenarios.
- Added Rust, WASM-boundary, TypeScript, and Chromium/Firefox/WebKit CI checks plus manual iPhone/VoiceOver instructions.
- Fixed production `wasm-opt` validation for Rust bulk-memory output while retaining size optimization.
- Fixed Firefox startup hangs by beginning resume during the user gesture and bounding unresolved `AudioContext.resume()` attempts.
- Added modern AudioParam and legacy `setPosition()`/`setOrientation()` compatibility for listener and source spatial controls.
- Verified a clean optimized WASM build, JS/WASM contract, formatter, Clippy, focused tests, and automated demo smoke checks in Chromium, Firefox, and WebKit.
- Added an accessible eight-level full-feature listening tour with repeat/stop controls and focused automated coverage.
- Fixed a Firefox cancellation race where a source disposed during a pending `AudioContext.resume()` could attempt a late start against an already removed Rust scene entry.
- Added selectable real CC0 Foley references: a wooden-footstep loop for movement and distance tests, a door-close transient for room/occlusion/direction tests, and the original synthetic earcon as an optional control.
- Recorded the user's real headphone result: playback, left/right HRTF effect, rooms, reverb, simultaneous sources, and primary accessibility worked; front/back remained weak or uncertain; hardware details were not specified.
- Added a separate dry front/back test using the same real door transient at equal distance and level, with front/rear repetition, eight angles, immediate repeat, ratings, and HRTF/equal-power A/B.
- Added immutable diagnostics snapshots with registered-handle states, source kinds, ducking, category buses, cache, quality, room, context, and cumulative eviction data.
- Added an accessible benchmark for up to 128 requested sources, twelve load/limit/cleanup scenarios, optional Long Task and memory data, and JSON/text export.
- Added regression checks for repeated create/stop/dispose cycles, zero remaining handles, cleared ducking, idempotent disposal, and voice-limit enforcement.
- Fixed installed-package Vite handling by replacing the Vite-ignored runtime WASM URL with a statically discoverable generated-module import.
- Added `npm pack --dry-run`, real tarball inspection, clean external installation, TypeScript consumer validation, direct browser ESM, Vite production build, emitted-WASM validation, and installed-package Chromium runtime checks.
- Added a lightweight CI benchmark smoke and a manual full benchmark workflow for 8, 16, 32, 64, and 128 sources.
- Prepared package metadata, package README, release notes, and the npm publication gate without publishing to an unconfirmed scope.
