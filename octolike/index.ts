export default interface Octolike {
    latestReleaseTagNameAndCreatedAt(owner: string, repo: string): Promise<{ tagName: string, createdAt: string }>;
    allReleaseTagNameAndCreatedAt(owner: string, repo: string): Promise<{ tagName: string, createdAt: string }[]>;
    releaseAssetURL(owner: string, repo: string, tagName: string, assetName: string): Promise<string>;
    releaseCreatedAt(owner: string, repo: string, tagName: string): Promise<string>;
}
