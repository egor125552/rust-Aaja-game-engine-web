import { automate, clamp, clamp01 } from "./utils.js";
const DEFAULTS = {
    ui: { volume: 1, muted: false, priority: 80, maxVoices: 8 },
    speech: { volume: 1, muted: false, priority: 90, maxVoices: 4 },
    music: { volume: 0.8, muted: false, priority: 20, maxVoices: 2 },
    environment: { volume: 0.85, muted: false, priority: 30, maxVoices: 12 },
    footsteps: { volume: 1, muted: false, priority: 55, maxVoices: 8 },
    mechanisms: { volume: 0.9, muted: false, priority: 50, maxVoices: 10 },
    danger: { volume: 1, muted: false, priority: 100, maxVoices: 8 },
};
export class Mixer {
    #context;
    #masterInput;
    #roomInput;
    #buses = new Map();
    #duckingTriggers = new Set();
    constructor(context, masterInput, roomInput) {
        this.#context = context;
        this.#masterInput = masterInput;
        this.#roomInput = roomInput;
        for (const [name, options] of Object.entries(DEFAULTS))
            this.configure(name, options);
    }
    configure(category, options) {
        const bus = this.#ensure(category);
        if (options.volume !== undefined)
            bus.volume = clamp01(options.volume);
        if (options.muted !== undefined)
            bus.muted = options.muted;
        if (options.priority !== undefined && Number.isFinite(options.priority)) {
            bus.priority = Math.trunc(clamp(options.priority, -2_147_483_648, 2_147_483_647));
        }
        if (options.maxVoices !== undefined && Number.isFinite(options.maxVoices)) {
            bus.maxVoices = Math.trunc(clamp(options.maxVoices, 1, 256));
        }
        this.#apply(bus);
    }
    setVolume(category, volume) {
        this.configure(category, { volume });
    }
    setMuted(category, muted) {
        this.configure(category, { muted });
    }
    getPriority(category) {
        return this.#ensure(category).priority;
    }
    getMaxVoices(category) {
        return this.#ensure(category).maxVoices;
    }
    dryInput(category) {
        return this.#ensure(category).dry;
    }
    wetInput(category) {
        return this.#ensure(category).wet;
    }
    beginSpeechDucking(sourceId) {
        this.#duckingTriggers.add(sourceId);
        this.#refreshDucking();
    }
    endSpeechDucking(sourceId) {
        this.#duckingTriggers.delete(sourceId);
        this.#refreshDucking();
    }
    clearDucking() {
        this.#duckingTriggers.clear();
        this.#refreshDucking();
    }
    dispose() {
        this.#duckingTriggers.clear();
        for (const bus of this.#buses.values()) {
            bus.dry.disconnect();
            bus.wet.disconnect();
        }
        this.#buses.clear();
    }
    #ensure(category) {
        const existing = this.#buses.get(category);
        if (existing)
            return existing;
        const defaults = DEFAULTS[category] ?? { volume: 1, muted: false, priority: 40, maxVoices: 8 };
        const dry = this.#context.createGain();
        const wet = this.#context.createGain();
        dry.connect(this.#masterInput);
        wet.connect(this.#roomInput);
        const bus = { dry, wet, ...defaults, duckFactor: 1 };
        this.#buses.set(category, bus);
        this.#apply(bus, 0);
        return bus;
    }
    #refreshDucking() {
        const active = this.#duckingTriggers.size > 0;
        for (const [category, bus] of this.#buses) {
            bus.duckFactor = active && (category === "music" || category === "environment") ? 0.32 : 1;
            this.#apply(bus, active ? 90 : 220);
        }
    }
    #apply(bus, rampMs = 50) {
        const gain = bus.muted ? 0 : bus.volume * bus.duckFactor;
        automate(bus.dry.gain, gain, this.#context, rampMs);
        automate(bus.wet.gain, gain, this.#context, rampMs);
    }
}
//# sourceMappingURL=mixer.js.map