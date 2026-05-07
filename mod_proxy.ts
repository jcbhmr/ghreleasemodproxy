export interface Info {
    Version: string
    Time: string
}

export default interface ModProxy {
    list(path: string): string[] | PromiseLike<string[]>
    info(path: string, version: string): Info | PromiseLike<Info>
    mod(path: string, version: string): BufferSource | ReadableStream<Uint8Array> | Iterable<Uint8Array> | AsyncIterable<Uint8Array> | string | PromiseLike<BufferSource | ReadableStream<Uint8Array> | Iterable<Uint8Array> | AsyncIterable<Uint8Array> | string>
    zip(path: string, version: string): BufferSource | ReadableStream<Uint8Array> | Iterable<Uint8Array> | AsyncIterable<Uint8Array> | string | PromiseLike<BufferSource | ReadableStream<Uint8Array> | Iterable<Uint8Array> | AsyncIterable<Uint8Array> | string>
    latest(path: string): string | PromiseLike<string>
}
