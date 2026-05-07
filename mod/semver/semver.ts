export interface Parsed {
    major: string;
    minor: string;
    patch: string;
    short: string;
    prerelease: string;
    build: string;
}

export function isValid(v: string): boolean {
    const result = parse(v);
    return result != null;
}

export function canonical(v: string): string {
    const p = parse(v);
    if (p == null) {
        return "";
    }
    if (p.build !== "") {
        return v.slice(0, v.length - p.build.length)
    }
    if (p.short !== "") {
        return v + p.short
    }
    return v
}

export function major(v: string): string {
    const pv = parse(v);
    if (pv == null) {
        return "";
    }
    return v.slice(0, 1 + pv.major.length);
}

export function majorMinor(v: string): string {
    const pv = parse(v);
    if (pv == null) {
        return "";
    }
    const i = 1 + pv.major.length;
    const j = i + 1 + pv.minor.length;
    if (j <= v.length && v[i] === "." && v.slice(i + 1, j) === pv.minor) {
        return v.slice(0, j);
    }
    return v.slice(0, i) + "." + pv.minor;
}

export function prerelease(v: string): string {
    const pv = parse(v);
    if (pv == null) {
        return "";
    }
    return pv.prerelease;
}

export function build(v: string): string {
    const pv = parse(v);
    if (pv == null) {
        return "";
    }
    return pv.build;
}

export function compare(v: string, w: string): -1 | 0 | 1 {
    const pv = parse(v);
    const pw = parse(w);
    if (pv == null && pw == null) {
        return 0
    }
    if (pv == null) {
        return -1;
    }
    if (pw == null) {
        return 1;
    }
    const c1 = compareInt(pv.major, pw.major);
    if (c1 !== 0) {
        return c1;
    }
    const c2 = compareInt(pv.minor, pw.minor);
    if (c2 !== 0) {
        return c2;
    }
    const c3 = compareInt(pv.patch, pw.patch);
    if (c3 !== 0) {
        return c3;
    }
    return comparePrerelease(pv.prerelease, pw.prerelease);
}

export function max(v: string, w: string): string {
    v = canonical(v);
    w = canonical(w);
    if (compare(v, w) > 0) {
        return v;
    }
    return w;
}

export class ByVersion {
    readonly value: string[];
    constructor(value: string[]) {
        this.value = value;
    }
    len(): number {
        return this.value.length;
    }
    swap(i: number, j: number): void {
        [this.value[i], this.value[j]] = [this.value[j], this.value[i]];
    }
    less(i: number, j: number): boolean {
        return compareVersion(this.value[i], this.value[j]) < 0;
    }
}

export function sort(list: string[]) {
    list.sort(compareVersion)
}

export function compareVersion(v: string, w: string): -1 | 0 | 1 {
    const cmp = compare(v, w);
    if (cmp !== 0) {
        return cmp;
    }
    return v < w ? -1 : v > w ? 1 : 0;
}

export function parse(v: string): Parsed | null {
    const p = {
        major: "",
        minor: "",
        patch: "",
        short: "",
        prerelease: "",
        build: "",
    } satisfies Parsed;
    if (v === "" || v[0] !== "v") {
        return null;
    }
    const result1 = parseInt(v.slice(1));
    if (result1 == null) {
        return null;
    }
    [p.major, v] = result1;
    if (v === "") {
        p.minor = "0";
        p.patch = "0";
        p.short = ".0.0";
        return p;
    }
    if (v[0] !== ".") {
        return null;
    }
    const result2 = parseInt(v.slice(1));
    if (result2 == null) {
        return null;
    }
    [p.minor, v] = result2;
    if (v === "") {
        p.patch = "0";
        p.short = ".0";
        return p;
    }
    if (v[0] !== ".") {
        return null;
    }
    const result3 = parseInt(v.slice(1));
    if (result3 == null) {
        return null;
    }
    [p.patch, v] = result3;
    if (v.length > 0 && v[0] === "-") {
        const result = parsePrerelease(v);
        if (result == null) {
            return null;
        }
        [p.prerelease, v] = result;
    }
    if (v.length > 0 && v[0] === "+") {
        const result = parseBuild(v);
        if (result == null) {
            return null;
        }
        [p.build, v] = result;
    }
    if (v !== "") {
        return null;
    }
    return p;
}

