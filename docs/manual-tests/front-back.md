# Focused front/back listening test

Open `front-back.html` from the built demo or GitHub Pages.

## Fixed conditions

- One real door-close transient.
- Listener at `[0, 0, 0]`, looking toward negative `Z`.
- Front is negative `Z`; rear is positive `Z`.
- Distance: 4 metres.
- Equal source volume.
- Room: `dry` with wet amount `0`.
- Occlusion: `0`.
- No synthetic sine as the primary reference.

## Sequences

1. HRTF: front, rear, front, rear.
2. HRTF: 0, 30, 90, 150, 180, 210, 270, and 330 degrees.
3. A/B: front and rear in HRTF, then the same pair in equal-power.
4. Repeat the last test without changing focus.
5. Mark the result as confident, weak, or not distinguishable.

The result buttons record the current session only. They do not claim a universal acoustic result.

## Interpretation

- If left/right changes and the angular sequence rotates consistently, the spatial graph is active.
- If front/rear remains weak while left/right is clear, record it as a subjective limitation of the browser HRTF for that listener/device combination.
- Equal-power is a control mode and is not expected to provide reliable front/back separation.
- Do not add accessibility filters or artificial rear cues before the clean standard-HRTF sequence is evaluated.

No experimental `frontBackCue` is enabled in release `0.1.0`. The clean baseline must be evaluated first; any future cue must be opt-in, clearly described as a game accessibility cue, and A/B tested separately.
