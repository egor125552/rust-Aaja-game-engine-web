# Architecture

## Boundary

`AudioGameEngine` is the single public entry point. Rust owns normalized scene data, room schemas, distance calculations, and voice-selection policy. TypeScript mirrors that state into browser-native Web Audio nodes. Raw `AudioNode` objects never appear in the public API.

The engine deliberately does not send audio sample blocks through the JavaScript/WASM boundary. `PannerNode`, `GainNode`, `BiquadFilterNode`, `ConvolverNode`, and `DynamicsCompressorNode` already execute in the browser audio engine without blocking the UI thread.

## Data flow

Direct source path:

`AudioBufferSourceNode or MediaElementAudioSourceNode -> source gain -> occlusion low-pass -> occlusion gain -> PannerNode -> category dry bus -> compressor -> master gain -> destination`

Room path:

`PannerNode -> source room-send gain -> category wet bus -> shared room input -> pre-delay -> tone filter -> crossfaded convolver lane -> room wet gain -> master input`

## Modules

### Rust

- `math`: finite vectors and Web Audio-compatible distance attenuation.
- `scene`: listener/source state and distance-derived audibility.
- `voices`: deterministic eviction using category limits, priority, estimated audibility, age, and stable ID.
- `presets`: versioned room schema, normalization, and built-ins.
- `lib`: narrow `wasm-bindgen` boundary whose JavaScript names are integration-tested.

### TypeScript

- `wasm-bridge`: generated WASM loading and the only direct Rust boundary.
- `assets`: decoded short-effect cache.
- `source`: replayable buffer and streaming source lifecycles and node cleanup.
- `room`: procedural impulse generation and shared room bus.
- `mixer`: categories, per-category settings, and speech ducking.
- `diagnostics`: bounded recent-event ring plus cumulative counters by level and event code.
- `engine`: singleton lifecycle, immutable diagnostics snapshot, and public façade.

### Demo and validation

- main listening lab: manual controls plus eight scripted levels;
- focused front/back page: dry real-Foley comparison without room or occlusion;
- benchmark page: source creation, playback, eviction, timing, cleanup cycles, and report export;
- package smoke: real tarball, external installation, TypeScript, direct ESM, Vite build, emitted WASM, and browser runtime.

## State ownership

Rust is authoritative for normalized positions, source priority/category/activity, room preset values, distance math, and eviction choice. Browser-only ephemeral objects—decoded buffers, media elements, audio nodes, timers, and event listeners—stay in TypeScript and are explicitly disconnected or removed.

A stopped handle remains reusable by design. Call `dispose()` when the game no longer needs to restart that source. Natural one-shot nodes disconnect automatically; the listening tools also dispose temporary handles.

`getDiagnosticsSnapshot()` copies cumulative diagnostic totals and current scalar state. It never returns the internal maps, sets, audio nodes, buffers, media elements, or Rust objects. Registered handles and cached decoded assets are separate counts because a healthy cache can outlive every handle.

## Quality modes

- `hrtf`: `PannerNode` uses HRTF and the room convolver is active.
- `equal-power`: cheaper panning, a shorter procedural impulse, and reduced room level to lower processing cost.

Changing quality updates existing sources without destroying the scene. Front/back localization remains dependent on the browser's generic HRTF and the listener; the engine does not claim a personalized HRTF.

## Package asset loading

The WASM bridge uses a literal dynamic import of `./wasm/audio_game_core.js`. The generated loader and `.wasm` binary are copied into `dist/wasm`. Keeping the import statically discoverable allows Vite to emit the generated module and binary from an installed tarball. Package smoke tests fail if either file is absent or the production output loses the `.wasm` reference.

## Error boundaries

- TypeScript sanitizes all public numeric/vector input before touching an `AudioParam`.
- Rust rejects non-finite boundary values and unsupported preset versions with thrown JavaScript errors, never panics.
- Fetch/decode failures reject with the asset URL and remove the failed cache entry.
- Missing WASM is a hard startup error; release code does not report a fake successful backend.
- Unsupported performance and memory metrics are reported as unavailable rather than estimated.
