import Octolike from "./index.ts";
import Ungh from "../ungh.ts";

export default class UnghOctolike implements Octolike {
    #ungh: Ungh = new Ungh();
    constructor() { }

    async latestReleaseTagNameAndCreatedAt(owner: string, repo: string): Promise<{ tagName: string, createdAt: string }> {
        const data = await this.#ungh.reposOwnerRepoReleasesLatest(owner, repo);
        return {
            tagName: data.release.tag,
            createdAt: data.release.createdAt
        };
    }

    async allReleaseTagNameAndCreatedAt(owner: string, repo: string): Promise<{ tagName: string, createdAt: string }[]> {
        const data = await this.#ungh.reposOwnerRepoReleases(owner, repo);
        return data.releases.map(release => ({
            tagName: release.tag,
            createdAt: release.createdAt
        }));
    }

    // deno-lint-ignore require-await
    async releaseAssetURL(owner: string, repo: string, tagName: string, assetName: string): Promise<string> {
        return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/download/${encodeURIComponent(tagName)}/${encodeURIComponent(assetName)}`;
    }

    async releaseCreatedAt(owner: string, repo: string, tagName: string): Promise<string> {
        const data = await this.#ungh.reposOwnerRepoReleases(owner, repo);
        const release = data.releases.find(release => release.tag === tagName);
        if (release == null) {
            throw new DOMException(`Release '${tagName}' not found in repository '${owner}/${repo}'`, "NotFoundError");
        }
        return release.createdAt;
    }
}
