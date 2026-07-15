import type { DistanceModel, RoomPresetV1, SoundCategory, Vec3 } from "./types.js";
export declare class CoreBridge {
    #private;
    readonly version: string;
    private constructor();
    static load(): Promise<CoreBridge>;
    setListenerPosition(position: Vec3): void;
    upsertSource(id: string, position: Vec3, volume: number, priority: number, category: SoundCategory): void;
    setSourcePosition(id: string, position: Vec3): void;
    setSourceActive(id: string, active: boolean): void;
    removeSource(id: string): void;
    attenuation(id: string, model: DistanceModel, refDistance: number, maxDistance: number, rolloff: number): number;
    selectVictim(category: SoundCategory, categoryLimit: number, totalLimit: number): string | undefined;
    roomPreset(name: string): RoomPresetV1;
    normalizeRoomPreset(preset: RoomPresetV1): RoomPresetV1;
    dispose(): void;
}
//# sourceMappingURL=wasm-bridge.d.ts.map