export function parseInt(v: string): [string, string] | null {
    if (v === "") {
        return null;
    }
    if (v[0] < '0' || '9' < v[0]) {
        return null;
    }
    let i = 1;
    while (i < v.length && '0' <= v[i] && v[i] <= '9') {
        i++;
    }
    if (v[0] === '0' && i != 1) {
        return null;
    }
    return [v.slice(0, i), v.slice(i)];
}

export function parsePrerelease(v: string): [string, string] | null {
    if (v === "" || v[0] !== "-") {
        return null;
    }
    let i = 1;
    let start = 1;
    while (i < v.length && v[i] !== "+") {
        if (!isIdentChar(v[i]) && v[i] !== ".") {
            return null;
        }
        if (v[i] === ".") {
            if (start === i || isBadNum(v.slice(start, i))) {
                return null;
            }
            start = i + 1;
        }
        i++;
    }
    if (start === i || isBadNum(v.slice(start, i))) {
        return null;
    }
    return [v.slice(0, i), v.slice(i)];
}

export function parseBuild(v: string): [string, string] | null {
    if (v === "" || v[0] !== "+") {
        return null;
    }
    let i = 1;
    let start = 1;
    while (i < v.length) {
        if (!isIdentChar(v[i]) && v[i] !== ".") {
            return null;
        }
        if (v[i] === ".") {
            if (start === i) {
                return null;
            }
            start = i + 1;
        }
        i++;
    }
    if (start === i) {
        return null;
    }
    return [v.slice(0, i), v.slice(i)];
}

export function isIdentChar(c: string): boolean {
    return (
        "A" <= c && c <= "Z"
        || "a" <= c && c <= "z"
        || "0" <= c && c <= "9"
        || c === "-"
    )
}

export function isBadNum(v: string): boolean {
    let i = 0;
    while (i < v.length && "0" <= v[i] && v[i] <= "9") {
        i++;
    }
    return i === v.length && i > 1 && v[0] === "0";
}

export function isNum(v: string): boolean {
    let i = 0;
    while (i < v.length && "0" <= v[i] && v[i] <= "9") {
        i++;
    }
    return i === v.length;
}

export function compareInt(x: string, y: string): -1 | 0 | 1 {
    if (x === y) {
        return 0;
    }
    if (x.length < y.length) {
        return -1;
    }
    if (x.length > y.length) {
        return 1;
    }
    if (x < y) {
        return -1;
    } else {
        return 1;
    }
}

export function comparePrerelease(x: string, y: string): -1 | 0 | 1 {
    if (x === y) {
        return 0;
    }
    if (x === "") {
        return 1;
    }
    if (y === "") {
        return -1;
    }
    while (x !== "" && y !== "") {
        x = x.slice(1);
        y = y.slice(1);
        let dx: string;
        let dy: string;
        [dx, x] = nextIdent(x);
        [dy, y] = nextIdent(y);
        if (dx !== dy) {
            const ix = isNum(dx)
            const iy = isNum(dy);
            if (ix !== iy) {
                if (ix) {
                    return -1;
                } else {
                    return 1;
                }
            }
            if (ix) {
                if (dx.length < dy.length) {
                    return -1;
                }
                if (dx.length > dy.length) {
                    return 1;
                }
            }
            if (dx < dy) {
                return -1;
            } else {
                return 1;
            }
        }
    }
    if (x === "") {
        return -1
    } else {
        return 1;
    }
}

export function nextIdent(x: string): [string, string] {
    let i = 0;
    while (i < x.length && x[i] !== ".") {
        i++;
    }
    return [x.slice(0, i), x.slice(i)];
}