#!/usr/bin/env -S deno serve --allow-all
import App from "./mod.ts";

const app = new App({
    allowedModules: [
        /^github\.com\/jcbhmr\//,
        /^([a-z0-9.]+\.)?jcbhmr\.com\//,
    ]
})

export default {
    fetch(request: Request): Promise<Response> {
        return app.fetch(request);
    }
} satisfies Deno.ServeDefaultExport
