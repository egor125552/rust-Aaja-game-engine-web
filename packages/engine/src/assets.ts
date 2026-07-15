import { Diagnostics } from "./diagnostics.js";

export class AssetCache {
  readonly #context: AudioContext;
  readonly #diagnostics: Diagnostics;
  readonly #buffers = new Map<string, Promise<AudioBuffer>>();

  constructor(context: AudioContext, diagnostics: Diagnostics) {
    this.#context = context;
    this.#diagnostics = diagnostics;
  }

  get size(): number {
    return this.#buffers.size;
  }

  load(url: string): Promise<AudioBuffer> {
    const existing = this.#buffers.get(url);
    if (existing) return existing;
    const pending = this.#fetchAndDecode(url).catch((error: unknown) => {
      this.#buffers.delete(url);
      const message = error instanceof Error ? error.message : String(error);
      this.#diagnostics.error("asset.load.failed", message, { url });
      throw error;
    });
    this.#buffers.set(url, pending);
    return pending;
  }

  clear(url?: string): void {
    if (url) this.#buffers.delete(url);
    else this.#buffers.clear();
  }

  async #fetchAndDecode(url: string): Promise<AudioBuffer> {
    this.#diagnostics.info("asset.load.started", `Loading audio asset: ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load audio asset ${url}: HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0) throw new Error(`Audio asset ${url} is empty`);
    try {
      const buffer = await this.#context.decodeAudioData(bytes.slice(0));
      this.#diagnostics.info("asset.load.completed", `Decoded audio asset: ${url}`, {
        duration: buffer.duration,
        channels: buffer.numberOfChannels,
      });
      return buffer;
    } catch (error) {
      throw new Error(`Browser could not decode audio asset ${url}`, { cause: error });
    }
  }
}
