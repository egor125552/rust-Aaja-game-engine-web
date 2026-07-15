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

type LegacyPanner = PannerNode & {
  positionX?: AudioParam;
  positionY?: AudioParam;
  positionZ?: AudioParam;
  orientationX?: AudioParam;
  orientationY?: AudioParam;
  orientationZ?: AudioParam;
};

type LegacyListener = AudioListener & {
  positionX?: AudioParam;
  positionY?: AudioParam;
  positionZ?: AudioParam;
  forwardX?: AudioParam;
  forwardY?: AudioParam;
  forwardZ?: AudioParam;
  upX?: AudioParam;
  upY?: AudioParam;
  upZ?: AudioParam;
};

const hasThreeParams = (
  first: AudioParam | undefined,
  second: AudioParam | undefined,
  third: AudioParam | undefined,
): first is AudioParam => first !== undefined && second !== undefined && third !== undefined;

export const setPositionParams = (
  node: PannerNode,
  position: Vec3,
  context: BaseAudioContext,
  rampMs: number,
): void => {
  const compatible = node as LegacyPanner;
  if (hasThreeParams(compatible.positionX, compatible.positionY, compatible.positionZ)) {
    automate(compatible.positionX, position[0], context, rampMs);
    automate(compatible.positionY as AudioParam, position[1], context, rampMs);
    automate(compatible.positionZ as AudioParam, position[2], context, rampMs);
    return;
  }
  compatible.setPosition(position[0], position[1], position[2]);
};

export const setOrientationParams = (
  node: PannerNode,
  orientation: Vec3,
  context: BaseAudioContext,
  rampMs: number,
): void => {
  const compatible = node as LegacyPanner;
  if (hasThreeParams(compatible.orientationX, compatible.orientationY, compatible.orientationZ)) {
    automate(compatible.orientationX, orientation[0], context, rampMs);
    automate(compatible.orientationY as AudioParam, orientation[1], context, rampMs);
    automate(compatible.orientationZ as AudioParam, orientation[2], context, rampMs);
    return;
  }
  compatible.setOrientation(orientation[0], orientation[1], orientation[2]);
};

export const setListenerPositionParams = (
  listener: AudioListener,
  position: Vec3,
  context: BaseAudioContext,
  rampMs: number,
): void => {
  const compatible = listener as LegacyListener;
  if (hasThreeParams(compatible.positionX, compatible.positionY, compatible.positionZ)) {
    automate(compatible.positionX, position[0], context, rampMs);
    automate(compatible.positionY as AudioParam, position[1], context, rampMs);
    automate(compatible.positionZ as AudioParam, position[2], context, rampMs);
    return;
  }
  compatible.setPosition(position[0], position[1], position[2]);
};

export const setListenerOrientationParams = (
  listener: AudioListener,
  forward: Vec3,
  up: Vec3,
  context: BaseAudioContext,
  rampMs: number,
): void => {
  const compatible = listener as LegacyListener;
  const forwardParamsPresent = hasThreeParams(
    compatible.forwardX,
    compatible.forwardY,
    compatible.forwardZ,
  );
  const upParamsPresent = hasThreeParams(compatible.upX, compatible.upY, compatible.upZ);
  if (forwardParamsPresent && upParamsPresent) {
    automate(compatible.forwardX, forward[0], context, rampMs);
    automate(compatible.forwardY as AudioParam, forward[1], context, rampMs);
    automate(compatible.forwardZ as AudioParam, forward[2], context, rampMs);
    automate(compatible.upX as AudioParam, up[0], context, rampMs);
    automate(compatible.upY as AudioParam, up[1], context, rampMs);
    automate(compatible.upZ as AudioParam, up[2], context, rampMs);
    return;
  }
  compatible.setOrientation(forward[0], forward[1], forward[2], up[0], up[1], up[2]);
};

export const createId = (() => {
  let counter = 0;
  return (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${(++counter).toString(36)}`;
})();
