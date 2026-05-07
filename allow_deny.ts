import { StringEquals, MatcherList, type Matcher } from "./matcher.ts";

export interface Options {
    allow?: readonly (string | Matcher)[]
    deny?: readonly (string | Matcher)[]
    precedence?: "allow" | "deny"
    default?: "allow" | "deny"
}

export default class AllowDeny {
    #allow: MatcherList
    #deny: MatcherList
    #precedence: "allow" | "deny"
    #default: "allow" | "deny"
    constructor(options: Options) {
        const {
            allow = [],
            deny = [],
            precedence = "deny",
            default: defaultValue = "deny"
        } = options;
        this.#allow = new MatcherList(allow.map(x => typeof x === "string" ? new StringEquals(x) : x));
        this.#deny = new MatcherList(deny.map(x => typeof x === "string" ? new StringEquals(x) : x));
        this.#precedence = precedence;
        this.#default = defaultValue;
    }

    test(input: string): boolean {
        if (this.#precedence === "allow") {
            return this.#allow.test(input) || (!this.#deny.test(input) && this.#default === "allow");
        } else {
            return !this.#deny.test(input) && (this.#allow.test(input) || this.#default === "allow");
        }
    }
}
