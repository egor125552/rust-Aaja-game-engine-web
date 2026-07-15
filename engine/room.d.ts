import type { BuiltInRoom, RoomPresetV1, SpatialQuality } from "./types.js";
import { CoreBridge } from "./wasm-bridge.js";
export declare class RoomController {
    #private;
    readonly input: GainNode;
    constructor(context: AudioContext, core: CoreBridge, destination: AudioNode);
    get preset(): Readonly<RoomPresetV1>;
    set(name: BuiltInRoom, rampMs?: number): RoomPresetV1;
    applyPreset(preset: RoomPresetV1, rampMs?: number): void;
    setReverbAmount(value: number, rampMs?: number): void;
    setQuality(quality: SpatialQuality, rampMs?: number): void;
    exportPreset(): string;
    importPreset(json: string, rampMs?: number): RoomPresetV1;
    dispose(): void;
}
//# sourceMappingURL=room.d.ts.map