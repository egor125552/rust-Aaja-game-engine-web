export type Vec3 = readonly [x: number, y: number, z: number];
export type StandardCategory = "ui" | "speech" | "music" | "environment" | "footsteps" | "mechanisms" | "danger";
export type SoundCategory = StandardCategory | (string & {});
export type SpatialQuality = "hrtf" | "equal-power";
export type DistanceModel = "linear" | "inverse" | "exponential";
export type EngineState = AudioContextState | "interrupted" | "unavailable";
export type SourceState = "loading" | "playing" | "paused" | "stopped" | "disposed" | "error";
export interface DistanceOptions {
    model?: DistanceModel;
    refDistance?: number;
    maxDistance?: number;
    rolloffFactor?: number;
}
export interface DirectionalConeOptions {
    innerAngle?: number;
    outerAngle?: number;
    outerGain?: number;
}
export interface PlayOptions {
    position?: Vec3;
    orientation?: Vec3;
    loop?: boolean;
    volume?: number;
    playbackRate?: number;
    category?: SoundCategory;
    priority?: number;
    fadeInMs?: number;
    roomAmount?: number;
    occlusion?: number;
    distance?: DistanceOptions;
    cone?: DirectionalConeOptions;
    stream?: boolean;
    autoStart?: boolean;
}
export interface ToneOptions extends Omit<PlayOptions, "stream"> {
    frequency?: number;
    durationMs?: number;
    type?: OscillatorType;
}
export interface EngineOptions {
    context?: AudioContext;
    quality?: SpatialQuality;
    masterVolume?: number;
    maxVoices?: number;
    autoRecover?: boolean;
    latencyHint?: AudioContextLatencyCategory | number;
}
export interface CategoryOptions {
    volume?: number;
    muted?: boolean;
    priority?: number;
    maxVoices?: number;
}
export interface RoomPresetV1 {
    schemaVersion: 1;
    name: string;
    wet: number;
    decaySeconds: number;
    preDelaySeconds: number;
    highFrequencyAbsorption: number;
    earlyReflections: number;
    size: number;
    toneHz: number;
}
export interface RoomControls {
    readonly preset: Readonly<RoomPresetV1>;
    applyPreset(preset: RoomPresetV1, rampMs?: number): void;
    setReverbAmount(value: number, rampMs?: number): void;
    exportPreset(): string;
    importPreset(json: string, rampMs?: number): RoomPresetV1;
}
export type BuiltInRoom = "dry" | "small-room" | "large-room" | "long-corridor" | "basement" | "metal-room" | "metal-corridor" | "cave" | "street" | "outdoors" | "forest" | "underwater";
export interface DiagnosticEvent {
    time: number;
    level: "info" | "warning" | "error";
    code: string;
    message: string;
    details?: Readonly<Record<string, unknown>>;
}
export interface SoundHandle {
    readonly id: string;
    readonly state: SourceState;
    readonly category: SoundCategory;
    readonly position: Vec3;
    readonly duration: number;
    play(): Promise<void>;
    pause(): void;
    stop(fadeOutMs?: number): Promise<void>;
    restart(): Promise<void>;
    dispose(): void;
    setVolume(value: number, rampMs?: number): void;
    setPlaybackRate(value: number, rampMs?: number): void;
    setPosition(position: Vec3, rampMs?: number): void;
    moveTo(position: Vec3, durationMs: number): void;
    setOrientation(orientation: Vec3, rampMs?: number): void;
    setCone(innerAngle: number, outerAngle: number, outerGain?: number): void;
    setOcclusion(value: number, rampMs?: number): void;
    setRoomAmount(value: number, rampMs?: number): void;
}
//# sourceMappingURL=types.d.ts.map