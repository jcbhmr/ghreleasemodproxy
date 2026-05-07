import type { Octokit } from "octokit";

export const pattern = new URLPattern({ pathname: "/:module*/@latest" })

export async function GET(request: Request, result: URLPatternResult, octokit: Octokit): Promise<Response> {
    const module = result.pathname.groups.module!;
    const url = new URL(request.url) as Readonly<URL>;
    const searchParams = url.searchParams as Readonly<URLSearchParams>;
    const owner = searchParams.get("owner");
    if (owner == null) {
        return new Response(null, { status: 400 });
    }
    const repo = searchParams.get("repo");
    if (repo == null) {
        return new Response(null, { status: 400 });
    }
    const subdir = searchParams.get("subdir");

    const { data } = await octokit.rest.repos.getLatestRelease({
        owner: owner,
        repo: repo,
    })

    return Response.json({
        Version: data.tag_name,
        // Time: data.published_at,
    })
}