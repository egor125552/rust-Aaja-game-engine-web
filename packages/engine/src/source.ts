import { Diagnostics } from "./diagnostics.js";
import { Mixer } from "./mixer.js";
import type {
  DistanceOptions,
  PlayOptions,
  SoundCategory,
  SoundHandle,
  SourceState,
  SpatialQuality,
  Vec3,
} from "./types.js";
import {
  automate,
  clamp,
  clamp01,
  normalizeDirection,
  positive,
  sanitizeRampMs,
  sanitizeVec3,
  setOrientationParams,
  setPositionParams,
} from "./utils.js";
import { CoreBridge } from "./wasm-bridge.js";

export interface SourceHost {
  readonly context: AudioContext;
  readonly mixer: Mixer;
  readonly core: CoreBridge;
  readonly diagnostics: Diagnostics;
  readonly quality: SpatialQuality;
  resume(): Promise<void>;
  sourceStarted(source: BaseSoundHandle): void;
  sourceStopped(source: BaseSoundHandle): void;
  sourceDisposed(source: BaseSoundHandle): void;
}

interface SpatialChain {
  volume: GainNode;
  occlusionFilter: BiquadFilterNode;
  occlusionGain: GainNode;
  panner: PannerNode;
  dry: GainNode;
  wet: GainNode;
}

const normalizeDistance = (distance: DistanceOptions | undefined): Required<DistanceOptions> => ({
  model: distance?.model === "linear" || distance?.model === "exponential"
    ? distance.model
    : "inverse",
  refDistance: positive(distance?.refDistance ?? 1, 1),
  maxDistance: positive(distance?.maxDistance ?? 100, 100),
  rolloffFactor: Math.max(
    0,
    Number.isFinite(distance?.rolloffFactor) ? (distance?.rolloffFactor ?? 1) : 1,
  ),
});

const normalizeCategory = (category: SoundCategory | undefined): SoundCategory => {
  if (category === undefined) return "environment";
  if (typeof category !== "string" || category.trim().length === 0) {
    throw new TypeError("Sound category must be a non-empty string");
  }
  return category.trim();
};

const normalizePriority = (
  priority: number | undefined,
  fallback: number,
): number => Number.isFinite(priority)
  ? Math.trunc(clamp(priority ?? fallback, -2_147_483_648, 2_147_483_647))
  : fallback;

export abstract class BaseSoundHandle implements SoundHandle {
  readonly id: string;
  readonly category: SoundCategory;
  readonly #host: SourceHost;
  readonly #chain: SpatialChain;
  readonly #distance: Required<DistanceOptions>;
  readonly #priority: number;
  #state: SourceState = "loading";
  #position: Vec3;
  #orientation: Vec3;
  #volume: number;
  #playbackRate: number;
  #occlusion: number;
  #roomAmount: number;
  #disposed = false;

  protected constructor(host: SourceHost, id: string, options: PlayOptions) {
    this.#host = host;
    this.id = id;
    this.category = normalizeCategory(options.category);
    this.#position = sanitizeVec3(options.position, [0, 0, -1]);
    this.#orientation = normalizeDirection(options.orientation, [0, 0, 1]);
    this.#volume = clamp01(options.volume ?? 1);
    this.#playbackRate = clamp(options.playbackRate ?? 1, 0.25, 4);
    this.#occlusion = clamp01(options.occlusion ?? 0);
    this.#roomAmount = clamp01(options.roomAmount ?? 1);
    this.#priority = normalizePriority(
      options.priority,
      host.mixer.getPriority(this.category),
    );
    this.#distance = normalizeDistance(options.distance);

