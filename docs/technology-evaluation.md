# Technology evaluation

## Decision

Use Rust for deterministic scene state, validation, math, preset serialization, and voice selection; compile it with `wasm-bindgen` and `wasm-pack`. Use browser-native Web Audio nodes for playback and spatialization. Introduce `AudioWorklet` only when a concrete feature cannot be implemented correctly with standard nodes.

## Evaluation

| Candidate | Browser WASM | Safari/mobile | Bundle/runtime cost | Result |
|---|---:|---:|---:|---|
| `wasm-bindgen` | Yes | Works where WebAssembly is available | Small boundary glue | Selected for stable typed Rust/JS bindings. |
| `web-sys` | Yes | API availability follows browser | Feature-gated bindings add only selected APIs | Not needed in v0.1 because TypeScript owns Web Audio; available if future Rust code must call browser APIs directly. |
| Standard Web Audio API | Native | Broad modern support, with autoplay/background constraints | No third-party package | Selected for context, buffers, gain, filters, panning, convolution, compressor, and media streaming. |
| `PannerNode` HRTF | Native | Broad modern support | Browser implementation | Selected default quality; `equalpower` is the low-cost mode. |
| `ConvolverNode` | Native | Broad modern support | Impulse-buffer memory and CPU | Selected for shared room processing; bypassed in low-cost mode. |
| `AudioWorklet` | Native in modern browsers | Available but lifecycle-sensitive | Extra worker/module/WASM plumbing | Deferred; no v0.1 feature justifies custom per-sample DSP. |
| Native Rust audio crates (`cpal` and device backends) | No practical browser audio-device backend | No | Incompatible/native dependencies | Rejected. |
| Full third-party JavaScript audio engines | Usually | Varies | Larger dependency, API, and replacement surface | Rejected for v0.1; native nodes cover the requirements. |

## Dependency rules

- The public API cannot expose generated WASM classes or raw Web Audio nodes.
- A dependency must add a measured capability, not duplicate a browser primitive.
- Generated WASM can be rebuilt or the backend replaced without changing `AudioGameEngine` or `SoundHandle`.
- Production uses size optimization, LTO, one codegen unit, aborting panics, and stripped symbols.

## Compatibility notes

- Audio must be resumed after a user gesture; a closed context cannot resume.
- `PannerNode` supplies 3D position, source orientation, HRTF/equal-power modes, and distance models; ordinary stereo pan is not treated as full 3D audio.
- Background and interruption behavior differs across Chromium, Firefox, and WebKit. The engine reports context state and retries on return/gesture, but browser policy remains authoritative.
- Headless WebKit does not prove physical iPhone/VoiceOver behavior; that has a separate hardware test script.

## Primary references

- MDN `AudioContext.resume`: https://developer.mozilla.org/docs/Web/API/AudioContext/resume
- MDN `PannerNode.panningModel`: https://developer.mozilla.org/docs/Web/API/PannerNode/panningModel
- MDN `AudioWorklet`: https://developer.mozilla.org/docs/Web/API/AudioWorklet
- `wasm-bindgen` guide: https://rustwasm.github.io/docs/wasm-bindgen/
- `wasm-pack` build guide: https://rustwasm.github.io/docs/wasm-pack/commands/build.html
- `wasm-pack` releases: https://github.com/wasm-bindgen/wasm-pack/releases
