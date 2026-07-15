# iPhone / VoiceOver check

This must be run on real hardware; headless WebKit is not equivalent.

1. Turn VoiceOver on and open the demo in Safari.
2. Swipe through controls. Confirm order matches headings and no hidden canvas controls exist.
3. Activate Enable audio once. Confirm focus remains on the button and status is spoken once.
4. Use an external keyboard: `1`–`4`, `C`, `O`, `H`, `D`, Escape.
5. Confirm parameter changes do not announce every animation frame.
6. Lock and unlock the phone, return to Safari, activate Enable audio, and repeat a direction.
7. Report iOS version, device, headphones, browser state, exact failed step, and console log if available.
