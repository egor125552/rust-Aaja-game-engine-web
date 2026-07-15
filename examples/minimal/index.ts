import { AudioGameEngine } from "@aaja/audio-game-engine";

const audio = await AudioGameEngine.start();
const beacon = await audio.play("/sounds/beacon.mp3", {
  position: [4, 0, -8],
  loop: true,
});

beacon.setOcclusion(0.6);
beacon.moveTo([0, 0, -2], 1_500);
