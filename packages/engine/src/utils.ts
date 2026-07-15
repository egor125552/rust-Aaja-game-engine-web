import type { Vec3 } from "./types.js";

export const clamp = (value: number, minimum: number, maximum: number): number => {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
};

export const clamp01 = (value: number): number => clamp(value, 0, 1);
export const positive = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

export const sanitizeVec3 = (value: Vec3 | undefined, fallback: Vec3 = [0, 0, 0]): Vec3 => {
  if (!value || value.length !== 3) return fallback;
  return [
    Number.isFinite(value[0]) ? value[0] : fallback[0],
    Number.isFinite(value[1]) ? value[1] : fallback[1],
    Number.isFinite(value[2]) ? value[2] : fallback[2],
  ];
};

export const normalizeDirection = (
  value: Vec3 | undefined,
  fallback: Vec3,
): Vec3 => {
  const vector = sanitizeVec3(value, fallback);
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (!Number.isFinite(length) || length < 1e-6) return fallback;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
};

export const sanitizeRampMs = (value: number, fallback = 0): number =>
  Number.isFinite(value) ? Math.max(0, value) : Math.max(0, fallback);

export const automate = (
  parameter: AudioParam,
  value: number,
  context: BaseAudioContext,
  rampMs = 30,
): void => {
  const target = Number.isFinite(value) ? value : 0;
  const duration = sanitizeRampMs(rampMs);
  const now = context.currentTime;
  if (typeof parameter.cancelAndHoldAtTime === "function") {
    parameter.cancelAndHoldAtTime(now);
  } else {
    parameter.cancelScheduledValues(now);
    const current = Number.isFinite(parameter.value) ? parameter.value : target;
    parameter.setValueAtTime(current, now);
  }
  if (duration === 0) parameter.setValueAtTime(target, now);
  else parameter.linearRampToValueAtTime(target, now + duration / 1_000);
};

export const setPositionParams = (
  node: PannerNode,
  position: Vec3,
  context: BaseAudioContext,
  rampMs: number,
): void => {
  automate(node.positionX, position[0], context, rampMs);
  automate(node.positionY, position[1], context, rampMs);
  automate(node.positionZ, position[2], context, rampMs);
};

export const setOrientationParams = (
  node: PannerNode,
  orientation: Vec3,
  context: BaseAudioContext,
  rampMs: number,
): void => {
  automate(node.orientationX, orientation[0], context, rampMs);
  automate(node.orientationY, orientation[1], context, rampMs);
  automate(node.orientationZ, orientation[2], context, rampMs);
};

export const createId = (() => {
  let counter = 0;
  return (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${(++counter).toString(36)}`;
})();
