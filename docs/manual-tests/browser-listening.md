# Browser listening checks

Use headphones at a safe level.

1. Enable audio. Expected: one concise status; no focus movement.
2. Direction sequence (`R`): left, front, right, rear. Expected: four distinct positions; rear should not collapse into front in HRTF mode.
3. Approach (`A`): source moves from 12 m to 1 m over four seconds. Expected: continuous movement without clicks or jumps.
4. Occlusion (`O`): cycle 0, 0.5, 1. Expected: progressively darker/quieter direct sound with some room energy retained.
5. Room (`C`): cycle dry, outdoors, room, corridor, cave, and underwater. Expected: obvious but controlled change; no click.
6. Ducking (`D`): music and ambience fall during speech; danger stays prominent; levels recover after speech.
7. Suspend/recover: background the tab, return, activate Enable audio. Expected: existing engine resumes or reports a precise state.
8. Escape. Expected: all sources stop and active source count becomes zero.
