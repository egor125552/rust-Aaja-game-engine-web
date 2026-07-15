export class Diagnostics extends EventTarget {
    #events = [];
    #limit;
    constructor(limit = 200) {
        super();
        this.#limit = limit;
    }
    get events() {
        return this.#events;
    }
    info(code, message, details) {
        this.#push("info", code, message, details);
    }
    warning(code, message, details) {
        this.#push("warning", code, message, details);
    }
    error(code, message, details) {
        this.#push("error", code, message, details);
    }
    #push(level, code, message, details) {
        const event = {
            time: typeof performance === "undefined" ? Date.now() : performance.now(),
            level,
            code,
            message,
            ...(details ? { details } : {}),
        };
        this.#events.push(event);
        if (this.#events.length > this.#limit)
            this.#events.shift();
        this.dispatchEvent(new CustomEvent("diagnostic", { detail: event }));
    }
}
//# sourceMappingURL=diagnostics.js.map