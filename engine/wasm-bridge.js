export class CoreBridge {
    version;
    #core;
    constructor(core) {
        this.#core = core;
        this.version = core.version();
    }
    static async load() {
        const moduleUrl = new URL("./wasm/audio_game_core.js", import.meta.url).href;
        let module;
        try {
            module = (await import(/* @vite-ignore */ moduleUrl));
        }
        catch (error) {
            throw new Error("The Rust/WASM core is missing. Run `npm run build:wasm` and `npm run build:engine` before using the source package.", { cause: error });
        }
        await module.default();
        return new CoreBridge(new module.CoreEngine());
    }
    setListenerPosition(position) {
        this.#core.setListenerPosition(position[0], position[1], position[2]);
    }
    upsertSource(id, position, volume, priority, category) {
        this.#core.upsertSource(id, position[0], position[1], position[2], volume, priority, category);
    }
    setSourcePosition(id, position) {
        this.#core.setSourcePosition(id, position[0], position[1], position[2]);
    }
    setSourceActive(id, active) {
        this.#core.setSourceActive(id, active);
    }
    removeSource(id) {
        this.#core.removeSource(id);
    }
    attenuation(id, model, refDistance, maxDistance, rolloff) {
        return this.#core.attenuationForSource(id, model, refDistance, maxDistance, rolloff);
    }
    selectVictim(category, categoryLimit, totalLimit) {
        return this.#core.selectVoiceToEvict(category, categoryLimit, totalLimit) || undefined;
    }
    roomPreset(name) {
        return JSON.parse(this.#core.roomPresetJson(name));
    }
    normalizeRoomPreset(preset) {
        return JSON.parse(this.#core.normalizeRoomPresetJson(JSON.stringify(preset)));
    }
    dispose() {
        this.#core.free?.();
    }
}
//# sourceMappingURL=wasm-bridge.js.map