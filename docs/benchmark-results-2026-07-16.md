# Release benchmark results — 2026-07-16

These numbers describe one automated release-candidate run. They are not physical iPhone measurements and do not prove subjective acoustic quality.

## Environment

- Commit under test: `4a055e0b5f85f304a73e0990209ec5038a9cf9af`.
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
| 8 | 40 | 8 | 0 | 0 | 4.44 ms | 0.40 ms | 20.48 ms | 0.16 ms |
| 16 | 80 | 16 | 0 | 0 | 2.82 ms | 0.38 ms | 20.44 ms | 0.14 ms |
| 32 | 160 | 32 | 0 | 0 | 5.86 ms | 0.88 ms | 20.56 ms | 0.20 ms |
| 64 | 320 | 32 | 160 | 160 | 12.26 ms | 2.32 ms | 20.56 ms | 0.34 ms |
| 128 | 640 | 32 | 480 | 480 | 24.08 ms | 5.86 ms | 20.56 ms | 0.72 ms |

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
- cumulative diagnostic warnings: `640`;
- cumulative diagnostic errors: `0`.

The detailed diagnostic event ring remained bounded at 200 recent events. Exact benchmark totals did not depend on that ring: per-cycle reports used cumulative counter deltas, and the final snapshot exposed the same cumulative totals. The full workflow explicitly failed on an eviction/event mismatch, a truncated snapshot warning total, or any diagnostic error.

## Long tasks and memory

The Long Task API was available and reported zero long tasks in every cycle.

`performance.memory` was exposed, but Headless Chrome returned coarse, constant values of 10,000,000 bytes before and after every cycle. This is recorded as browser-provided information, not treated as precise proof of memory usage or absence of native/Web Audio allocations. Physical-device memory profiling remains external.

## Reporting bugs found during release readiness

The first full run counted 480 evictions at 128 requested sources but derived `voice.evicted` from a bounded recent-event ring, which lost older detailed events. Cumulative counters by diagnostic level and event code were added, and the benchmark was changed to use counter deltas.

A later run exposed a second inconsistency: `Diagnostics.warningCount` was cumulative, but `getDiagnosticsSnapshot().diagnosticWarningCount` still recomputed only the retained ring. The snapshot now reads cumulative counters directly. Regression tests and the full workflow cover both failure modes.
