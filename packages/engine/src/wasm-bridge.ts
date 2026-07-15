import type { DistanceModel, RoomPresetV1, SoundCategory, Vec3 } from "./types.js";

interface WasmCoreEngine {
  version(): string;
  setListenerPosition(x: number, y: number, z: number): void;
  upsertSource(id: string, x: number, y: number, z: number, volume: number, priority: number, category: string): void;
  setSourcePosition(id: string, x: number, y: number, z: number): void;
  setSourceActive(id: string, active: boolean): void;
  removeSource(id: string): void;
  distanceToSource(id: string): number;
  attenuationForSource(id: string, model: string, refDistance: number, maxDistance: number, rolloff: number): number;
  selectVoiceToEvict(category: string, categoryLimit: number, totalLimit: number): string;
  roomPresetJson(name: string): string;
  normalizeRoomPresetJson(json: string): string;
  free?(): void;
}

interface WasmModule {
  default(input?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module): Promise<unknown>;
  CoreEngine: new () => WasmCoreEngine;
}

export class CoreBridge {
  readonly version: string;
  readonly #core: WasmCoreEngine;

  private constructor(core: WasmCoreEngine) {
    this.#core = core;
    this.version = core.version();
  }

  static async load(): Promise<CoreBridge> {
    const moduleUrl = new URL("./wasm/audio_game_core.js", import.meta.url).href;
    let module: WasmModule;
    try {
      module = (await import(/* @vite-ignore */ moduleUrl)) as WasmModule;
    } catch (error) {
      throw new Error(
        "The Rust/WASM core is missing. Run `npm run build:wasm` and `npm run build:engine` before using the source package.",
        { cause: error },
      );
    }
    await module.default();
    return new CoreBridge(new module.CoreEngine());
  }

  setListenerPosition(position: Vec3): void {
    this.#core.setListenerPosition(position[0], position[1], position[2]);
  }

  upsertSource(id: string, position: Vec3, volume: number, priority: number, category: SoundCategory): void {
    this.#core.upsertSource(id, position[0], position[1], position[2], volume, priority, category);
  }

  setSourcePosition(id: string, position: Vec3): void {
    this.#core.setSourcePosition(id, position[0], position[1], position[2]);
  }

  setSourceActive(id: string, active: boolean): void {
    this.#core.setSourceActive(id, active);
  }

  removeSource(id: string): void {
    this.#core.removeSource(id);
  }

  attenuation(id: string, model: DistanceModel, refDistance: number, maxDistance: number, rolloff: number): number {
    return this.#core.attenuationForSource(id, model, refDistance, maxDistance, rolloff);
  }

  selectVictim(category: SoundCategory, categoryLimit: number, totalLimit: number): string | undefined {
    return this.#core.selectVoiceToEvict(category, categoryLimit, totalLimit) || undefined;
  }

  roomPreset(name: string): RoomPresetV1 {
    return JSON.parse(this.#core.roomPresetJson(name)) as RoomPresetV1;
  }

  normalizeRoomPreset(preset: RoomPresetV1): RoomPresetV1 {
    return JSON.parse(this.#core.normalizeRoomPresetJson(JSON.stringify(preset))) as RoomPresetV1;
  }

  dispose(): void {
    this.#core.free?.();
  }
}
