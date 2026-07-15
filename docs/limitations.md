# Known limitations in v0.1

- Occlusion is a manual `0..1` parameter. World geometry and ray tracing are intentionally outside v0.1.
- Room impulse responses are deterministic procedural approximations, not measured acoustic captures.
- Front/rear quality depends on the browser HRTF implementation, headphones, and the listener's hearing; it requires subjective testing.
- `equal-power` is a performance mode and does not provide HRTF front/rear elevation cues.
- Long streaming media requires suitable CORS headers when loaded cross-origin.
- A reused source handle remains registered until `dispose()` so that pause/restart stays possible.
- The engine does not yet profile and cull inaudible Web Audio graphs; Rust uses distance when choosing a victim after a limit is exceeded.
- No custom AudioWorklet DSP is shipped yet.
- Automated Chromium, Firefox, and WebKit checks prove that the real WASM package loads, controls execute, focus stays stable, and no unexpected console error occurs. Headless automation cannot prove that spatialization, reverb, and occlusion sound subjectively correct through real headphones.
- Physical iPhone, VoiceOver, device lock, route changes, Bluetooth latency, and telephone interruptions require real-device testing.
