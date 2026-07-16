# Release benchmark results — 2026-07-16

These numbers describe one automated release-candidate run. They are not physical iPhone measurements and do not prove subjective acoustic quality.

## Environment

- Commit under test: `cbebf5403fb76ae183e2fb9de4ce726f91be998d`.
- Runner: GitHub-hosted Linux runner.
- Browser: Headless Chrome `149.0.7827.55`.
- User agent: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/149.0.7827.55 Safari/537.36`.
- Sample rate: 44,100 Hz.
- Quality: HRTF.
- Room: dry.
- Occlusion: `0`.
- Total voice limit: `32`.
- Cycles per requested count: `5`.

## Results

| Requested sources | Objects created across 5 cycles | Peak playing | Evicted | `voice.evicted` events | Average create | Average start | Average stop | Average dispose |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 40 | 8 | 0 | 0 | 3.80 ms | 0.32 ms | 20.42 ms | 0.14 ms |
| 16 | 80 | 16 | 0 | 0 | 3.02 ms | 0.36 ms | 20.40 ms | 0.12 ms |
| 32 | 160 | 32 | 0 | 0 | 6.20 ms | 0.80 ms | 20.50 ms | 0.14 ms |
| 64 | 320 | 32 | 160 | 160 | 12.56 ms | 2.24 ms | 20.58 ms | 0.36 ms |
| 128 | 640 | 32 | 480 | 480 | 23.64 ms | 4.42 ms | 20.54 ms | 0.64 ms |

Eviction totals are aggregated across all five cycles. For example, each 128-source cycle requested 128 voices while the limit was 32, so 96 voices were evicted per cycle and 480 across five cycles.

## Cleanup and diagnostics

Every one of the 25 cycles passed the cleanup invariants:

- playing sources after cleanup: `0`;
- registered handles after cleanup: `0`;
- speech ducking sessions after cleanup: `0`;
- error-state handles after cleanup: `0`;
- peak playing never exceeded the configured limit;
- the same engine and `AudioContext` were reused within the run;
- repeated `dispose()` calls remained safe.

The final snapshot contained:

- registered handles: `0`;
- playing, paused, stopped, loading, and error handles: `0`;
- active ducking sessions: `0`;
- cached decoded assets: `1`, intentionally retained for reuse;
- cumulative evictions: `640`;
- diagnostic errors: `0`.

## Long tasks and memory

The Long Task API was available and reported zero long tasks in every cycle.

`performance.memory` was exposed, but Headless Chrome returned coarse, constant values of 10,000,000 bytes before and after every cycle. This is recorded as browser-provided information, not treated as precise proof of memory usage or absence of native/Web Audio allocations. Physical-device memory profiling remains external.

## Reporting bug found during the run

The first full run correctly counted 480 evictions at 128 requested sources but retained only the last 37 `voice.evicted` events because the diagnostic ring was too small for the supported matrix. The release candidate now keeps cumulative diagnostic counters and a retained window large enough for the complete supported benchmark. A regression test verifies cumulative counts beyond a deliberately tiny ring. The corrected run reports 480 evictions and 480 matching events.
