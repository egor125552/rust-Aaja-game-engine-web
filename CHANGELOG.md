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
- Added an accessible eight-level full-feature listening tour with a deterministic local WAV, all room presets, parallel feature exercise, repeat/stop controls, and focused automated coverage.
- Fixed a Firefox cancellation race where a source disposed during a pending `AudioContext.resume()` could attempt a late start against an already removed Rust scene entry.
