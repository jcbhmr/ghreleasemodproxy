import {
    compare,
} from "./semver.ts"

const v1 = "v1.0.0+metadata-dash"
const v2 = "v1.0.0+metadata-dash1"

Deno.bench("compare", () => {
    if (compare(v1, v2) !== 0) {
        throw new Error("bad compare")
    }
})
