import {success, failure, type Result} from "./result.js";

export function typedEntries<T extends object>(obj: T): {[K in keyof T]: [K, T[K]]}[keyof T][] {
    return Object.entries(obj) as any;
}

export function toInt(s: string, radix = 10): Result<number> {
    const n = parseInt(s, radix);
    if (Number.isNaN(n)) {
        return failure(`failed to convert '${s}' to an int`);
    }
    return success(n);
}
