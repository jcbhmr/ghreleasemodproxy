import {
    ByVersion,
    build,
    canonical,
    compare,
    isValid, major, majorMinor, sort, max, prerelease
} from "./semver.ts"
import { arrayShuffle } from "array-shuffle"

let errors: Error[];
Deno.test.beforeEach(() => {
    errors = [];
})
function error(message: string): void {
    const value = new Error(message);
    Error.captureStackTrace(value, error);
    errors.push(value);
}
Deno.test.afterEach(() => {
    if (errors.length > 0) {
        throw new AggregateError(errors, "test failed");
    }
})

const tests = [
    { in: "bad", out: "" },
    { in: "v1-alpha.beta.gamma", out: "" },
    { in: "v1-pre", out: "" },
    { in: "v1+meta", out: "" },
    { in: "v1-pre+meta", out: "" },
    { in: "v1.2-pre", out: "" },
    { in: "v1.2+meta", out: "" },
    { in: "v1.2-pre+meta", out: "" },
    { in: "v1.0.0-alpha", out: "v1.0.0-alpha" },
    { in: "v1.0.0-alpha.1", out: "v1.0.0-alpha.1" },
    { in: "v1.0.0-alpha.beta", out: "v1.0.0-alpha.beta" },
    { in: "v1.0.0-beta", out: "v1.0.0-beta" },
    { in: "v1.0.0-beta.2", out: "v1.0.0-beta.2" },
    { in: "v1.0.0-beta.11", out: "v1.0.0-beta.11" },
    { in: "v1.0.0-rc.1", out: "v1.0.0-rc.1" },
    { in: "v1", out: "v1.0.0" },
    { in: "v1.0", out: "v1.0.0" },
    { in: "v1.0.0", out: "v1.0.0" },
    { in: "v1.2", out: "v1.2.0" },
    { in: "v1.2.0", out: "v1.2.0" },
    { in: "v1.2.3-456", out: "v1.2.3-456" },
    { in: "v1.2.3-456.789", out: "v1.2.3-456.789" },
    { in: "v1.2.3-456-789", out: "v1.2.3-456-789" },
    { in: "v1.2.3-456a", out: "v1.2.3-456a" },
    { in: "v1.2.3-pre", out: "v1.2.3-pre" },
    { in: "v1.2.3-pre+meta", out: "v1.2.3-pre" },
    { in: "v1.2.3-pre.1", out: "v1.2.3-pre.1" },
    { in: "v1.2.3-zzz", out: "v1.2.3-zzz" },
    { in: "v1.2.3", out: "v1.2.3" },
    { in: "v1.2.3+meta", out: "v1.2.3" },
    { in: "v1.2.3+meta-pre", out: "v1.2.3" },
    { in: "v1.2.3+meta-pre.sha.256a", out: "v1.2.3" },
]

Deno.test("isValid", () => {
    for (const tt of tests) {
        const ok = isValid(tt.in)
        if (ok !== (tt.out !== "")) {
            error(`isValid(${JSON.stringify(tt.in)}) = ${ok}, want ${tt.out !== ""}`)
        }
    }
})

Deno.test("canonical", () => {
    for (const tt of tests) {
        const out = canonical(tt.in);
        if (out !== tt.out) {
            error(`canonical(${JSON.stringify(tt.in)}) = ${JSON.stringify(out)}, want ${JSON.stringify(tt.out)}`);
        }
    }
})

Deno.test("major", () => {
    for (const tt of tests) {
        const out = major(tt.in);
        let want = "";
        const i = tt.out.indexOf(".");
        if (i >= 0) {
            want = tt.out.slice(0, i);
        }
        if (out !== want) {
            error(`major(${JSON.stringify(tt.in)}) = ${JSON.stringify(out)}, want ${JSON.stringify(want)}`);
        }
    }
})

