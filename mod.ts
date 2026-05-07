import { Octokit } from "octokit";
import { HttpRangeReader, ZipReader } from "@zip.js/zip.js";
import { URLPatternList } from "./url_pattern_list.ts";
import { type } from "arktype";
import AllowDeny from "./allow_deny.ts";
import * as latest from "./latest.ts"
import * as vList from "./v_list.ts"
import * as vInfo from "./v_info.ts"
import * as vMod from "./v_mod.ts"
import * as vZip from "./v_zip.ts"
import { Matcher } from "./matcher.ts";

export interface Options {
    octokit: Octokit,
    allow?: readonly (string | Matcher)[]
    deny?: readonly (string | Matcher)[]
}

const patterns = new URLPatternList([
    new URLPattern({ pathname: "/:module*/@v/list" }),
    new URLPattern({ pathname: "/:module*/@v/:version.info" }),
    new URLPattern({ pathname: "/:module*/@v/:version.mod" }),
    new URLPattern({ pathname: "/:module*/@v/:version.zip" }),
    handlersLatest.pattern,
])

const handlers = new Map([
    [handlersLatest.pattern, handlersLatest],
])

export default class App {
    #octokit: Octokit;
    #moduleAllowDeny: AllowDeny;
    constructor(options: Options) {
        const {
            octokit,
            allow = [],
            deny = []
        } = options;
        this.#octokit = octokit;
        this.#moduleAllowDeny = new AllowDeny({ allow, deny });
    }

    async fetch(request: Request): Promise<Response> {
        const result = patterns.exec(request.url);
        if (result == null) {
            return new Response(null, { status: 404 });
        }
        const handler = handlers.get(result.pattern);
        if (handler == null) {
            throw new Error();
        }
        if (request.method === "GET") {
            return await handler.GET(request, result, this.#octokit);
        } else {
            return new Response(null, { status: 405 });
        }
    }

    async #versionToTagName(
        owner: string,
        repo: string,
        subdir: string | null,
        version: string,
    ): Promise<string> {
        if (subdir != null) {
            const tagNameAndCreatedAt = await this.#octolike
                .allReleaseTagNameAndCreatedAt(owner, repo);
            const tagNames = tagNameAndCreatedAt.map((x) => x.tagName);
            const tagName = tagNames.find((tagName) =>
                tagName === `${subdir}/${version}`
            );
            if (tagName == null) {
                throw new DOMException(
                    `Tag name '${subdir}/${version}' not found in repository '${owner}/${repo}'`,
                    "NotFoundError",
                );
            }
            return tagName;
        } else {
            return version;
        }
    }

    async #getFilteredReleaseTagNameAndCreatedAt(
        owner: string,
        repo: string,
        subdir: string | null,
    ): Promise<{ tagName: string; createdAt: string }[]> {
        const tagNameAndCreatedAt = await this.#octolike
            .allReleaseTagNameAndCreatedAt(owner, repo);
        if (subdir != null) {
            return tagNameAndCreatedAt.filter((x) =>
                x.tagName.startsWith(subdir + "/")
            );
        } else {
            return tagNameAndCreatedAt;
        }
    }

    async #fetchList(
        owner: string,
        repo: string,
        subdir: string | null,
    ): Promise<Response> {
        const filteredTagNameAndCreatedAt = await this
            .#getFilteredReleaseTagNameAndCreatedAt(owner, repo, subdir);
        const tagNames = filteredTagNameAndCreatedAt.map((x) => x.tagName);
        return new Response(tagNames.join("\n"), {
            headers: {
                "Content-Type": "text/plain; charset=UTF-8",
            },
        });
    }

    async #fetchInfo(
        owner: string,
        repo: string,
        subdir: string | null,
        version: string,
    ): Promise<Response> {
        const tagName = await this.#versionToTagName(owner, repo, subdir, version);
        const createdAt = await this.#octolike.releaseCreatedAt(
            owner,
            repo,
            tagName,
        );
        const info = {
            Version: version,
            Time: createdAt,
        } satisfies Info;
        return Response.json(info);
    }

    async #fetchMod(
        owner: string,
        repo: string,
        module: string,
        subdir: string | null,
        version: string,
    ): Promise<Response> {
        const tagName = await this.#versionToTagName(owner, repo, subdir, version);
        const moduleLastComponent = module.split("/").at(-1)!;
        const assetName = `${moduleLastComponent}.zip`;
        const assetURL = await this.#octolike.releaseAssetURL(
            owner,
            repo,
            tagName,
            assetName,
        );
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
                throw new DOMException(
                    `'${assetName}' in release '${tagName}' does not contain '${goModPath}'`,
                    "NotFoundError",
                );
            }
            return await entry.arrayBuffer();
        })();
        return new Response(buffer, {
            headers: {
                "Content-Type": "text/plain; charset=UTF-8",
            },
        });
    }

    async #fetchZip(
        owner: string,
        repo: string,
        module: string,
        subdir: string | null,
        version: string,
    ): Promise<Response> {
        const tagName = await this.#versionToTagName(owner, repo, subdir, version);
        const moduleLastComponent = module.split("/").at(-1)!;
        const assetName = `${moduleLastComponent}.zip`;
        const assetURL = await this.#octolike.releaseAssetURL(
            owner,
            repo,
            tagName,
            assetName,
        );
        return Response.redirect(assetURL);
    }

    async #fetchLatest(
        owner: string,
        repo: string,
        subdir: string | null,
    ): Promise<Response> {
        if (subdir == null) {
            const { tagName, createdAt } = await this.#octolike
                .latestReleaseTagNameAndCreatedAt(owner, repo);
            const info = {
                Version: tagName,
                Time: createdAt,
            } satisfies Info;
            return Response.json(info);
        }
        const tagNameAndCreatedAt = await this
            .#getFilteredReleaseTagNameAndCreatedAt(owner, repo, subdir);
        if (tagNameAndCreatedAt.length === 0) {
            return new Response(null, { status: 404 });
        }
        const { tagName, createdAt } = tagNameAndCreatedAt[0];
        const info = {
            Version: tagName,
            Time: createdAt,
        } satisfies Info;
        return Response.json(info);
    }
}
