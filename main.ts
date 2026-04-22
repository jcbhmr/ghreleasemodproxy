#!/usr/bin/env -S deno serve --allow-all
import { Elysia } from "elysia"
import { staticPlugin } from "@elysiajs/static"
import createApp from "./index.ts";

const app = new Elysia()
  .use(staticPlugin())
  .mount("/", createApp({
    allowedModulePrefixes: ["go.jcbhmr.com/", "github.com/jcbhmr/"]
  }).fetch)

export default app satisfies Deno.ServeDefaultExport;
