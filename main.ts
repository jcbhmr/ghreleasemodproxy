#!/usr/bin/env -S deno serve --allow-all
import env from "./env.ts";
import { Octokit } from "octokit";

const app = new App({
  octokit,
  allow: [
    /^github\.com\/jcbhmr\//,
    /^([a-z0-9.]+\.)?jcbhmr\.com\//,
  ],
});

export default app satisfies Deno.ServeDefaultExport;