Deno.test("majorMinor", () => {
    for (const tt of tests) {
        const out = majorMinor(tt.in);
        let want = "";
        if (tt.out !== "") {
            want = tt.in;
            const i1 = want.indexOf("+");
            if (i1 >= 0) {
                want = want.slice(0, i1);
            }
            const i2 = want.indexOf("-");
            if (i2 >= 0) {
                want = want.slice(0, i2);
            }
            const counted = want[Symbol.iterator]().reduce((n, c) => c === "." ? n + 1 : n, 0);
            if (counted === 0) {
                want += ".0";
            } else if (counted === 2) {
                want = want.slice(0, want.lastIndexOf("."));
            }
        }
        if (out !== want) {
            error(`majorMinor(${JSON.stringify(tt.in)}) = ${JSON.stringify(out)}, want ${JSON.stringify(want)}`);
        }
    }
})

Deno.test("prerelease", () => {
    for (const tt of tests) {
        const out = prerelease(tt.in);
        let want = "";
        if (tt.out !== "") {
            const i = tt.out.indexOf("-");
            if (i >= 0) {
                want = tt.out.slice(i);
            }
        }
        if (out !== want) {
            error(`prerelease(${JSON.stringify(tt.in)}) = ${JSON.stringify(out)}, want ${JSON.stringify(want)}`);
        }
    }
})

Deno.test("build", () => {
    for (const tt of tests) {
        const out = build(tt.in);
        let want = "";
        if (tt.out !== "") {
            const i = tt.in.indexOf("+");
            if (i >= 0) {
                want = tt.in.slice(i);
            }
        }
        if (out !== want) {
            error(`build(${JSON.stringify(tt.in)}) = ${JSON.stringify(out)}, want ${JSON.stringify(want)}`);
        }
    }
})

Deno.test("compare", () => {
    for (const [i, ti] of tests.entries()) {
        for (const [j, tj] of tests.entries()) {
            const cmp = compare(ti.in, tj.in);
            let want: -1 | 0 | 1;
            if (ti.out === tj.out) {
                want = 0;
            } else if (i < j) {
                want = -1;
            } else {
                want = 1;
            }
            if (cmp !== want) {
                error(`compare(${JSON.stringify(ti.in)}, ${JSON.stringify(tj.in)}) = ${cmp}, want ${want}`);
            }
        }
    }
})

Deno.test("sort", () => {
    const versions = tests.map(test => test.in);
    arrayShuffle(versions);
    sort(versions);
    const isSorted = (() => {
        const wrapped = new ByVersion(versions);
        for (let i = 1; i < wrapped.len(); i++) {
            if (wrapped.less(i, i - 1)) {
                return false;
            }
        }
        return true;
    })()
    if (!isSorted) {
        error(`list is not sorted:\n${versions.join("\n")}`);
    }

    const golden = [
        "bad",
        "v1+meta",
        "v1-alpha.beta.gamma",
        "v1-pre",
        "v1-pre+meta",
        "v1.2+meta",
        "v1.2-pre",
        "v1.2-pre+meta",
        "v1.0.0-alpha",
        "v1.0.0-alpha.1",
        "v1.0.0-alpha.beta",
        "v1.0.0-beta",
        "v1.0.0-beta.2",
        "v1.0.0-beta.11",
        "v1.0.0-rc.1",
        "v1",
        "v1.0",
        "v1.0.0",
        "v1.2",
        "v1.2.0",
        "v1.2.3-456",
        "v1.2.3-456.789",
        "v1.2.3-456-789",
        "v1.2.3-456a",
        "v1.2.3-pre",
        "v1.2.3-pre+meta",
        "v1.2.3-pre.1",
        "v1.2.3-zzz",
        "v1.2.3",
        "v1.2.3+meta",
        "v1.2.3+meta-pre",
        "v1.2.3+meta-pre.sha.256a",
    ]
    const equal = versions.length === golden.length && versions.every((v, i) => v === golden[i]);
    if (!equal) {
        error(`list is not sorted correctly:\ngot:\n${JSON.stringify(versions, null, 2)}\nwant:\n${JSON.stringify(golden, null, 2)}`);
    }
})

Deno.test("max", () => {
    for (const [i, ti] of tests.entries()) {
        for (const [j, tj] of tests.entries()) {
            const maxValue = max(ti.in, tj.in);
            let want = canonical(ti.in);
            if (i < j) {
                want = canonical(tj.in);
            }
            if (maxValue !== want) {
                error(`max(${JSON.stringify(ti.in)}, ${JSON.stringify(tj.in)}) = ${JSON.stringify(maxValue)}, want ${JSON.stringify(want)}`);
            }
        }
    }
})