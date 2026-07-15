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

type LegacyPannerNode = PannerNode & {
  setPosition?: (x: number, y: number, z: number) => void;
  setOrientation?: (x: number, y: number, z: number) => void;
};

type LegacyAudioListener = AudioListener & {
  setPosition?: (x: number, y: number, z: number) => void;
  setOrientation?: (
    forwardX: number,
    forwardY: number,
    forwardZ: number,
    upX: number,
    upY: number,
    upZ: number,
  ) => void;
};

const hasAudioParam = (value: unknown): value is AudioParam =>
  typeof value === "object"
  && value !== null
  && typeof (value as AudioParam).setValueAtTime === "function";

type LegacyListenerState = {
  position: [number, number, number];
  forward: [number, number, number];
  up: [number, number, number];
  adapters: Map<string, AudioParam>;
};

const legacyListenerStates = new WeakMap<AudioListener, LegacyListenerState>();

const legacyListenerState = (listener: AudioListener): LegacyListenerState => {
  const existing = legacyListenerStates.get(listener);
  if (existing) return existing;
  const created: LegacyListenerState = {
    position: [0, 0, 0],
    forward: [0, 0, -1],
    up: [0, 1, 0],
    adapters: new Map(),
  };
  legacyListenerStates.set(listener, created);
  return created;
};

const installLegacyListenerAudioParams = (): void => {
  const constructor = (globalThis as typeof globalThis & {
    AudioListener?: { prototype: AudioListener };
  }).AudioListener;
  if (!constructor) return;
  const prototype = constructor.prototype;
  const legacy = prototype as LegacyAudioListener;
  if (typeof legacy.setPosition !== "function" || typeof legacy.setOrientation !== "function") return;

  const define = (
    property: "positionX" | "positionY" | "positionZ" | "forwardX" | "forwardY" | "forwardZ" | "upX" | "upY" | "upZ",
    vector: "position" | "forward" | "up",
    axis: 0 | 1 | 2,
  ): void => {
    if (property in prototype) return;
    Object.defineProperty(prototype, property, {
      configurable: true,
      get(this: AudioListener): AudioParam {
        const state = legacyListenerState(this);
        const cached = state.adapters.get(property);
        if (cached) return cached;
        const apply = (value: number): void => {
          if (!Number.isFinite(value)) return;
          state[vector][axis] = value;
          const current = this as LegacyAudioListener;
          if (vector === "position") {
            current.setPosition?.(...state.position);
          } else {
            current.setOrientation?.(...state.forward, ...state.up);
          }
        };
        const adapter = {
          get value(): number { return state[vector][axis]; },
          set value(value: number) { apply(value); },
          cancelScheduledValues: (): AudioParam => adapter as AudioParam,
          setValueAtTime: (value: number): AudioParam => {
            apply(value);
            return adapter as AudioParam;
          },
          linearRampToValueAtTime: (value: number): AudioParam => {
            apply(value);
            return adapter as AudioParam;
          },
        } as unknown as AudioParam;
        state.adapters.set(property, adapter);
        return adapter;
      },
    });
  };

  define("positionX", "position", 0);
  define("positionY", "position", 1);
  define("positionZ", "position", 2);
  define("forwardX", "forward", 0);
  define("forwardY", "forward", 1);
  define("forwardZ", "forward", 2);
  define("upX", "up", 0);
  define("upY", "up", 1);
  define("upZ", "up", 2);
};

installLegacyListenerAudioParams();

export const setPositionParams = (
  node: PannerNode,
  position: Vec3,
  context: BaseAudioContext,
  rampMs: number,
): void => {
  if (hasAudioParam(node.positionX) && hasAudioParam(node.positionY) && hasAudioParam(node.positionZ)) {
    automate(node.positionX, position[0], context, rampMs);
    automate(node.positionY, position[1], context, rampMs);
    automate(node.positionZ, position[2], context, rampMs);
    return;
  }
  const legacy = node as LegacyPannerNode;
  if (typeof legacy.setPosition !== "function") {
    throw new Error("This browser does not provide a supported PannerNode position API");
  }
  legacy.setPosition(position[0], position[1], position[2]);
};

export const setOrientationParams = (
  node: PannerNode,
  orientation: Vec3,
  context: BaseAudioContext,
  rampMs: number,
): void => {
  if (
    hasAudioParam(node.orientationX)
    && hasAudioParam(node.orientationY)
    && hasAudioParam(node.orientationZ)
  ) {
    automate(node.orientationX, orientation[0], context, rampMs);
    automate(node.orientationY, orientation[1], context, rampMs);
    automate(node.orientationZ, orientation[2], context, rampMs);
    return;
  }
  const legacy = node as LegacyPannerNode;
  if (typeof legacy.setOrientation !== "function") {
    throw new Error("This browser does not provide a supported PannerNode orientation API");
  }
  legacy.setOrientation(orientation[0], orientation[1], orientation[2]);
};

export const setListenerPositionParams = (
  listener: AudioListener,
  position: Vec3,
  context: BaseAudioContext,
  rampMs: number,
): void => {
  if (
    hasAudioParam(listener.positionX)
    && hasAudioParam(listener.positionY)
    && hasAudioParam(listener.positionZ)
  ) {
    automate(listener.positionX, position[0], context, rampMs);
    automate(listener.positionY, position[1], context, rampMs);
    automate(listener.positionZ, position[2], context, rampMs);
    return;
  }
  const legacy = listener as LegacyAudioListener;
  if (typeof legacy.setPosition !== "function") {
    throw new Error("This browser does not provide a supported AudioListener position API");
  }
  legacy.setPosition(position[0], position[1], position[2]);
};

export const setListenerOrientationParams = (
  listener: AudioListener,
  forward: Vec3,
  up: Vec3,
  context: BaseAudioContext,
  rampMs: number,
): void => {
  if (
    hasAudioParam(listener.forwardX)
    && hasAudioParam(listener.forwardY)
    && hasAudioParam(listener.forwardZ)
    && hasAudioParam(listener.upX)
    && hasAudioParam(listener.upY)
    && hasAudioParam(listener.upZ)
  ) {
    automate(listener.forwardX, forward[0], context, rampMs);
    automate(listener.forwardY, forward[1], context, rampMs);
    automate(listener.forwardZ, forward[2], context, rampMs);
    automate(listener.upX, up[0], context, rampMs);
    automate(listener.upY, up[1], context, rampMs);
    automate(listener.upZ, up[2], context, rampMs);
    return;
  }
  const legacy = listener as LegacyAudioListener;
  if (typeof legacy.setOrientation !== "function") {
    throw new Error("This browser does not provide a supported AudioListener orientation API");
  }
  legacy.setOrientation(forward[0], forward[1], forward[2], up[0], up[1], up[2]);
};

export const createId = (() => {
  let counter = 0;
  return (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${(++counter).toString(36)}`;
})();
