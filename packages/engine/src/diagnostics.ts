import type { DiagnosticEvent } from "./types.js";

export class Diagnostics extends EventTarget {
  readonly #events: DiagnosticEvent[] = [];
  readonly #limit: number;

  constructor(limit = 200) {
    super();
    this.#limit = limit;
  }

  get events(): readonly DiagnosticEvent[] {
    return this.#events;
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
    this.#events.push(event);
    if (this.#events.length > this.#limit) this.#events.shift();
    this.dispatchEvent(new CustomEvent<DiagnosticEvent>("diagnostic", { detail: event }));
  }
}
