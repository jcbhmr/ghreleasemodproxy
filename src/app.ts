import process from "node:process";
import Octolike from "./octolike/index.ts";
import OctokitOctolike from "./octolike/octokit.ts";
import UnghOctolike from "./octolike/ungh.ts";
import { HttpRangeReader, ZipReader } from "@zip.js/zip.js";

export interface AppOptions {
    githubToken?: string;
    githubAPIURL?: string;
    allowedModules?: string | RegExp | (string | RegExp)[];
}

const ownerRepoPattern = new URLPattern({
    pathname: "/:owner/:repo/:module/:rest*"
})

const atVRegExp = /^@v\/(?<version>.*)\.(?<mode>[a-z]+)$/;

interface Info {
    Version: string;
    Time: string;
}

export default class App {
    #octolike: Octolike;
    #allowedModuleMatchers: { test(module: string): boolean }[] = [];
    constructor(options: AppOptions = {}) {
        const githubToken = options.githubToken ?? process.env.GITHUB_TOKEN;

        const githubAPIURL = (() => {
            const string = options.githubAPIURL ?? process.env.GITHUB_API_URL ?? "https://api.github.com/";
            const url = new URL(string) as Readonly<URL>;
            if (!(url.protocol === "https:" || url.protocol === "http:")) {
                throw new DOMException(`'${url}' is not an 'http:' or 'https:' URL`, "InvalidURL");
            }
            return url;
        })();

        const octolike = (() => {
            if (githubToken == null && githubAPIURL.toString() === "https://api.github.com/") {
                return new UnghOctolike();
            } else {
                return new OctokitOctolike(githubToken, githubAPIURL);
            }
        })()

        const allowedModuleMatchers = [options.allowedModules].flat().map(matcher => {
            if (typeof matcher === "string") {
                return { test(module: string) { return module === matcher; } };
            } else if (matcher instanceof RegExp) {
                return matcher;
            } else {
                throw new TypeError(`${typeof matcher} not 'string | RegExp'`);
            }
        })

        this.#octolike = octolike;
        this.#allowedModuleMatchers = allowedModuleMatchers;
    }

