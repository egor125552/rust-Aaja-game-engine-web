import type { DiagnosticEvent } from "./types.js";
export declare class Diagnostics extends EventTarget {
    #private;
    constructor(limit?: number);
    get events(): readonly DiagnosticEvent[];
    info(code: string, message: string, details?: Readonly<Record<string, unknown>>): void;
    warning(code: string, message: string, details?: Readonly<Record<string, unknown>>): void;
    error(code: string, message: string, details?: Readonly<Record<string, unknown>>): void;
}
//# sourceMappingURL=diagnostics.d.ts.map