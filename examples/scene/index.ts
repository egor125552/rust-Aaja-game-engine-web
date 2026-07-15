import { AudioGameEngine } from "@aaja/audio-game-engine";

const audio = await AudioGameEngine.start({ maxVoices: 24 });
audio.setRoom("forest");
audio.configureCategory("speech", { priority: 90, maxVoices: 2 });
audio.configureCategory("danger", { priority: 100, maxVoices: 6 });

const river = await audio.play("/sounds/river.mp3", {
  position: [-8, 0, -4],
  loop: true,
  category: "environment",
  roomAmount: 0.8,
});
const alarm = await audio.play("/sounds/alarm.mp3", {
  position: [5, 1, -10],
  loop: true,
  category: "danger",
  priority: 100,
});

river.setOcclusion(0.35);
alarm.moveTo([1, 1, -2], 3_000);
