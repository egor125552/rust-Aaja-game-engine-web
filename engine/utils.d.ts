import type { Vec3 } from "./types.js";
export declare const clamp: (value: number, minimum: number, maximum: number) => number;
export declare const clamp01: (value: number) => number;
export declare const positive: (value: number, fallback: number) => number;
export declare const sanitizeVec3: (value: Vec3 | undefined, fallback?: Vec3) => Vec3;
export declare const normalizeDirection: (value: Vec3 | undefined, fallback: Vec3) => Vec3;
export declare const sanitizeRampMs: (value: number, fallback?: number) => number;
export declare const automate: (parameter: AudioParam, value: number, context: BaseAudioContext, rampMs?: number) => void;
export declare const setPositionParams: (node: PannerNode, position: Vec3, context: BaseAudioContext, rampMs: number) => void;
export declare const setOrientationParams: (node: PannerNode, orientation: Vec3, context: BaseAudioContext, rampMs: number) => void;
export declare const setListenerPositionParams: (listener: AudioListener, position: Vec3, context: BaseAudioContext, rampMs: number) => void;
export declare const setListenerOrientationParams: (listener: AudioListener, forward: Vec3, up: Vec3, context: BaseAudioContext, rampMs: number) => void;
export declare const createId: (prefix: string) => string;
//# sourceMappingURL=utils.d.ts.map