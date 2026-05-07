import { type } from "arktype";

export default class GitHubPersonalAccessToken {
    static #arktype = type("string").pipe.try((input) => new GitHubPersonalAccessToken(input));
    static get "~standard"() {
        return this.#arktype["~standard"];
    }

    static canParse(input: string): boolean {
        try {
            new GitHubPersonalAccessToken(input);
            return true;
        } catch (error) {
            if (error instanceof DOMException && error.name === "SyntaxError") {
                return false;
            } else {
                throw error;
            }
        }
    }

    static parse(input: string): GitHubPersonalAccessToken | null {
        try {
            return new GitHubPersonalAccessToken(input);
        } catch (error) {
            if (error instanceof DOMException && error.name === "SyntaxError") {
                return null;
            } else {
                throw error;
            }
        }
    }

    #type: "classic" | "fine-grained";
    #value: string;
    constructor(input: string) {
        if (/^ghp_[a-zA-Z0-9]{36}$/.test(input)) {
            this.#type = "classic";
            this.#value = input;
        } else if (/^github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}$/.test(input)) {
            this.#type = "fine-grained";
            this.#value = input;
        } else {
            throw new DOMException(`${input} is not a GitHub personal access token`, "SyntaxError");
        }
    }

    get type(): "classic" | "fine-grained" {
        return this.#type;
    }

    toString(): string {
        return this.#value;
    }

    toJSON(): string {
        return this.toString();
    }
}
