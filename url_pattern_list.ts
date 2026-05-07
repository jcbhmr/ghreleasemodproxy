export interface URLPatternListResult extends URLPatternResult {
    pattern: URLPattern
}

export class URLPatternList {
    #patternList: URLPattern[]
    constructor(patterns: Iterable<URLPattern>) {
        this.#patternList = [...patterns];
        if (this.#patternList.length === 0) {
            throw new TypeError();
        }
    }

    test(input: URLPatternInput = {}, baseURL?: string): boolean {
        for (const pattern of this.#patternList) {
            const result = pattern.test(input, baseURL);
            if (!result) {
                continue;
            }
            return true;
        }
        return false;
    }

    exec(input: URLPatternInput = {}, baseURL?: string): URLPatternListResult | null {
        for (const pattern of this.#patternList) {
            const result = pattern.exec(input, baseURL);
            if (!result) {
                continue;
            }
            return Object.assign(result, { pattern });
        }
        return null;
    }
}