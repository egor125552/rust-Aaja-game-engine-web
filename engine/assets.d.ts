import { Diagnostics } from "./diagnostics.js";
export declare class AssetCache {
    #private;
    constructor(context: AudioContext, diagnostics: Diagnostics);
    get size(): number;
    load(url: string): Promise<AudioBuffer>;
    clear(url?: string): void;
}
//# sourceMappingURL=assets.d.ts.map