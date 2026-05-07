import { HttpRangeReader, ZipReader } from "@zip.js/zip.js";

async function fetchGoModFromRemoteZip(url: string | URL): Promise<Uint8Array> {
    const reader = new HttpRangeReader(url);
    const zip = new ZipReader(reader)
    for await (const entry of zip.getEntriesGenerator()) {
        if (entry.directory) {
            continue;
        }
        const components = entry.filename.split(/\/|\\/g)
        const fileName = components.at(-1)!
        if (fileName !== "go.mod") {
            continue;
        }
        const buffer = await entry.arrayBuffer()
        return new Uint8Array(buffer);
    }
    throw new Error(`go.mod not found in ZIP at ${url}`)
}