import { type } from "arktype";
type({
    owner: "/^[a-zA-Z0-9-]+$/",
    repo: "/^[a-zA-Z0-9_.-]+$/",
    "subdir?": "string"
})
const Owner = type("/^[a-zA-Z0-9-]+$/");
const Repo = type("/^[a-zA-Z0-9_.-]+$/");
// const Subdir = type.string.optional();
export const SearchParams = type.instanceOf(URLSearchParams).pipe((searchParams) => {
})
export type SearchParams = typeof SearchParams.infer;

export function parse(searchParams: URLSearchParams): SearchParams {
    const owner = searchParams.get("owner");
    if (owner == null) {
        throw new DOMException(`'owner' query parameter is required`, "SyntaxError");
    }
    if (!/^[a-zA-Z0-9-]+$/.test(owner)) {
        throw new DOMException(`'owner' query parameter must be a valid GitHub username or organization name`, "SyntaxError");
    }

    const repo = searchParams.get("repo");
    if (repo == null) {
        throw new DOMException(`'repo' query parameter is required`, "SyntaxError");
    }
    const subdir = searchParams.get("subdir");

}