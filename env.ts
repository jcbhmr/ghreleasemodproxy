import { type } from "arktype";
import arkenv from "arkenv";
import GitHubPersonalAccessToken from "./github_personal_access_token.ts";

const env = arkenv({
    "GHMODPROXY_TOKEN?": GitHubPersonalAccessToken,
    "GHMODPROXY_ALLOW": type("string").pipe(x => x.split(",")),
    "GHMODPROXY_DENY": type("string").pipe(x => x.split(",")),
});
export { env as default };
