import type { DiagnosticEvent } from "./types.js";

export class Diagnostics extends EventTarget {
  readonly #events: DiagnosticEvent[] = [];
  readonly #limit: number;
  readonly #codeCounts = new Map<string, number>();
  #infoCount = 0;
  #warningCount = 0;
  #errorCount = 0;

  constructor(limit = 200) {
    super();
    this.#limit = limit;
  }

  get events(): readonly DiagnosticEvent[] {
    return this.#events;
  }

  get infoCount(): number {
    return this.#infoCount;
  }

  get warningCount(): number {
    return this.#warningCount;
  }

  get errorCount(): number {
    return this.#errorCount;
  }

  count(code: string): number {
    return this.#codeCounts.get(code) ?? 0;
  }

  info(code: string, message: string, details?: Readonly<Record<string, unknown>>): void {
    this.#push("info", code, message, details);
  }

  warning(code: string, message: string, details?: Readonly<Record<string, unknown>>): void {
    this.#push("warning", code, message, details);
  }

  error(code: string, message: string, details?: Readonly<Record<string, unknown>>): void {
    this.#push("error", code, message, details);
  }

  clear(): void {
    this.#events.length = 0;
    this.#codeCounts.clear();
    this.#infoCount = 0;
    this.#warningCount = 0;
    this.#errorCount = 0;
  }

  #push(
    level: DiagnosticEvent["level"],
    code: string,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ): void {
    const event: DiagnosticEvent = {
      time: typeof performance === "undefined" ? Date.now() : performance.now(),
      level,
      code,
      message,
      ...(details ? { details } : {}),
    };
    if (level === "info") this.#infoCount += 1;
    else if (level === "warning") this.#warningCount += 1;
    else this.#errorCount += 1;
    this.#codeCounts.set(code, (this.#codeCounts.get(code) ?? 0) + 1);
    this.#events.push(event);
    if (this.#events.length > this.#limit) this.#events.shift();
    this.dispatchEvent(new CustomEvent<DiagnosticEvent>("diagnostic", { detail: event }));
  }
}
