import { z } from "zod";

const orgsOwnerSchema = z.object({
    org: z.object({
        id: z.int(),
        name: z.string(),
        description: z.string(),
    })
})

const orgsOwnerReposSchema = z.object({
    repos: z.array(z.object({
        id: z.int(),
        name: z.string(),
        repo: z.string(),
        description: z.nullable(z.string()),
        createdAt: z.string(),
        updatedAt: z.string(),
        pushedAt: z.string(),
        stars: z.int(),
        watchers: z.int(),
        forks: z.int(),
        defaultBranch: z.string(),
    }))
})

const reposOwnerRepoBranchesSchema = z.object({
    branches: z.array(z.object({
        name: z.string(),
        commit: z.object({
            sha: z.string(),
            url: z.string(),
        }),
        protected: z.boolean(),
    }))
})

const reposOwnerRepoContributorsSchema = z.object({
    contributors: z.array(z.object({
        id: z.int(),
        username: z.string(),
        contributions: z.int(),
    }))
})

const reposOwnerRepoSchema = z.object({
    repo: z.object({
        id: z.int(),
        name: z.string(),
        repo: z.string(),
        description: z.nullable(z.string()),
        createdAt: z.string(),
        updatedAt: z.string(),
        pushedAt: z.string(),
        stars: z.int(),
        watchers: z.int(),
        forks: z.int(),
        defaultBranch: z.string(),
    })
})

const reposOwnerRepoReadmeSchema = z.object({
    markdown: z.string(),
    html: z.string(),
})

const reposOwnerRepoReleasesSchema = z.object({
    releases: z.array(z.object({
        id: z.int(),
        tag: z.string(),
        author: z.string(),
        name: z.string(),
        draft: z.boolean(),
        prerelease: z.boolean(),
        createdAt: z.string(),
        publishedAt: z.string(),
        markdown: z.string(),
        html: z.string(),
        assets: z.array(z.object({
            contentType: z.string(),
            size: z.int(),
            createdAt: z.string(),
            updatedAt: z.string(),
            downloadCount: z.int(),
            downloadUrl: z.url(),
        }))
    }))
})

const reposOwnerRepoReleasesLatestSchema = z.object({
    release: z.object({
        id: z.int(),
        tag: z.string(),
        author: z.string(),
        name: z.string(),
        draft: z.boolean(),
        prerelease: z.boolean(),
        createdAt: z.string(),
        publishedAt: z.string(),
        markdown: z.string(),
        html: z.string(),
        assets: z.array(z.object({
            contentType: z.string(),
            size: z.int(),
            createdAt: z.string(),
            updatedAt: z.string(),
            downloadCount: z.int(),
            downloadUrl: z.url(),
        }))
    })
})

const starsReposSchema = z.object({
    totalStars: z.int(),
    stars: z.record(z.string(), z.int())
})

const usersNameSchema = z.object({
    user: z.object({
        id: z.int(),
        username: z.string(),
        name: z.string(),
        twitter: z.optional(z.string()),
        avatar: z.url(),
    })
})

const usersNameRepos = z.object({
    repos: z.array(z.object({
        id: z.int(),
        name: z.string(),
        repo: z.string(),
        description: z.nullable(z.string()),
        createdAt: z.string(),
        updatedAt: z.string(),
        pushedAt: z.string(),
        stars: z.int(),
        watchers: z.int(),
        forks: z.int(),
        defaultBranch: z.string(),
    }))
})

const usersFindQuerySchema = z.object({
    user: z.object({
        id: z.int(),
        username: z.string(),
        avatar: z.url(),
    })
})

const errorSchema = z.object({
    error: z.boolean(),
    status: z.int(),
    statusText: z.string(),
    message: z.string(),
})

// deno-lint-ignore no-empty-interface
export interface UnghOptions {
    // Nothing.
}

export default class Ungh {
    #baseURL = new URL("https://ungh.cc/") as Readonly<URL>;
    constructor(_options: UnghOptions = {}) {
        // Nothing.
    }

