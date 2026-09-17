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
- No backend — every operation happens client-side via the Canvas API

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
  lib/                  Shared browser helpers: canvas/image utilities,
                        the batch pipeline, and the local inpainting solver
  App.tsx               Route table
  main.tsx              Entry point
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally
- `npm run lint` — run Oxlint
