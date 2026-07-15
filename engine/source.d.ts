import { Diagnostics } from "./diagnostics.js";
import { Mixer } from "./mixer.js";
import type { PlayOptions, SoundCategory, SoundHandle, SourceState, SpatialQuality, Vec3 } from "./types.js";
import { CoreBridge } from "./wasm-bridge.js";
export interface SourceHost {
    readonly context: AudioContext;
    readonly mixer: Mixer;
    readonly core: CoreBridge;
    readonly diagnostics: Diagnostics;
    readonly quality: SpatialQuality;
    resume(): Promise<void>;
    sourceStarted(source: BaseSoundHandle): void;
    sourceStopped(source: BaseSoundHandle): void;
    sourceDisposed(source: BaseSoundHandle): void;
}
export declare abstract class BaseSoundHandle implements SoundHandle {
    #private;
    readonly id: string;
    readonly category: SoundCategory;
    protected constructor(host: SourceHost, id: string, options: PlayOptions);
    abstract get duration(): number;
    abstract play(): Promise<void>;
    abstract pause(): void;
    abstract stop(fadeOutMs?: number): Promise<void>;
    abstract restart(): Promise<void>;
    protected abstract setBackendPlaybackRate(value: number, rampMs: number): void;
    protected abstract disposeBackend(): void;
    get state(): SourceState;
    get position(): Vec3;
    get playbackRate(): number;
    protected get currentVolume(): number;
    protected get host(): SourceHost;
    protected get input(): AudioNode;
    protected rampOutput(value: number, rampMs: number): void;
    protected get isDisposed(): boolean;
    protected transition(next: SourceState): void;
    setSpatialQuality(quality: SpatialQuality): void;
    setVolume(value: number, rampMs?: number): void;
    setPlaybackRate(value: number, rampMs?: number): void;
    setPosition(position: Vec3, rampMs?: number): void;
    moveTo(position: Vec3, durationMs: number): void;
    setOrientation(orientation: Vec3, rampMs?: number): void;
    setCone(innerAngle: number, outerAngle: number, outerGain?: number): void;
    setOcclusion(value: number, rampMs?: number): void;
    setRoomAmount(value: number, rampMs?: number): void;
    dispose(): void;
    protected setInitialState(state: SourceState): void;
    protected reportError(error: unknown): void;
    protected fail(error: unknown): never;
}
export declare class BufferSoundHandle extends BaseSoundHandle {
    #private;
    constructor(host: SourceHost, id: string, buffer: AudioBuffer, options: PlayOptions);
    get duration(): number;
    play(): Promise<void>;
    pause(): void;
    stop(fadeOutMs?: number): Promise<void>;
    restart(): Promise<void>;
    protected setBackendPlaybackRate(value: number, rampMs: number): void;
    protected disposeBackend(): void;
}
export declare class StreamSoundHandle extends BaseSoundHandle {
    #private;
    constructor(host: SourceHost, id: string, url: string, options: PlayOptions);
    get duration(): number;
    play(): Promise<void>;
    pause(): void;
    stop(fadeOutMs?: number): Promise<void>;
    restart(): Promise<void>;
    protected setBackendPlaybackRate(value: number): void;
    protected disposeBackend(): void;
}
//# sourceMappingURL=source.d.ts.map