# CI validation

The default-branch workflow is the authoritative clean environment for checks that require network-installed Rust tooling and browser runtimes.

It must build the real Rust crate for `wasm32-unknown-unknown`, execute Rust and JavaScript tests, verify the generated WASM boundary, build the distributable engine and demo, and run smoke checks in Chromium, Firefox, and WebKit.

A green TypeScript-only run is not sufficient to declare the release ready.
