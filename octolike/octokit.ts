import { Octokit } from "octokit";
import Octolike from "./index.ts";

export default class OctokitOctolike implements Octolike {
    #octokit: Octokit;
    constructor(githubToken: string | undefined, githubAPIURL: URL) {
        this.#octokit = new Octokit({
            auth: githubToken,
            baseUrl: githubAPIURL.toString()
        });
    }

    async latestReleaseTagNameAndCreatedAt(owner: string, repo: string): Promise<{ tagName: string, createdAt: string }> {
        const response = await this.#octokit.rest.repos.getLatestRelease({ owner, repo });
        return {
            tagName: response.data.tag_name,
            createdAt: response.data.created_at
        };
    }

    async allReleaseTagNameAndCreatedAt(owner: string, repo: string): Promise<{ tagName: string, createdAt: string }[]> {
        return await this.#octokit.paginate(this.#octokit.rest.repos.listReleases, { owner, repo }, (response) => response.data.map(release => ({
            tagName: release.tag_name,
            createdAt: release.created_at
        })));
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