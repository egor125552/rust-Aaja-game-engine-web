# @aaja/audio-game-engine

Accessible ESM-only browser audio engine for audio games. Rust/WebAssembly owns deterministic scene state, validation, room presets, distance math, and voice eviction. Browser Web Audio performs playback, HRTF spatialization, filtering, mixing, and convolution.

```ts
import { AudioGameEngine } from "@aaja/audio-game-engine";

const audio = await AudioGameEngine.start({ quality: "hrtf" });
const cue = await audio.play("/audio/cue.wav", {
  position: [0, 0, -4],
  category: "danger",
});

cue.setOcclusion(0.5);
audio.setRoom("small-room");
```

## Runtime requirements

- A modern browser with Web Audio API, WebAssembly, dynamic ESM imports, and `import.meta.url`.
- A user gesture is normally required before audio can start.
- The package is ESM-only. No CommonJS export is provided.

The standard HRTF comes from the browser. Left/right localization is usually stronger than front/back localization, and subjective results vary by listener, headphones, browser, and device.

The package includes the JavaScript API, TypeScript declarations, the generated WASM loader, and the `.wasm` binary. Bundler smoke tests cover a clean tarball installation and a Vite production build.

Documentation and the public accessible listening lab are available from the repository homepage.
