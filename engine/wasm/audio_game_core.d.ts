/* tslint:disable */
/* eslint-disable */

export class CoreEngine {
    free(): void;
    [Symbol.dispose](): void;
    attenuationForSource(id: string, model: string, ref_distance: number, max_distance: number, rolloff: number): number;
    distanceToSource(id: string): number;
    constructor();
    normalizeRoomPresetJson(json: string): string;
    removeSource(id: string): boolean;
    roomPresetJson(name: string): string;
    selectVoiceToEvict(category: string, category_limit: number, total_limit: number): string;
    setListenerPosition(x: number, y: number, z: number): void;
    setSourceActive(id: string, active: boolean): void;
    setSourcePosition(id: string, x: number, y: number, z: number): void;
    upsertSource(id: string, x: number, y: number, z: number, volume: number, priority: number, category: string): void;
    version(): string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_coreengine_free: (a: number, b: number) => void;
    readonly coreengine_attenuationForSource: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly coreengine_distanceToSource: (a: number, b: number, c: number, d: number) => void;
    readonly coreengine_new: () => number;
    readonly coreengine_normalizeRoomPresetJson: (a: number, b: number, c: number, d: number) => void;
    readonly coreengine_removeSource: (a: number, b: number, c: number) => number;
    readonly coreengine_roomPresetJson: (a: number, b: number, c: number, d: number) => void;
    readonly coreengine_selectVoiceToEvict: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly coreengine_setListenerPosition: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly coreengine_setSourceActive: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly coreengine_setSourcePosition: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly coreengine_upsertSource: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => void;
    readonly coreengine_version: (a: number, b: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
