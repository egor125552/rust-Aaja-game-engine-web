# Real-world audio assets

The listening lab uses two real Foley references from Kenney:

- **RPG Audio**: `doorClose_2.ogg`, converted to `demo/assets/audio/door-close.wav`.
- **Impact Sounds**: `footstep_wood_000.ogg`, converted and repeated with silence as `demo/assets/audio/wood-footsteps-loop.wav`.

Both source packs are published under Creative Commons CC0 1.0. Copies of the pack license files are stored next to the WAV derivatives.

The browser files are PCM16, mono, 48 kHz WAV. Processing is limited to decoding, mono conversion, resampling, and insertion of silence between unmodified footstep events. The synthetic earcon remains available only as a diagnostic control.

The native `Тестовый звук` select is keyboard- and screen-reader-accessible. Wooden footsteps are the default for movement and distance tests. The door transient is useful for room reverb, occlusion, front/rear placement, and comparing a single event at different distances.

Source pages:

- https://kenney.nl/assets/rpg-audio
- https://kenney.nl/assets/impact-sounds
- https://creativecommons.org/publicdomain/zero/1.0/
