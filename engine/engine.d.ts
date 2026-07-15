import { Diagnostics } from "./diagnostics.js";
import type { BuiltInRoom, CategoryOptions, EngineOptions, EngineState, PlayOptions, RoomControls, RoomPresetV1, SoundCategory, SoundHandle, SpatialQuality, ToneOptions, Vec3 } from "./types.js";
export declare class AudioGameEngine extends EventTarget {
    #private;
    readonly diagnostics: Diagnostics;
    readonly room: RoomControls;
    private constructor();
    static start(options?: EngineOptions): Promise<AudioGameEngine>;
    get state(): EngineState;
    get quality(): SpatialQuality;
    get coreVersion(): string;
    get activeSourceCount(): number;
    get cachedAssetCount(): number;
    resume(): Promise<void>;
    play(url: string, options?: PlayOptions): Promise<SoundHandle>;
    playTone(options?: ToneOptions): Promise<SoundHandle>;
    setListenerPosition(position: Vec3, rampMs?: number): void;
    setListenerOrientation(forward: Vec3, up?: Vec3, rampMs?: number): void;
    setRoom(room: BuiltInRoom, rampMs?: number): RoomPresetV1;
    configureCategory(category: SoundCategory, options: CategoryOptions): void;
    setMasterVolume(value: number, rampMs?: number): void;
    setQuality(quality: SpatialQuality): void;
    stopAll(fadeOutMs?: number): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=engine.d.ts.map