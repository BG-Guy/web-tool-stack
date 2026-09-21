# Web Tool Stack

Free, browser-only tools for working with images — no server, no uploads.
Everything runs client-side on an HTML canvas.

## The app

The home page is a strict 4-step batch wizard:

1. **Upload** — add one or more images (drag-and-drop or file picker).
2. **Choose Operations** — pick compress and/or convert format, with their settings.
3. **Process** — runs the chosen operations, in a fixed order (compress, then
   convert), showing per-image progress; one failed image doesn't stop the batch.
4. **Download** — grab results individually or all together as a `.zip`.

**Remove Text** is a separate manual tool (linked in the header): paint over
text/objects and a local content-aware fill blends them away. It's kept apart
from the wizard because it needs per-image interactive masking, which doesn't
fit an automatic batch step — there's no reliable way to auto-detect arbitrary
text without an AI model.

## Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for dev server and bundling
- [React Router](https://reactrouter.com/) for the two routes (wizard, Remove Text)
- [JSZip](https://stuk.github.io/jszip/) for bundling batch downloads
- [jSquash](https://github.com/jamsinclair/jSquash) (`@jsquash/jpeg` (mozjpeg), `@jsquash/webp`,
  `@jsquash/avif`, `@jsquash/oxipng`, `@jsquash/resize`) — WASM builds of the real reference
  encoders, in place of the browser's built-in canvas encoder, for meaningfully smaller output
  at the same visual quality (plus real AVIF support and lossless PNG optimization)
- No backend — every operation happens client-side, decoding via `createImageBitmap` +
  `OffscreenCanvas` and encoding via the WASM codecs above

### Compress/convert pipeline

The compress and convert stages (`lib/pipelineCore.ts`, `lib/offscreenPipeline.ts`,
`lib/wasmCodecs.ts`, `lib/sizeEstimate.ts`) run entirely inside Web Workers, not the main thread:

- **Encoding** goes through jSquash's WASM codecs (mozjpeg for JPEG, real WebP/AVIF encoders,
  oxipng for PNG) instead of `canvas.toBlob()`, which gives smaller files at equal quality and
  adds AVIF as a convert target. PNG has no lossy quality lever — oxipng only losslessly
  re-compresses, but still shrinks output noticeably versus the browser's baseline PNG encoder.
- **Resizing** goes through jSquash's WASM lanczos3 resizer instead of canvas's own
  bilinear/bicubic `drawImage` scaling, for a sharper result at the same target size.
- **Batch processing** (`lib/imageWorkerPool.ts`) runs across a small pool of Web Workers
  (`workers/image.worker.ts`), dispatched round-robin, so a batch of images uses multiple CPU
  cores in parallel instead of processing one image at a time on the main thread. The same pool
  powers the Step 2 live target-size estimate, so the encode trials it runs don't block the UI.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser.

## Project structure

```
src/
  components/          Shared UI (Layout, DropZone)
  pages/
    ImageWorkflow/      The 4-step batch wizard (home page)
    RemoveText/         The standalone manual text-removal tool
  lib/                  Shared browser helpers: canvas/image utilities, the
                        WASM codec/resize wrappers, the worker-safe pixel
                        pipeline, the worker pool, and the local inpainting
                        solver
  workers/              The image.worker.ts entry point the pool runs
  App.tsx               Route table
  main.tsx              Entry point
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally
- `npm run lint` — run Oxlint
