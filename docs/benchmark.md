# Accessible benchmark

The benchmark is a separate page at `benchmark.html`; it is not part of the eight-level listening tour.

## Counts

- Presets: 1, 8, 16, 32, 64, and 128 requested sources.
- Custom value: clamped to 1 through 128.
- Repeated cleanup cycles: 1 through 10; the cleanup scenario enforces at least 5.

## Scenarios

- static equal-power;
- static HRTF;
- moving HRTF;
- HRTF plus occlusion;
- HRTF plus room processing;
- multiple categories;
- speech ducking under load;
- total voice limit;
- category voice limit;
- mass stop;
- dispose all;
- repeat the same test;
- at least five create/stop/dispose cycles.

## Reported data

- requested and created source counts;
- peak playing count;
- configured total voice limit;
- cumulative eviction delta and `voice.evicted` events;
- cached assets;
- create, start, stop, and dispose time;
- Long Task entries when the browser exposes that API;
- JavaScript heap information only when the browser exposes `performance.memory`;
- warning and error diagnostics;
- full immutable snapshots before, during, and after each cycle;
- cleanup invariants and final remaining handle/ducking counts.

Unavailable browser metrics are written as `недоступно`. The benchmark does not estimate CPU percentage or fabricate memory numbers.

## Cleanup invariants

After every cycle:

- `playing === 0`;
- `registeredHandles === 0`;
- `activeSpeechDuckingSessions === 0`;
- no error-state source remains registered;
- peak playing does not exceed the configured total voice limit;
- repeated `dispose()` calls do not fail;
- the same engine and `AudioContext` are reused within the run.

The decoded audio cache may remain populated by design. Cached assets are not leaked source handles.

## Automation

Normal CI runs a three-cycle smoke matrix with 8 and 16 sources in Chromium, Firefox, and WebKit through the regular Playwright project matrix. It also saves package and browser reports.

The `Full audio benchmark` workflow is manual (`workflow_dispatch`). It runs five cycles for 8, 16, 32, 64, and 128 requested sources in Chromium and uploads JSON plus plain text. CI timings describe the hosted runner, not a physical iPhone.

## Accessibility

- Native labels, selects, number inputs, buttons, progress, definition lists, and text output.
- Focus is not moved after activation.
- The live status changes only at meaningful phases, not on every source movement.
- JSON and plain-text downloads contain the same objective measurements.
