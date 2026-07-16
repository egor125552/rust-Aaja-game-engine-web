# Agent guide

## Repository map

- `crates/core/`: Rust scene core compiled to WebAssembly.
- `packages/engine/src/`: TypeScript façade and Web Audio backend.
- `packages/engine/wasm-pkg/`: generated WASM package; never edit by hand.
- `demo/`: keyboard and screen-reader accessible listening lab, focused front/back page, and benchmark.
- `examples/`: minimal connection and multi-source scene examples.
- `tests/`: focused Node and Playwright checks.
- `docs/decisions/`: architecture decision records.
- `artifacts/`: generated tarballs, clean consumer builds, and benchmark reports; do not commit generated contents.

## Commands

- Install Rust target: `rustup target add wasm32-unknown-unknown`
- Install WASM builder: `cargo install wasm-pack --locked`
- Build WASM: `npm run build:wasm`
- Build TypeScript: `npm run build:engine`
- Build everything: `npm run build`
- TypeScript checks: `npm run typecheck`
- Rust tests: `npm run test:rust`
- WASM boundary test: `npm run test:wasm`
- Focused TypeScript tests: `npm run test:ts`
- Critical non-browser checks: `npm run check`
- Cross-browser and benchmark smoke: `npm run test:e2e`
- Real npm tarball plus clean consumer: `npm run test:package`
- Installed-package direct ESM and Vite browser smoke: `npm run test:consumer-browser`
- Rust formatting: `npm run format:rust`
- Rust lint: `npm run lint:rust`
- Local server: `npm run serve`, then open `http://127.0.0.1:4173`

## Browser demo check

1. Focus **Enable or resume audio** and activate it.
2. Press `1`, `2`, `3`, `4` to hear left, front, right, rear.
3. Press `R` for the complete direction sequence and `A` for approach.
4. Press `C` to cycle rooms, `O` to cycle occlusion, and `H` for quality.
5. Press `D` to run speech ducking; danger must remain audible.
6. Open `front-back.html`; run front/rear, eight angles, and HRTF/equal-power A/B.
7. Open `benchmark.html`; run the 8/16 smoke and confirm zero remaining handles and ducking.
8. Press `Escape` to stop all sounds.
9. Inspect the console: any unexplained error fails the phase.

## Definition of a completed phase

A phase is complete only after the latest code builds from a clean tree, relevant tests pass after the final change, the demo loads the generated WASM, public behavior is exercised, no unexplained console errors remain, cleanup/restart is checked, and `PLAN.md`, docs, and `CHANGELOG.md` match the code.

Package-ready additionally means a real tarball was installed outside the workspace, TypeScript passed, direct browser ESM passed, Vite emitted the WASM asset, and the installed package initialized the real core in a browser.

Acoustic claims require human listening. Playwright and Web Audio graph creation are not proof of front/back perception or reverb quality.

## Errors that cannot be ignored

- Rust panic or `unwrap()` on browser/user input.
- Missing or silently replaced WASM in release and CI.
- `NaN`, infinities, invalid `AudioParam` ranges, or abrupt unsmoothed parameter changes.
- Stale source nodes, duplicated event handlers, or a new `AudioContext` per source.
- Non-zero playing handles or ducking after benchmark cleanup.
- Focus jumps, unlabeled controls, status spam, or a feature available only visually.
- Tarball tests that accidentally resolve the workspace instead of the installed archive.
- Tests removed or weakened only to make CI green.

## No temporary replacements

Do not replace the Rust core, audio graph, source cleanup, room processing, voice limiting, accessible demo, or package consumer with fake success responses or inert stubs. If a future degraded backend is added, it must be explicit, documented, and excluded from release integration checks.
