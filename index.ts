import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { HttpRangeReader, ZipReader } from "@zip.js/zip.js"
import process from "node:process";
import { Octokit } from "octokit";
import * as pathPosix from "node:path/posix";

export interface AppOptions {
    githubToken?: string;
    githubAPIURL?: string;
    allowedModulePrefixes?: string | string[];
}

export interface App {
    fetch(request: Request): Promise<Response>;
}

interface Info {
    Version: string;
    Time: string;
}

type UnghccGetReposOwnerRepoReleasesLatest = {
    release: {
        id: number
        tag: string
        author: string
        name: string
        draft: boolean
        prerelease: boolean
        createdAt: string
        publishedAt: string
        markdown: string
        html: string
        assets: {
            contentType: string
            size: number
            createdAt: string
            updatedAt: string
            downloadCount: number
            downloadUrl: string
        }[]
    }
}

type UnghccGetReposOwnerRepoReleases = {
    releases: {
        id: number
        tag: string
        author: string
        name: string
        draft: boolean
        prerelease: boolean
        createdAt: string
        publishedAt: string
        markdown: string
        html: string
        assets: {
            contentType: string
            size: number
            createdAt: string
            updatedAt: string
            downloadCount: number
            downloadUrl: string
        }[]
    }[]
}

class UnghccOctolike {
    constructor() { }

    // deno-lint-ignore no-explicit-any
    async #fetchGetOKJSON<T = any>(url: string): Promise<T> {
        const response = await fetch(new URL(url, "https://ungh.cc/"));
        if (!response.ok) {
            throw new Error(`Fetch '${url}' failed with status ${response.status} ${response.statusText}`);
        }
        const contentType = response.headers.get("Content-Type") ?? "";
        if (contentType !== "application/json") {
            throw new Error(`Expected 'Content-Type' to be 'application/json', but got '${contentType}' instead`);
        }
        const json = await response.json();
        return json as T;
    }

    async latestReleaseTagName(owner: string, repo: string): Promise<string> {
        const data = await this.#fetchGetOKJSON<UnghccGetReposOwnerRepoReleasesLatest>(`/repos/${owner}/${repo}/releases/latest`);
        return data.release.tag;
    }

    async allReleaseTagNames(owner: string, repo: string): Promise<string[]> {
        const data = await this.#fetchGetOKJSON<UnghccGetReposOwnerRepoReleases>(`/repos/${owner}/${repo}/releases`);
        return data.releases.map(release => release.tag);
    }

    // deno-lint-ignore require-await
    async releaseAssetURL(owner: string, repo: string, tagName: string, assetName: string): Promise<string> {
        return `https://github.com/${owner}/${repo}/releases/download/${tagName}/${assetName}`;
    }

    async releaseCreatedAt(owner: string, repo: string, tagName: string): Promise<string> {
        const releases = await this.#fetchGetOKJSON<UnghccGetReposOwnerRepoReleases>(`/repos/${owner}/${repo}/releases`);
        const release = releases.releases.find(release => release.tag === tagName);
        if (release == null) {
            throw new DOMException(`Release with tag '${tagName}' not found`, "NotFoundError");
        }
        return release.createdAt;
    }
}

class OctokitOctolike {
    #octokit: Octokit;
    constructor(githubToken: string | undefined, githubAPIURL: URL) {
        this.#octokit = new Octokit({
            auth: githubToken,
            baseUrl: githubAPIURL.toString()
        });
    }

    async latestReleaseTagName(owner: string, repo: string): Promise<string> {
        const response = await this.#octokit.rest.repos.getLatestRelease({ owner, repo });
        return response.data.tag_name;
    }

    async allReleaseTagNames(owner: string, repo: string): Promise<string[]> {
        return await this.#octokit.paginate(this.#octokit.rest.repos.listReleases, { owner, repo }, (response) => response.data.map(release => release.tag_name));
    }

    async releaseAssetURL(owner: string, repo: string, tagName: string, assetName: string): Promise<string> {
        const response = await this.#octokit.rest.repos.getReleaseByTag({ owner, repo, tag: tagName })
        const asset = response.data.assets.find(asset => asset.name === assetName)
        if (asset == null) {
            throw new DOMException(`Asset '${assetName}' not found in release '${tagName}'`, "NotFoundError")
        }
        return asset.browser_download_url;
    }

    async releaseCreatedAt(owner: string, repo: string, tagName: string): Promise<string> {
        const response = await this.#octokit.rest.repos.getReleaseByTag({ owner, repo, tag: tagName })
        return response.data.created_at;
    }
}

