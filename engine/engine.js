import { AssetCache } from "./assets.js";
import { Diagnostics } from "./diagnostics.js";
import { Mixer } from "./mixer.js";
import { RoomController } from "./room.js";
import { BufferSoundHandle, StreamSoundHandle, } from "./source.js";
import { automate, clamp, clamp01, createId, normalizeDirection, sanitizeVec3, setListenerOrientationParams, setListenerPositionParams, } from "./utils.js";
import { CoreBridge } from "./wasm-bridge.js";
const normalizeQuality = (quality) => {
    if (quality === undefined || quality === "hrtf")
        return "hrtf";
    if (quality === "equal-power")
        return quality;
    throw new TypeError(`Unknown spatial quality: ${String(quality)}`);
};
const normalizeCategory = (category) => {
    if (typeof category !== "string" || category.trim().length === 0) {
        throw new TypeError("Sound category must be a non-empty string");
    }
    return category.trim();
};
const normalizeAssetUrl = (url) => {
    if (typeof url !== "string" || url.trim().length === 0) {
        throw new TypeError("Audio asset URL must be a non-empty string");
    }
    return url.trim();
};
export class AudioGameEngine extends EventTarget {
    static #active;
    diagnostics;
    room;
    #context;
    #core;
    #mixer;
    #roomController;
    #sourceHost;
    #assets;
    #sources = new Map();
    #masterInput;
    #masterGain;
    #compressor;
    #maxVoices;
    #autoRecover;
    #ownsContext;
    #recoveryEvents = ["pointerdown", "keydown", "touchend"];
    #quality;
    #listenerPosition = [0, 0, 0];
    #closed = false;
    #onStateChange;
    #onVisibilityChange;
    #onRecoveryGesture;
    constructor(context, core, options) {
        super();
        this.#context = context;
        this.#core = core;
        this.diagnostics = new Diagnostics();
        this.#quality = normalizeQuality(options.quality);
        this.#maxVoices = Math.trunc(clamp(options.maxVoices ?? 32, 1, 256));
        this.#autoRecover = options.autoRecover ?? true;
        this.#ownsContext = options.context === undefined;
        this.#masterInput = context.createGain();
        this.#compressor = context.createDynamicsCompressor();
        this.#compressor.threshold.value = -8;
        this.#compressor.knee.value = 10;
        this.#compressor.ratio.value = 8;
        this.#compressor.attack.value = 0.003;
        this.#compressor.release.value = 0.18;
        this.#masterGain = context.createGain();
        this.#masterGain.gain.value = clamp01(options.masterVolume ?? 1);
        this.#masterInput
            .connect(this.#compressor)
            .connect(this.#masterGain)
            .connect(context.destination);
        this.#roomController = new RoomController(context, core, this.#masterInput);
        this.#roomController.setQuality(this.#quality, 0);
        this.room = this.#roomController;
        this.#mixer = new Mixer(context, this.#masterInput, this.#roomController.input);
        this.#assets = new AssetCache(context, this.diagnostics);
        const engine = this;
        this.#sourceHost = {
            context,
            core,
            mixer: this.#mixer,
            diagnostics: this.diagnostics,
            get quality() { return engine.#quality; },
            resume: () => this.resume(),
            sourceStarted: (source) => this.#sourceStarted(source),
            sourceStopped: (source) => this.#sourceStopped(source),
            sourceDisposed: (source) => this.#sourceDisposed(source),
        };
        this.#onStateChange = () => {
            this.diagnostics.info("context.state", `Audio context state: ${this.state}`);
            this.dispatchEvent(new CustomEvent("statechange", { detail: this.state }));
        };
        this.#onVisibilityChange = () => {
            if (!document.hidden && this.#autoRecover)
                void this.resume();
        };
        this.#onRecoveryGesture = () => {
            if (this.#autoRecover && this.#context.state !== "running")
                void this.resume();
        };
        context.addEventListener("statechange", this.#onStateChange);
        if (typeof document !== "undefined") {
            document.addEventListener("visibilitychange", this.#onVisibilityChange);
            for (const event of this.#recoveryEvents) {
                document.addEventListener(event, this.#onRecoveryGesture, { passive: true });
            }
        }
    }
    static async start(options = {}) {
        if (this.#active) {
            const current = await this.#active;
            if (!current.#closed && current.#context.state !== "closed") {
                await current.resume();
                return current;
            }
            if (!current.#closed)
                await current.close();
        }
        this.#active = this.#create(options).catch((error) => {
            this.#active = undefined;
            throw error;
        });
        return this.#active;
    }
    static async #create(options) {
        if (!options.context && typeof AudioContext === "undefined") {
            throw new Error("Web Audio API is not available in this browser");
        }
        let context;
        let core;
        try {
            const latencyHint = typeof options.latencyHint === "number"
                ? clamp(options.latencyHint, 0.001, 1)
                : options.latencyHint ?? "interactive";
            context = options.context ?? new AudioContext({ latencyHint });
            if (context.state === "closed") {
                throw new Error("Cannot start the audio game engine with a closed AudioContext");
            }
            // Start the browser unlock attempt before the first asynchronous module load.
            // Firefox can lose transient user activation while the WASM module is fetched.
            const initialResume = context.state === "running"
                ? Promise.resolve()
                : context.resume();
            core = await CoreBridge.load();
            const engine = new AudioGameEngine(context, core, options);
            await engine.#settleResumeAttempt(initialResume);
            engine.diagnostics.info("engine.started", "Audio game engine started", {
                coreVersion: core.version,
                sampleRate: context.sampleRate,
                quality: engine.quality,
            });
            return engine;
        }
        catch (error) {
            core?.dispose();
            if (!options.context && context && context.state !== "closed") {
                await context.close().catch(() => undefined);
            }
            throw error;
        }
    }
    get state() {
        return this.#context.state;
    }
    get quality() {
        return this.#quality;
    }
    get coreVersion() {
        return this.#core.version;
    }
    get activeSourceCount() {
        let count = 0;
        for (const source of this.#sources.values()) {
            if (source.state === "playing")
                count += 1;
        }
        return count;
    }
    get cachedAssetCount() {
        return this.#assets.size;
    }
    async resume() {
        if (this.#closed)
            throw new Error("Audio game engine is closed");
        if (this.#context.state === "suspended" || this.#context.state === "interrupted") {
            await this.#settleResumeAttempt(this.#context.resume());
        }
    }
    async #settleResumeAttempt(attempt, timeoutMs = 750) {
        let timeoutId;
        const timeout = new Promise((resolve) => {
            timeoutId = globalThis.setTimeout(() => resolve("timeout"), timeoutMs);
        });
        const result = await Promise.race([
            attempt.then(() => "resumed", (error) => ({ error })),
            timeout,
        ]);
        if (timeoutId !== undefined)
            globalThis.clearTimeout(timeoutId);
        if (typeof result === "object") {
            this.diagnostics.warning("context.resume.failed", "Audio could not resume before a user gesture", { reason: result.error instanceof Error ? result.error.message : String(result.error) });
        }
        else if (result === "timeout" && this.#context.state !== "running") {
            this.diagnostics.warning("context.resume.pending", "Audio resume is still pending; another user gesture may be required", { state: this.#context.state });
        }
    }
    async play(url, options = {}) {
        this.#assertOpen();
        const assetUrl = normalizeAssetUrl(url);
        const id = createId(options.stream ? "stream" : "sound");
        let source;
        try {
            if (options.stream) {
                source = new StreamSoundHandle(this.#sourceHost, id, assetUrl, options);
            }
            else {
                const buffer = await this.#assets.load(assetUrl);
                source = new BufferSoundHandle(this.#sourceHost, id, buffer, options);
            }
            this.#sources.set(id, source);
            if (options.autoStart ?? true)
                await source.play();
            return source;
        }
        catch (error) {
            source?.dispose();
            throw error;
        }
    }
    async playTone(options = {}) {
        this.#assertOpen();
        const durationMs = clamp(options.durationMs ?? 450, 20, 60_000);
        const frequency = clamp(options.frequency ?? 440, 20, 20_000);
        const type = options.type ?? "sine";
        const sampleCount = Math.max(1, Math.ceil((this.#context.sampleRate * durationMs) / 1_000));
        const buffer = this.#context.createBuffer(1, sampleCount, this.#context.sampleRate);
        const data = buffer.getChannelData(0);
        const attack = Math.max(1, Math.floor(sampleCount * 0.03));
        const release = Math.max(1, Math.floor(sampleCount * 0.1));
        for (let index = 0; index < sampleCount; index += 1) {
            const time = index / this.#context.sampleRate;
            const phase = frequency * time;
            const cycle = phase - Math.floor(phase);
            const waveform = type === "square"
                ? cycle < 0.5 ? 1 : -1
                : type === "sawtooth"
                    ? cycle * 2 - 1
                    : type === "triangle"
                        ? 1 - 4 * Math.abs(cycle - 0.5)
                        : Math.sin(Math.PI * 2 * phase);
            const envelope = index < attack
                ? index / attack
                : index > sampleCount - release
                    ? (sampleCount - index) / release
                    : 1;
            data[index] = waveform * Math.max(0, envelope) * 0.35;
        }
        const { frequency: _frequency, durationMs: _duration, type: _type, ...playOptions } = options;
        const source = new BufferSoundHandle(this.#sourceHost, createId("tone"), buffer, playOptions);
        this.#sources.set(source.id, source);
        try {
            if (options.autoStart ?? true)
                await source.play();
            return source;
        }
        catch (error) {
            source.dispose();
            throw error;
        }
    }
    setListenerPosition(position, rampMs = 35) {
        this.#assertOpen();
        const next = sanitizeVec3(position, this.#listenerPosition);
        this.#listenerPosition = next;
        setListenerPositionParams(this.#context.listener, next, this.#context, rampMs);
        this.#core.setListenerPosition(next);
    }
    setListenerOrientation(forward, up = [0, 1, 0], rampMs = 35) {
        this.#assertOpen();
        const safeForward = normalizeDirection(forward, [0, 0, -1]);
        let safeUp = normalizeDirection(up, [0, 1, 0]);
        const alignment = Math.abs(safeForward[0] * safeUp[0]
            + safeForward[1] * safeUp[1]
            + safeForward[2] * safeUp[2]);
        if (alignment > 0.999) {
            safeUp = Math.abs(safeForward[1]) > 0.999 ? [0, 0, 1] : [0, 1, 0];
        }
        setListenerOrientationParams(this.#context.listener, safeForward, safeUp, this.#context, rampMs);
    }
    setRoom(room, rampMs = 120) {
        this.#assertOpen();
        return this.#roomController.set(room, rampMs);
    }
    configureCategory(category, options) {
        this.#assertOpen();
        const normalized = normalizeCategory(category);
        this.#mixer.configure(normalized, options);
        this.#enforceLimits(normalized);
    }
    setMasterVolume(value, rampMs = 60) {
        this.#assertOpen();
        automate(this.#masterGain.gain, clamp01(value), this.#context, rampMs);
    }
    setQuality(quality) {
        this.#assertOpen();
        const normalized = normalizeQuality(quality);
        if (normalized === this.#quality)
            return;
        this.#quality = normalized;
        for (const source of this.#sources.values())
            source.setSpatialQuality(normalized);
        this.#roomController.setQuality(normalized);
        this.diagnostics.info("quality.changed", `Spatial quality changed to ${normalized}`);
    }
    async stopAll(fadeOutMs = 30) {
        const sources = [...this.#sources.values()];
        await Promise.allSettled(sources.map((source) => source.stop(fadeOutMs)));
        this.#mixer.clearDucking();
    }
    async close() {
        if (this.#closed)
            return;
        await this.stopAll(0);
        for (const source of [...this.#sources.values()])
            source.dispose();
        this.#assets.clear();
        this.#context.removeEventListener("statechange", this.#onStateChange);
        if (typeof document !== "undefined") {
            document.removeEventListener("visibilitychange", this.#onVisibilityChange);
            for (const event of this.#recoveryEvents) {
                document.removeEventListener(event, this.#onRecoveryGesture);
            }
        }
        this.#mixer.dispose();
        this.#roomController.dispose();
        this.#masterInput.disconnect();
        this.#compressor.disconnect();
        this.#masterGain.disconnect();
        this.#core.dispose();
        try {
            if (this.#ownsContext && this.#context.state !== "closed")
                await this.#context.close();
        }
        finally {
            this.#closed = true;
            AudioGameEngine.#active = undefined;
        }
    }
    #sourceStarted(source) {
        if (source.category === "speech")
            this.#mixer.beginSpeechDucking(source.id);
        this.#enforceLimits(source.category);
        this.dispatchEvent(new CustomEvent("sourcestart", { detail: source }));
    }
    #sourceStopped(source) {
        if (source.category === "speech")
            this.#mixer.endSpeechDucking(source.id);
        this.dispatchEvent(new CustomEvent("sourcestop", { detail: source }));
    }
    #sourceDisposed(source) {
        if (source.category === "speech")
            this.#mixer.endSpeechDucking(source.id);
        this.#sources.delete(source.id);
    }
    #enforceLimits(category) {
        let guard = this.#sources.size + 1;
        while (guard-- > 0) {
            const victimId = this.#core.selectVictim(category, this.#mixer.getMaxVoices(category), this.#maxVoices);
            if (!victimId)
                return;
            const victim = this.#sources.get(victimId);
            if (!victim || victim.state !== "playing") {
                this.#core.setSourceActive(victimId, false);
                continue;
            }
            this.diagnostics.warning("voice.evicted", `Evicted source ${victimId} because a voice limit was reached`, { category });
            this.#core.setSourceActive(victimId, false);
            void victim.stop(25);
        }
    }
    #assertOpen() {
        if (this.#closed)
            throw new Error("Audio game engine is closed");
    }
}
//# sourceMappingURL=engine.js.map