import * as semver from "../semver.ts"
import { Tagged } from "type-fest"

export class Version {
    path: string;
    version: string;
    constructor(data: { path?: string; version?: string } = {}) {
        const { path = "", version = "" } = data;
        this.path = path;
        this.version = version;
    }

    toString(): string {
        if (this.version === "") {
            return this.path
        }
        return this.path + "@" + this.version
    }
}

export class ModuleError extends Error {
    override name = "ModuleError";
    path: string;
    version: string;
    err: Error | null
    constructor(data: { path?: string; version?: string; err?: Error } = {}) {
        const { path = "", version = "", err = null } = data;
        super();
        this.path = path;
        this.version = version;
        this.err = err
    }

    override get message(): string {
        if (this.err instanceof InvalidVersionError) {
            return `${this.path}@${this.err.version}: invalid ${noun(this.err)}: ${this.err}`
        }
        if (this.version !== "") {
            return `${this.path}@${this.version}: ${this.err}`
        }
        return `module ${this.path}: ${this.err}`
    }

    override get cause(): unknown {
        return this.err;
    }
}

export function versionError(v: Version, err: Error): Error {
    if (err instanceof ModuleError && err.path === v.path && err.version === v.version) {
        return err
    }
    return new ModuleError({
        path: v.path,
        version: v.version,
        err: err,
    })
}

export let noun: (self: InvalidVersionError) => string;
export class InvalidVersionError extends Error {
    override name = "InvalidVersionError"
    version: string;
    pseudo: boolean;
    err: Error | null;
    constructor(data: { version?: string; pseudo?: boolean; err?: Error } = {}) {
        const { version = "", pseudo = false, err = null } = data
        super()
        this.version = version
        this.pseudo = pseudo
        this.err = err
    }

    #noun(): string {
        if (this.pseudo) {
            return "pseudo-version"
        }
        return "version"
    }

    override get message(): string {
        return `${this.#noun()} ${JSON.stringify(this.version)}: ${this.err}`
    }

    override get cause(): unknown {
        return this.err
    }

    static {
        noun = (self) => self.#noun();
    }
}

export class InvalidPathError extends Error {
    override name = "InvalidPathError"
    kind: string;
    path: string;
    err: Error | null;
    constructor(data: { kind?: string; path?: string; err?: Error } = {}) {
        const { kind = "", path = "", err = null } = data
        super()
        this.kind = kind
        this.path = path;
        this.err = err
    }

    override get message(): string {
        return `malformed ${this.kind} path ${JSON.stringify(this.path)}: ${this.err}`
    }

    override get cause(): unknown {
        return this.err
    }
}

/**
 * @throws {ModuleError}
 */
export function check(path: string, version: string): void {
    try {
        checkPath(path)
    } catch (error) {
        throw error;
    }
    if (!semver.isValid(version)) {
        throw new ModuleError({
            path: path,
            err: new InvalidVersionError({
                version: version,
                err: new Error("not a semantic verseion")
            })
        })
    }
    const [, pathMajor = ""] = splitPathVersion(path) ?? []
    try {
        checkPathMajor(pathMajor)
    } catch (error) {
        throw new ModuleError({
            path: path,
            err: error as Error
        })
    }
}

export function firstPathOK(r: string): boolean {
    return (
        r === "-"
        || r === "."
        || "0" <= r && r <= "9"
        || "a" <= r && r <= "z"
    )
}

export function modPathOK(r: string): boolean {
    if (r.codePointAt(0)! < 0x80) {
        return (
            r === "-"
            || r === "."
            || r === "_"
            || r === "~"
            || "0" <= r && r <= "9"
            || "A" <= r && r <= "Z"
            || "a" <= r && r <= "z"
        )
    }
    return false;
}

export function importPathOK(r: string): boolean {
    return modPathOK(r) || r === "+"
}

export function fileNameOK(r: string): boolean {
    if (r.codePointAt(0)! < 0x80) {
        const allowed = "!#$%&()+,-.=@[]^_{}~ "
        if ("0" <= r && r <= "9" || "A" <= r && r <= "Z" || "a" <= r && r <= "z") {
            return true
        }
        return allowed.includes(r)
    }
    return /^\p{Letter}$/u.test(r)
}

/**
 * @throws {InvalidPathError}
 */
export function checkPath(path: string): void {
    try {
        checkPath2(path, modulePath)
    } catch (error) {

    }
}

export type PathKind = Tagged<number, "PathKind">
export const modulePath = 0 as PathKind
export const importPath = 1 as PathKind
export const filePath = 2 as PathKind

/**
 * @throws {Error}
 */
export function checkPath2(path: string, kind: PathKind) {
    const validUTF8 = true
    if (!validUTF8) {
        throw new Error("invalid UTF-8")
    }
    if (path === "") {
        throw new Error("empty string")
    }
    if (path[0] === "-" && kind !== filePath) {
        throw new Error("leading dash")
    }
    if (path.includes("//")) {
        throw new Error("double slash")
    }
    if (path[path.length - 1] === "/") {
        throw new Error("trailing slash")
    }
    let elemStart = 0
    for (const [i, r] of path[Symbol.iterator]().map((x, i) => [i, x] as const)) {
        if (r === "/") {
            try {
                checkElem(path.slice(elemStart, i), kind)
            } catch (error) {
                throw error
            }
            elemStart = i + 1
        }
    }
    try {
        checkElem(path.slice(elemStart), kind)
    } catch (error) {
        throw error
    }
}

/**
 * @throws {Error}
 */
export function checkElem(elem: string, kind: PathKind): void {
    if (elem === "") {
        throw new Error("empty path element")
    }
    if (elem[Symbol.iterator]().reduce((n, c) => c === "." ? n + 1 : n, 0) === elem.length) {
        throw new Error(`invalid path element ${JSON.stringify(elem)}`)
    }
    
}
