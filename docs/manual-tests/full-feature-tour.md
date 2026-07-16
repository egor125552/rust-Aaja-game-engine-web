# Full feature listening tour

The demo contains an eight-level listening tour intended for keyboard and screen-reader use. Use headphones for spatial judgments.

1. Build and serve the repository.
2. Open the demo and activate **Enable or resume audio**.
3. Choose one of the three test references:
   - real CC0 wooden footsteps for sustained movement and distance;
   - real CC0 door close for direction, reverb, room, and occlusion transients;
   - locally generated synthetic earcon as a deterministic control.
4. In **Пошаговая проверка всех функций**, choose a level or **Все восемь уровней**.
5. Activate **Запустить выбранный уровень** or press `T`. Press `G` for the complete run, `P` to repeat, `X` to stop the scripted run, or `Escape` to stop every sound.
6. Keep focus on the control you used. The tour updates a progress element and concise status text without moving focus.

## Levels

1. Selected WAV loading and source lifecycle: play, pause, resume, playback rate, volume, stop, restart, and dispose.
2. Left/front/right/rear placement, simultaneous sources, smooth movement, and source cone direction.
3. Linear/inverse/exponential distance models and HRTF versus equal-power.
4. All built-in room presets using the selected reference, including dry, rooms, corridors, cave, outdoors, forest, and underwater.
5. Occlusion from `0` to `1`, direct filtering, and room-send changes.
6. Categories, speech ducking, danger preservation, category limits, and deterministic voice stealing.
7. Versioned room export/import, master volume, cached independent handles, `stopAll`, and cleanup.
8. A parallel scene where movement, room changes, occlusion, quality switching, ducking, listener changes, and several categories run together.

## Test sounds

The default reference is a real wooden-footstep loop. A real door-close transient is available for short acoustic comparisons. Both files are CC0 resources and their source/license records are copied with the production demo. The synthetic control is generated locally and does not require a network request.

The focused front/back test is intentionally separate from this tour. It always uses the same door transient, dry room, zero occlusion, equal distance, and equal level so that room effects do not hide a coordinate or HRTF problem.

## Expected limitations

Automation can verify that the real WASM module loads, Web Audio nodes are created, controls operate, focus is preserved, sources are cleaned, and no browser errors occur. It cannot decide whether front/rear separation, reverb character, or occlusion quality sounds convincing.

The user has confirmed sound playback, clear left/right effect, audible HRTF influence, room switching, reverb, simultaneous sources, and accessible primary controls. Front/back separation was weak or uncertain. Device, browser, and headphone model were not specified.