    async #myFetch<T extends z.ZodTypeAny>(route: string | URL, schema: T): Promise<z.infer<T>> {
        const url = new URL(route, this.#baseURL);
        const response = await fetch(url);
        const contentType = response.headers.get("Content-Type") ?? "";
        if (contentType !== "application/json") {
            throw new DOMException(`Fetch '${response.url}' with status ${response.status} ${response.statusText} returned unexpected content type '${contentType}', expected '${"application/json"}'`, "FetchError");
        }
        const json = await response.json();
        if (response.status === 200) {
            return schema.parse(json);
        } else {
            const error = errorSchema.parse(json);
            throw new DOMException(`Fetch '${response.url}' failed with status ${response.status} ${response.statusText}: ${error.message}`, "FetchError");
        }
    }

    orgsOwner(owner: string): Promise<z.infer<typeof orgsOwnerSchema>> {
        return this.#myFetch(`orgs/${encodeURIComponent(owner)}`, orgsOwnerSchema);
    }

    orgsOwnerRepos(owner: string): Promise<z.infer<typeof orgsOwnerReposSchema>> {
        return this.#myFetch(`orgs/${encodeURIComponent(owner)}/repos`, orgsOwnerReposSchema);
    }

    reposOwnerRepoBranches(owner: string, repo: string): Promise<z.infer<typeof reposOwnerRepoBranchesSchema>> {
        return this.#myFetch(`repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`, reposOwnerRepoBranchesSchema);
    }

    reposOwnerRepoContributors(owner: string, repo: string): Promise<z.infer<typeof reposOwnerRepoContributorsSchema>> {
        return this.#myFetch(`repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contributors`, reposOwnerRepoContributorsSchema);
    }

    reposOwnerRepo(owner: string, repo: string): Promise<z.infer<typeof reposOwnerRepoSchema>> {
        return this.#myFetch(`repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, reposOwnerRepoSchema);
    }

    reposOwnerRepoReadme(owner: string, repo: string): Promise<z.infer<typeof reposOwnerRepoReadmeSchema>> {
        return this.#myFetch(`repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`, reposOwnerRepoReadmeSchema);
    }

    reposOwnerRepoReleases(owner: string, repo: string): Promise<z.infer<typeof reposOwnerRepoReleasesSchema>> {
        return this.#myFetch(`repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`, reposOwnerRepoReleasesSchema);
    }

    reposOwnerRepoReleasesLatest(owner: string, repo: string): Promise<z.infer<typeof reposOwnerRepoReleasesLatestSchema>> {
        return this.#myFetch(`repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`, reposOwnerRepoReleasesLatestSchema);
    }

    async starsRepos(repos: string): Promise<z.infer<typeof starsReposSchema>> {
        // Like `encodeURIComponent`, but doesn't encode `/` into `%2F`.
        const reposEncoded = repos.replaceAll(/[^A-Za-z0-9\-._~\/]/gu, (codePointString) => {
            const codePoint = codePointString.codePointAt(0)!;
            const hex = codePoint.toString(16).toUpperCase().padStart(2, "0");
            return `%${hex}`;
        });
        return await this.#myFetch(`stars/${reposEncoded}`, starsReposSchema);
    }

    usersName(name: string): Promise<z.infer<typeof usersNameSchema>> {
        return this.#myFetch(`users/${encodeURIComponent(name)}`, usersNameSchema);
    }

    usersNameRepos(name: string): Promise<z.infer<typeof usersNameRepos>> {
        return this.#myFetch(`users/${encodeURIComponent(name)}/repos`, usersNameRepos);
    }

    async usersFindQuery(query: string): Promise<z.infer<typeof usersFindQuerySchema>> {
        // Like `encodeURIComponent`, but doesn't encode `/` into `%2F`.
        const queryEncoded = query.replaceAll(/[^A-Za-z0-9\-._~\/]/gu, (codePointString) => {
            const codePoint = codePointString.codePointAt(0)!;
            const hex = codePoint.toString(16).toUpperCase().padStart(2, "0");
            return `%${hex}`;
        });
        return await this.#myFetch(`users/find/${queryEncoded}`, usersFindQuerySchema);
    }
}
