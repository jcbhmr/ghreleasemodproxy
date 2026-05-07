interface Data {}

export default class Context {
    static async from(request: Request, result: URLPatternResult): Promise<Context> {
        const url = new URL(request.url) as Readonly<URL>;
        const module 
        const searchParams = url.searchParams as Omit<URLSearchParams, "append" | "delete" | "set" | "sort">;
        const owner = searchParams.get("owner");
        if (owner == null) {
            throw new DOMException(`'owner' query parameter is required`, "RequestError");
        }
        const repo = searchParams.get("repo");
        if (repo == null) {
            throw new DOMException(`'repo' query parameter is required`, "RequestError");
        }
        const subdir = searchParams.get("subdir");
        return new Context({})
    }

    private constructor(data: Data) {}
}