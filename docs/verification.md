# Verification record

This file distinguishes checks that actually ran from checks that are still pending.

## Executed locally on 2026-07-15

- Strict TypeScript compilation for the engine.
- Type checking for both published examples against the public source entry point.
- Focused Node tests for side-effect-free import, finite numeric guards, vector repair, direction normalization, and unique IDs.
- JavaScript syntax checks for the demo and Playwright suites.
- Static review of the Rust/WASM method names against `CoreBridge` and `scripts/verify-wasm.mjs`.

## Not executable in the current container

- `cargo fmt`, `cargo clippy`, Rust unit tests, and `wasm-pack build`: no Rust toolchain is installed and the container cannot download one.
- Browser execution: installed Chromium navigation is blocked by an administrator policy.
- Physical iPhone and VoiceOver: no device access.

## Required CI evidence

A phase stays pending until GitHub Actions successfully performs all of the following from a clean clone:

1. Install stable Rust and the `wasm32-unknown-unknown` target.
2. Run formatting, Clippy with warnings denied, and Rust unit tests.
3. Build release WASM with `wasm-pack`.
4. Verify generated method names and room/voice behavior through the real module.
5. Build and dry-run-pack the TypeScript package.
6. Start the demo and pass Chromium, Firefox, and WebKit smoke tests.
7. Upload the built engine, demo, and failure reports.

Subjective HRTF, reverb, occlusion, and real VoiceOver behavior remain manual listening checks even after CI passes.