    const context = host.context;
    const volume = context.createGain();
    const occlusionFilter = context.createBiquadFilter();
    occlusionFilter.type = "lowpass";
    occlusionFilter.Q.value = 0.7;
    const occlusionGain = context.createGain();
    const panner = context.createPanner();
    panner.panningModel = host.quality === "hrtf" ? "HRTF" : "equalpower";
    panner.distanceModel = this.#distance.model;
    panner.refDistance = this.#distance.refDistance;
    panner.maxDistance = Math.max(this.#distance.refDistance, this.#distance.maxDistance);
    panner.rolloffFactor = this.#distance.rolloffFactor;
    const innerAngle = clamp(options.cone?.innerAngle ?? 360, 0, 360);
    const outerAngle = clamp(options.cone?.outerAngle ?? 360, innerAngle, 360);
    panner.coneInnerAngle = innerAngle;
    panner.coneOuterAngle = outerAngle;
    panner.coneOuterGain = clamp01(options.cone?.outerGain ?? 1);
    const dry = context.createGain();
    const wet = context.createGain();

    volume.connect(occlusionFilter).connect(occlusionGain).connect(panner);
    panner.connect(dry).connect(host.mixer.dryInput(this.category));
    panner.connect(wet).connect(host.mixer.wetInput(this.category));
    this.#chain = { volume, occlusionFilter, occlusionGain, panner, dry, wet };

    automate(volume.gain, this.#volume, context, 0);
    setPositionParams(panner, this.#position, context, 0);
    setOrientationParams(panner, this.#orientation, context, 0);
    this.setOcclusion(this.#occlusion, 0);
    this.setRoomAmount(this.#roomAmount, 0);
    host.core.upsertSource(this.id, this.#position, this.#volume, this.#priority, this.category);
  }

  abstract get duration(): number;
  abstract play(): Promise<void>;
  abstract pause(): void;
  abstract stop(fadeOutMs?: number): Promise<void>;
  abstract restart(): Promise<void>;
  protected abstract setBackendPlaybackRate(value: number, rampMs: number): void;
  protected abstract disposeBackend(): void;

  get state(): SourceState {
    return this.#state;
  }

  get position(): Vec3 {
    return this.#position;
  }

  get playbackRate(): number {
    return this.#playbackRate;
  }

  protected get currentVolume(): number {
    return this.#volume;
  }

  protected get host(): SourceHost {
    return this.#host;
  }

  protected get input(): AudioNode {
    return this.#chain.volume;
  }

  protected rampOutput(value: number, rampMs: number): void {
    automate(this.#chain.volume.gain, clamp01(value), this.#host.context, rampMs);
  }

  protected get isDisposed(): boolean {
    return this.#disposed;
  }

  protected transition(next: SourceState): void {
    if (this.#state === next) return;
    this.#state = next;
    if (next === "playing") {
      this.#host.core.setSourceActive(this.id, true);
      this.#host.sourceStarted(this);
    } else if (next === "paused" || next === "stopped" || next === "error") {
      this.#host.core.setSourceActive(this.id, false);
      this.#host.sourceStopped(this);
    }
  }

  setSpatialQuality(quality: SpatialQuality): void {
    this.#chain.panner.panningModel = quality === "hrtf" ? "HRTF" : "equalpower";
  }

  setVolume(value: number, rampMs = 35): void {
    this.#assertAvailable();
    this.#volume = clamp01(value);
    automate(this.#chain.volume.gain, this.#volume, this.#host.context, rampMs);
    this.#host.core.upsertSource(
      this.id,
      this.#position,
      this.#volume,
      this.#priority,
      this.category,
    );
  }

  setPlaybackRate(value: number, rampMs = 35): void {
    this.#assertAvailable();
    const next = clamp(value, 0.25, 4);
    this.setBackendPlaybackRate(next, sanitizeRampMs(rampMs));
    this.#playbackRate = next;
  }

  setPosition(position: Vec3, rampMs = 35): void {
    this.#assertAvailable();
    this.#position = sanitizeVec3(position, this.#position);
    setPositionParams(this.#chain.panner, this.#position, this.#host.context, rampMs);
    this.#host.core.setSourcePosition(this.id, this.#position);
  }

  moveTo(position: Vec3, durationMs: number): void {
    this.setPosition(position, sanitizeRampMs(durationMs));
  }

  setOrientation(orientation: Vec3, rampMs = 35): void {
    this.#assertAvailable();
    this.#orientation = normalizeDirection(orientation, this.#orientation);
    setOrientationParams(this.#chain.panner, this.#orientation, this.#host.context, rampMs);
  }

  setCone(innerAngle: number, outerAngle: number, outerGain = 0): void {
    this.#assertAvailable();
    const safeInner = clamp(innerAngle, 0, 360);
    this.#chain.panner.coneInnerAngle = safeInner;
    this.#chain.panner.coneOuterAngle = clamp(outerAngle, safeInner, 360);
    this.#chain.panner.coneOuterGain = clamp01(outerGain);
  }

  setOcclusion(value: number, rampMs = 80): void {
    this.#assertAvailable();
    this.#occlusion = clamp01(value);
    const cutoff = 20_000 * Math.pow(700 / 20_000, this.#occlusion);
    const directGain = 1 - this.#occlusion * 0.55;
    automate(this.#chain.occlusionFilter.frequency, cutoff, this.#host.context, rampMs);
    automate(this.#chain.occlusionGain.gain, directGain, this.#host.context, rampMs);
    this.#applyWet(rampMs);
  }

  setRoomAmount(value: number, rampMs = 80): void {
    this.#assertAvailable();
    this.#roomAmount = clamp01(value);
    this.#applyWet(rampMs);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.disposeBackend();
    for (const node of Object.values(this.#chain)) node.disconnect();
    this.#host.core.removeSource(this.id);
    this.#host.sourceDisposed(this);
    this.#state = "disposed";
  }

  protected setInitialState(state: SourceState): void {
    this.#state = state;
  }

  protected reportError(error: unknown): void {
    this.transition("error");
    const message = error instanceof Error ? error.message : String(error);
    this.#host.diagnostics.error("source.error", message, { sourceId: this.id });
  }

  protected fail(error: unknown): never {
    this.reportError(error);
    throw error;
  }

  #applyWet(rampMs: number): void {
    const wet = clamp01(this.#roomAmount * (1 + this.#occlusion * 0.35));
    automate(this.#chain.wet.gain, wet, this.#host.context, rampMs);
    automate(this.#chain.dry.gain, 1, this.#host.context, rampMs);
  }

  #assertAvailable(): void {
    if (this.#disposed) throw new Error(`Sound source ${this.id} has been disposed`);
  }
}

export class BufferSoundHandle extends BaseSoundHandle {
  readonly #buffer: AudioBuffer;
  readonly #loop: boolean;
  readonly #fadeInMs: number;
  #node: AudioBufferSourceNode | undefined;
  #startedAt = 0;
  #offset = 0;
  #generation = 0;

  constructor(host: SourceHost, id: string, buffer: AudioBuffer, options: PlayOptions) {
    super(host, id, options);
    this.#buffer = buffer;
    this.#loop = options.loop ?? false;
    this.#fadeInMs = sanitizeRampMs(options.fadeInMs ?? 0);
    this.setInitialState("stopped");
  }

  get duration(): number {
    return this.#buffer.duration;
  }

  async play(): Promise<void> {
    if (this.isDisposed) throw new Error(`Sound source ${this.id} has been disposed`);
    if (this.state === "playing") return;
    await this.host.resume();
    const targetVolume = this.currentVolume;
    if (this.#fadeInMs > 0) this.rampOutput(0, 0);
    this.#startNode(this.#offset);
    this.transition("playing");
    if (this.#fadeInMs > 0) this.rampOutput(targetVolume, this.#fadeInMs);
  }

  pause(): void {
    if (this.state !== "playing" || !this.#node) return;
    this.#offset = this.#currentOffset();
    this.#generation += 1;
    try {
      this.#node.stop();
    } catch {
      // The node may already have ended between the state check and stop().
    }
    this.#node.disconnect();
    this.#node = undefined;
    this.transition("paused");
  }

  async stop(fadeOutMs = 0): Promise<void> {
    if (this.state === "disposed" || this.state === "stopped") return;
    const duration = sanitizeRampMs(fadeOutMs);
    const node = this.#node;
    const previousVolume = this.currentVolume;
    if (node && duration > 0) {
      this.rampOutput(0, duration);
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, duration));
    }
    if (this.isDisposed) return;
    this.#generation += 1;
    if (node) {
      try {
        node.stop();
      } catch {
        // Already ended.
      }
      node.disconnect();
    }
    this.#node = undefined;
    this.#offset = 0;
    this.transition("stopped");
    if (duration > 0 && !this.isDisposed) this.rampOutput(previousVolume, 0);
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.play();
  }

  protected setBackendPlaybackRate(value: number, rampMs: number): void {
    if (!this.#node) return;
    if (this.state === "playing") {
      this.#offset = this.#currentOffset();
      this.#startedAt = this.host.context.currentTime;
    }
    automate(this.#node.playbackRate, value, this.host.context, rampMs);
  }

  protected disposeBackend(): void {
    this.#generation += 1;
    if (this.#node) {
      try {
        this.#node.stop();
      } catch {
        // Already ended.
      }
      this.#node.disconnect();
      this.#node = undefined;
    }
  }

  #startNode(offset: number): void {
    const node = this.host.context.createBufferSource();
    node.buffer = this.#buffer;
    node.loop = this.#loop;
    node.playbackRate.value = this.playbackRate;
    node.connect(this.input);
    const generation = ++this.#generation;
    node.addEventListener(
      "ended",
      () => {
        if (generation !== this.#generation || this.#loop || this.state !== "playing") return;
        node.disconnect();
        this.#node = undefined;
        this.#offset = 0;
        this.transition("stopped");
      },
      { once: true },
    );
    this.#node = node;
    this.#startedAt = this.host.context.currentTime;
    const safeOffset = this.#buffer.duration > 0 ? offset % this.#buffer.duration : 0;
    node.start(0, safeOffset);
  }

  #currentOffset(): number {
    const elapsed = (this.host.context.currentTime - this.#startedAt) * this.playbackRate;
    const offset = this.#offset + Math.max(0, elapsed);
    if (this.#loop && this.#buffer.duration > 0) return offset % this.#buffer.duration;
    return Math.min(offset, this.#buffer.duration);
  }
}

export class StreamSoundHandle extends BaseSoundHandle {
  #element: HTMLAudioElement | undefined;
  #mediaNode: MediaElementAudioSourceNode | undefined;
  readonly #fadeInMs: number;
  readonly #ended: () => void;
  readonly #errored: () => void;

  constructor(host: SourceHost, id: string, url: string, options: PlayOptions) {
    super(host, id, options);
    this.#fadeInMs = sanitizeRampMs(options.fadeInMs ?? 0);
    this.#ended = () => {
      const element = this.#element;
      if (!element) return;
      try {
        element.currentTime = 0;
      } catch {
        // Some streaming backends do not expose a seekable timeline.
      }
      this.transition("stopped");
    };
    this.#errored = () => {
      const code = this.#element?.error?.code ?? 0;
      this.reportError(new Error(`Streaming audio failed (media error ${code})`));
    };

    try {
      const element = new Audio();
      this.#element = element;
      element.crossOrigin = "anonymous";
      element.preload = "auto";
      element.src = url;
      element.loop = options.loop ?? false;
      element.playbackRate = this.playbackRate;
      const mediaNode = host.context.createMediaElementSource(element);
      this.#mediaNode = mediaNode;
      mediaNode.connect(this.input);
      element.addEventListener("ended", this.#ended);
      element.addEventListener("error", this.#errored);
      this.setInitialState("stopped");
    } catch (error) {
      this.dispose();
      throw new Error(`Unable to create streaming source for ${url}`, { cause: error });
    }
  }

  get duration(): number {
    const duration = this.#element?.duration;
    return Number.isFinite(duration) ? (duration ?? 0) : 0;
  }

  async play(): Promise<void> {
    if (this.isDisposed) throw new Error(`Sound source ${this.id} has been disposed`);
    if (this.state === "playing") return;
    const element = this.#element;
    if (!element) throw new Error(`Streaming backend for ${this.id} is unavailable`);
    await this.host.resume();
    const targetVolume = this.currentVolume;
    if (this.#fadeInMs > 0) this.rampOutput(0, 0);
    try {
      await element.play();
      this.transition("playing");
      if (this.#fadeInMs > 0) this.rampOutput(targetVolume, this.#fadeInMs);
    } catch (error) {
      this.fail(error);
    }
  }

  pause(): void {
    if (this.state !== "playing") return;
    this.#element?.pause();
    this.transition("paused");
  }

  async stop(fadeOutMs = 0): Promise<void> {
    if (this.state === "disposed" || this.state === "stopped") return;
    const duration = sanitizeRampMs(fadeOutMs);
    const previousVolume = this.currentVolume;
    if (duration > 0) {
      this.rampOutput(0, duration);
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, duration));
    }
    if (this.isDisposed) return;
    const element = this.#element;
    element?.pause();
    if (element) {
      try {
        element.currentTime = 0;
      } catch {
        // Metadata may not be loaded yet.
      }
    }
    this.transition("stopped");
    if (duration > 0 && !this.isDisposed) this.rampOutput(previousVolume, 0);
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.play();
  }

  protected setBackendPlaybackRate(value: number): void {
    if (this.#element) this.#element.playbackRate = value;
  }

  protected disposeBackend(): void {
    const element = this.#element;
    if (element) {
      element.pause();
      element.removeEventListener("ended", this.#ended);
      element.removeEventListener("error", this.#errored);
      element.removeAttribute("src");
      element.load();
      this.#element = undefined;
    }
    this.#mediaNode?.disconnect();
    this.#mediaNode = undefined;
  }
}
