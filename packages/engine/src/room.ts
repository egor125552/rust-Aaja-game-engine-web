import type { BuiltInRoom, RoomPresetV1, SpatialQuality } from "./types.js";
import { CoreBridge } from "./wasm-bridge.js";
import { automate, clamp01 } from "./utils.js";

const MAX_IMPULSE_CACHE_ENTRIES = 24;

interface ConvolutionLane {
  convolver: ConvolverNode;
  gain: GainNode;
}

const seededNoise = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0;
    return state / 0xffff_ffff;
  };
};

export class RoomController {
  readonly input: GainNode;
  readonly #context: AudioContext;
  readonly #core: CoreBridge;
  readonly #destination: AudioNode;
  readonly #preDelay: DelayNode;
  readonly #filter: BiquadFilterNode;
  readonly #retiringLanes = new Set<ConvolutionLane>();
  readonly #cleanupTimers = new Set<number>();
  readonly #impulseCache = new Map<string, AudioBuffer>();
  #lane: ConvolutionLane | undefined;
  #preset: RoomPresetV1;
  #quality: SpatialQuality = "hrtf";
  #disposed = false;

  constructor(context: AudioContext, core: CoreBridge, destination: AudioNode) {
    this.#context = context;
    this.#core = core;
    this.#destination = destination;
    this.input = context.createGain();
    this.#preDelay = context.createDelay(0.3);
    this.#filter = context.createBiquadFilter();
    this.#filter.type = "lowpass";
    this.input.connect(this.#preDelay).connect(this.#filter);
    this.#preset = core.roomPreset("dry");
    this.applyPreset(this.#preset, 0);
  }

  get preset(): Readonly<RoomPresetV1> {
    return Object.freeze({ ...this.#preset });
  }

  set(name: BuiltInRoom, rampMs = 120): RoomPresetV1 {
    const preset = this.#core.roomPreset(name);
    this.applyPreset(preset, rampMs);
    return preset;
  }

  applyPreset(preset: RoomPresetV1, rampMs = 120): void {
    this.#assertAvailable();
    const normalized = this.#core.normalizeRoomPreset(preset);
    const nextLane = this.#createLane(normalized);
    const previousLane = this.#lane;
    this.#lane = nextLane;
    this.#preset = normalized;

    automate(this.#preDelay.delayTime, normalized.preDelaySeconds, this.#context, rampMs);
    const cutoff = Math.max(
      300,
      normalized.toneHz * (1 - normalized.highFrequencyAbsorption * 0.45),
    );
    automate(this.#filter.frequency, cutoff, this.#context, rampMs);
    automate(nextLane.gain.gain, this.#targetWet(), this.#context, rampMs);

    if (previousLane) {
      this.#retiringLanes.add(previousLane);
      automate(previousLane.gain.gain, 0, this.#context, rampMs);
      this.#retireLane(previousLane, rampMs + 60);
    }
  }

  setReverbAmount(value: number, rampMs = 80): void {
    this.#assertAvailable();
    this.#preset = { ...this.#preset, wet: clamp01(value) };
    if (this.#lane) automate(this.#lane.gain.gain, this.#targetWet(), this.#context, rampMs);
  }

  setQuality(quality: SpatialQuality, rampMs = 100): void {
    this.#assertAvailable();
    if (quality === this.#quality) return;
    this.#quality = quality;
    this.applyPreset(this.#preset, rampMs);
  }

  exportPreset(): string {
    return JSON.stringify(this.#preset, null, 2);
  }

  importPreset(json: string, rampMs = 120): RoomPresetV1 {
    this.#assertAvailable();
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (error) {
      throw new Error("Room preset is not valid JSON", { cause: error });
    }
    const normalized = this.#core.normalizeRoomPreset(parsed as RoomPresetV1);
    this.applyPreset(normalized, rampMs);
    return normalized;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const timer of this.#cleanupTimers) globalThis.clearTimeout(timer);
    this.#cleanupTimers.clear();
    if (this.#lane) this.#disconnectLane(this.#lane);
    for (const lane of this.#retiringLanes) this.#disconnectLane(lane);
    this.#retiringLanes.clear();
    this.#impulseCache.clear();
    this.input.disconnect();
    this.#preDelay.disconnect();
    this.#filter.disconnect();
  }

  #createLane(preset: RoomPresetV1): ConvolutionLane {
    const convolver = this.#context.createConvolver();
    convolver.normalize = true;
    convolver.buffer = this.#createImpulse(preset);
    const gain = this.#context.createGain();
    gain.gain.value = 0;
    this.#filter.connect(convolver).connect(gain).connect(this.#destination);
    return { convolver, gain };
  }

  #retireLane(lane: ConvolutionLane, delayMs: number): void {
    const timer = globalThis.setTimeout(() => {
      this.#cleanupTimers.delete(timer);
      this.#retiringLanes.delete(lane);
      this.#disconnectLane(lane);
    }, Math.max(0, delayMs));
    this.#cleanupTimers.add(timer);
  }

  #disconnectLane(lane: ConvolutionLane): void {
    try {
      this.#filter.disconnect(lane.convolver);
    } catch {
      // It may already be disconnected by a completed crossfade.
    }
    lane.convolver.disconnect();
    lane.gain.disconnect();
    lane.convolver.buffer = null;
  }

  #targetWet(): number {
    return this.#preset.wet * (this.#quality === "hrtf" ? 1 : 0.7);
  }

  #createImpulse(preset: RoomPresetV1): AudioBuffer {
    const sampleRate = this.#context.sampleRate;
    const cacheKey = JSON.stringify([this.#quality, sampleRate, preset]);
    const cached = this.#impulseCache.get(cacheKey);
    if (cached) return cached;

    const maximumDuration = this.#quality === "hrtf" ? 4 : 1.25;
    const duration = Math.min(maximumDuration, Math.max(0.05, preset.decaySeconds));
    const length = Math.max(1, Math.ceil(sampleRate * duration));
    const buffer = this.#context.createBuffer(2, length, sampleRate);
    const random = seededNoise(this.#hash(`${preset.name}:${this.#quality}`));
    const earlySamples = Math.max(
      1,
      Math.floor(sampleRate * Math.min(0.08, 0.006 + preset.size * 0.07)),
    );
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        const progress = index / length;
        const tail = Math.pow(1 - progress, 1.25 + (1 - preset.size) * 1.8);
        const stride = Math.max(23, Math.floor(1_500 / (1 + preset.earlyReflections * 7)));
        const early = index < earlySamples && index % stride === 0
          ? preset.earlyReflections * (1 - index / earlySamples)
          : 0;
        data[index] = ((random() * 2 - 1) * tail * 0.5 + early)
          * (channel === 0 ? 1 : 0.97);
      }
    }
    if (this.#impulseCache.size >= MAX_IMPULSE_CACHE_ENTRIES) {
      const oldestKey = this.#impulseCache.keys().next().value as string | undefined;
      if (oldestKey !== undefined) this.#impulseCache.delete(oldestKey);
    }
    this.#impulseCache.set(cacheKey, buffer);
    return buffer;
  }

  #hash(value: string): number {
    let hash = 2_166_136_261;
    for (const character of value) {
      hash ^= character.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 16_777_619);
    }
    return hash >>> 0;
  }

  #assertAvailable(): void {
    if (this.#disposed) throw new Error("Room controller has been disposed");
  }
}
