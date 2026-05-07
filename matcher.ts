export interface Matcher {
    test(input: string): boolean;
}

export class StringPrefix {
    #prefix: string;
    constructor(prefix: string) {
        this.#prefix = prefix;
    }
    test(input: string): boolean {
        return input.startsWith(this.#prefix);
    }
}

export class StringEquals {
    #target: string;
    constructor(target: string) {
        this.#target = target;
    }
    test(input: string): boolean {
        return input === this.#target;
    }
}

export class MatcherList {
    #inner: Matcher[]
    constructor(init: Iterable<Matcher>) {
        this.#inner = [...init];
    }
    test(input: string): boolean {
        return this.#inner.some((matcher) => matcher.test(input));
    }
}