    #moduleIsAllowed(module: string): boolean {
        return this.#allowedModuleMatchers.some(matcher => matcher.test(module));
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url) as Readonly<URL>;
        const match = ownerRepoPattern.exec(url);
        if (match == null) {
            return new Response(null, { status: 404 });
        }
        const owner = match.pathname.groups.owner!;
        const repo = match.pathname.groups.repo!;
        const module = match.pathname.groups.module!;
        const rest = match.pathname.groups.rest!;
        const subdir = url.searchParams.get("subdir");
        if (!this.#moduleIsAllowed(module)) {
            return new Response(null, { status: 403 });
        }
        let atVMatch: RegExpMatchArray | null;
        if (rest === "@v/list") {
            return await this.#fetchList(owner, repo, subdir);
        } else if (rest === "@latest") {
            return await this.#fetchLatest(owner, repo, subdir);
        } else if (
            // deno-lint-ignore no-cond-assign
            atVMatch = rest.match(atVRegExp)
        ) {
            const version = atVMatch.groups!.version!;
            const mode = atVMatch.groups!.mode!;
            if (mode === "info") {
                return await this.#fetchInfo(owner, repo, subdir, version);
            } else if (mode === "mod") {
                return await this.#fetchMod(owner, repo, module, subdir, version);
            } else if (mode === "zip") {
                return await this.#fetchZip(owner, repo, module, subdir, version);
            } else {
                return new Response(null, { status: 404 });
            }
        } else {
            return new Response(null, { status: 404 });
        }
    }

    async #versionToTagName(owner: string, repo: string, subdir: string | null, version: string): Promise<string> {
        if (subdir != null) {
            const tagNameAndCreatedAt = await this.#octolike.allReleaseTagNameAndCreatedAt(owner, repo);
            const tagNames = tagNameAndCreatedAt.map(x => x.tagName);
            const tagName = tagNames.find(tagName => tagName === `${subdir}/${version}`);
            if (tagName == null) {
                throw new DOMException(`Tag name '${subdir}/${version}' not found in repository '${owner}/${repo}'`, "NotFoundError");
            }
            return tagName;
        } else {
            return version;
        }
    }

    async #getFilteredReleaseTagNameAndCreatedAt(owner: string, repo: string, subdir: string | null): Promise<{ tagName: string; createdAt: string }[]> {
        const tagNameAndCreatedAt = await this.#octolike.allReleaseTagNameAndCreatedAt(owner, repo);
        if (subdir != null) {
            return tagNameAndCreatedAt.filter(x => x.tagName.startsWith(subdir + "/"));
        } else {
            return tagNameAndCreatedAt;
        }
    }

    async #fetchList(owner: string, repo: string, subdir: string | null): Promise<Response> {
        const filteredTagNameAndCreatedAt = await this.#getFilteredReleaseTagNameAndCreatedAt(owner, repo, subdir);
        const tagNames = filteredTagNameAndCreatedAt.map(x => x.tagName);
        return new Response(tagNames.join("\n"), {
            headers: {
                "Content-Type": "text/plain; charset=UTF-8"
            }
        });
    }

    async #fetchInfo(owner: string, repo: string, subdir: string | null, version: string): Promise<Response> {
        const tagName = await this.#versionToTagName(owner, repo, subdir, version);
        const createdAt = await this.#octolike.releaseCreatedAt(owner, repo, tagName);
        const info = {
            Version: version,
            Time: createdAt,
        } satisfies Info;
        return Response.json(info);
    }

    async #fetchMod(owner: string, repo: string, module: string, subdir: string | null, version: string): Promise<Response> {
        const tagName = await this.#versionToTagName(owner, repo, subdir, version);
        const moduleLastComponent = module.split("/").at(-1)!;
        const assetName = `${moduleLastComponent}.zip`
        const assetURL = await this.#octolike.releaseAssetURL(owner, repo, tagName, assetName);
        const goModPath = `${module}@${version}/go.mod`;
        const buffer = await (async () => {
            const reader = new HttpRangeReader(assetURL);
            const zip = new ZipReader(reader);
            const entry = await (async () => {
                for await (const entry of zip.getEntriesGenerator()) {
                    if (entry.directory) {
                        continue;
                    }
                    if (entry.filename === goModPath) {
                        return entry;
                    }
                }
                return null;
            })();
            if (entry == null) {
                throw new DOMException(`'${assetName}' in release '${tagName}' does not contain '${goModPath}'`, "NotFoundError");
            }
            return await entry.arrayBuffer();
        })();
        return new Response(buffer, {
            headers: {
                "Content-Type": "text/plain; charset=UTF-8",
            },
        });
    }

    async #fetchZip(owner: string, repo: string, module: string, subdir: string | null, version: string): Promise<Response> {
        const tagName = await this.#versionToTagName(owner, repo, subdir, version);
        const moduleLastComponent = module.split("/").at(-1)!;
        const assetName = `${moduleLastComponent}.zip`
        const assetURL = await this.#octolike.releaseAssetURL(owner, repo, tagName, assetName);
        return Response.redirect(assetURL);
    }

    async #fetchLatest(owner: string, repo: string, subdir: string | null): Promise<Response> {
        if (subdir == null) {
            const { tagName, createdAt } = await this.#octolike.latestReleaseTagNameAndCreatedAt(owner, repo);
            const info = {
                Version: tagName,
                Time: createdAt
            } satisfies Info;
            return Response.json(info);
        }
        const tagNameAndCreatedAt = await this.#getFilteredReleaseTagNameAndCreatedAt(owner, repo, subdir);
        if (tagNameAndCreatedAt.length === 0) {
            return new Response(null, { status: 404 });
        }
        const { tagName, createdAt } = tagNameAndCreatedAt[0];
        const info = {
            Version: tagName,
            Time: createdAt
        } satisfies Info;
        return Response.json(info);
    }
}