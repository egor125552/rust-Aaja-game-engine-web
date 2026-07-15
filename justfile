set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

build:
    npm run build

check:
    npm run check

wasm-test:
    npm run test:wasm

browser-test:
    npm run test:e2e

serve:
    npm run serve

wasm:
    npm run build:wasm

clean:
    npm run clean
