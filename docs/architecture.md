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
- `diagnostics`: bounded event ring.
- `engine`: singleton lifecycle and public façade.

## State ownership

Rust is authoritative for normalized positions, source priority/category/activity, room preset values, distance math, and eviction choice. Browser-only ephemeral objects—decoded buffers, media elements, audio nodes, timers, and event listeners—stay in TypeScript and are explicitly disconnected or removed.

A stopped handle remains reusable by design. Call `dispose()` when the game no longer needs to restart that source. Natural one-shot nodes disconnect automatically; the listening lab also disposes temporary handles.

## Quality modes

- `hrtf`: `PannerNode` uses HRTF and the room convolver is active.
- `equal-power`: cheaper panning, a shorter procedural impulse, and reduced room level to lower processing cost.

Changing quality updates existing sources without destroying the scene.

## Error boundaries

- TypeScript sanitizes all public numeric/vector input before touching an `AudioParam`.
- Rust rejects non-finite boundary values and unsupported preset versions with thrown JavaScript errors, never panics.
- Fetch/decode failures reject with the asset URL and remove the failed cache entry.
- Missing WASM is a hard startup error; release code does not report a fake successful backend.
