# ADR 0001: Hybrid Rust state core and native Web Audio graph

Status: accepted.

Rust owns deterministic logic; Web Audio owns realtime playback. Sending sample blocks through the JS/WASM boundary would add complexity without improving HRTF, filtering, convolver, or gain behavior already supplied by browsers. AudioWorklet remains an internal extension point.
