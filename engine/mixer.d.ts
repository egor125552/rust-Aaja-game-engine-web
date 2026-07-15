import type { CategoryOptions, SoundCategory } from "./types.js";
export declare class Mixer {
    #private;
    constructor(context: AudioContext, masterInput: AudioNode, roomInput: AudioNode);
    configure(category: SoundCategory, options: CategoryOptions): void;
    setVolume(category: SoundCategory, volume: number): void;
    setMuted(category: SoundCategory, muted: boolean): void;
    getPriority(category: SoundCategory): number;
    getMaxVoices(category: SoundCategory): number;
    dryInput(category: SoundCategory): GainNode;
    wetInput(category: SoundCategory): GainNode;
    beginSpeechDucking(sourceId: string): void;
    endSpeechDucking(sourceId: string): void;
    clearDucking(): void;
    dispose(): void;
}
//# sourceMappingURL=mixer.d.ts.map