export default function createApp(options: AppOptions = {}): App {
    const githubToken = options.githubToken ?? process.env.GITHUB_TOKEN;
    const githubAPIURL = (() => {
        const string = options.githubAPIURL ?? process.env.GITHUB_API_URL ?? "https://api.github.com";
        const url = new URL(string);
        if (!["http:", "https:"].includes(url.protocol)) {
            throw new TypeError(`'${url}' is not an HTTP or HTTPS URL`);
        }
        return url
    })()
    const octolike = (() => {
        if (githubToken == null && githubAPIURL.toString() === "https://api.github.com/") {
            return new UnghccOctolike();
        } else {
            return new OctokitOctolike(githubToken, githubAPIURL);
        }
    })()
    const isAllowedModule = (() => {
        if (options.allowedModulePrefixes == null) {
            return () => true;
        }
        const prefixes = Array.isArray(options.allowedModulePrefixes) ? options.allowedModulePrefixes : [options.allowedModulePrefixes];
        return (module: string) => {
            for (const prefix of prefixes) {
                if (module.startsWith(prefix)) {
                    return true;
                }
            }
            return false;
        }
    })()

    const app = new Elysia()
        .use(cors({ methods: "GET" }))
        .group("/:owner/:repo/:module", app => app
            .group("/@v", app => app
                .get("/list", async ({ params }) => {
                    const { owner, repo, module } = params
                    if (!isAllowedModule(module)) {
                        throw new DOMException(`Module '${module}' is not allowed`, "NotAllowedError");
                    }
                    const tagNames = await octolike.allReleaseTagNames(owner, repo);
                    return tagNames.join("\n");
                })
                .get("/:raw", async ({ params, redirect }) => {
                    const { owner, repo, module, raw } = params
                    if (!isAllowedModule(module)) {
                        throw new DOMException(`Module '${module}' is not allowed`, "NotAllowedError");
                    }
                    const match = raw.match(/\.(info|mod|zip)$/)
                    if (match == null) {
                        throw new Error("TODO");
                    }
                    const version = raw.slice(0, -match[0].length)
                    const mode = match[1] as "info" | "mod" | "zip"
                    if (mode === "info") {
                        const createdAt = await octolike.releaseCreatedAt(owner, repo, version);
                        return {
                            Time: createdAt,
                            Version: version
                        } satisfies Info;
                    } else if (mode === "mod") {
                        const moduleBase = pathPosix.basename(module);
                        const url = await octolike.releaseAssetURL(owner, repo, version, `${moduleBase}.zip`);
                        const httpRangeReader = new HttpRangeReader(url);
                        const zipReader = new ZipReader(httpRangeReader);
                        const entry = await (async () => {
                            for await (const entry of zipReader.getEntriesGenerator()) {
                                if (entry.directory) {
                                    continue;
                                }
                                if (entry.filename === `${module}@${version}/go.mod`) {
                                    return entry;
                                }
                            }
                            return null
                        })()
                        if (entry == null) {
                            throw new DOMException(`'${`${module}@${version}/go.mod`} not found in the zip archive`, "NotFoundError");
                        }
                        const buffer = await entry.arrayBuffer()
                        const text = new TextDecoder().decode(buffer);
                        return text;
                    } else if (mode === "zip") {
                        const moduleBase = pathPosix.basename(module);
                        const url = await octolike.releaseAssetURL(owner, repo, version, `${moduleBase}.zip`);
                        return redirect(url, 302);
                    } else {
                        throw new DOMException(`Invalid mode '${mode}'`, "InvalidStateError")
                    }
                })
            )
            .get("/@latest", async ({ params }) => {
                const { owner, repo, module } = params
                if (!isAllowedModule(module)) {
                    throw new DOMException(`Module '${module}' is not allowed`, "NotAllowedError");
                }
                const latestTag = await octolike.latestReleaseTagName(owner, repo);
                return latestTag;
            })
        )
    return {
        fetch(request) {
            const result = app.fetch(request);
            if (result instanceof Promise) {
                return result;
            } else {
                return Promise.resolve(result);
            }
        }
    };
}