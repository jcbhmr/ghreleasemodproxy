import { type } from "arktype";
import env from "./env.ts";
import { Octokit } from "octokit";

const token = type.string.assert(env.GH_TOKEN ?? env.GITHUB_TOKEN);
const baseURL = type("string?.url").assert(env.GH_API_URL ?? env.GITHUB_API_URL)

const octokit = new Octokit({ auth: token, baseUrl: baseURL })
export { octokit as default };
