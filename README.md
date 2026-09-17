# Web Tool Stack

Free, browser-only tools for working with images — no server, no uploads.
Everything runs client-side on an HTML canvas.

## Tools

- **Compress Image** — re-encode a JPG/PNG/WebP at a chosen quality to shrink file size.
- **Convert Image** — convert an image between PNG, JPEG, and WebP.

More tools can be added the same way: a new page under `src/pages/`, a route
in `src/App.tsx`, and a card on the home page.

## Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for dev server and bundling
- [React Router](https://reactrouter.com/) for client-side routing
- No backend — image processing happens entirely in the browser via the Canvas API

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser.

## Project structure

```
src/
  components/   Shared UI used across pages (Layout, ToolCard, DropZone)
  pages/        One folder per route/tool, each with its component + CSS
  lib/          Shared browser helpers (canvas/image utilities)
  App.tsx       Route table
  main.tsx      Entry point
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally
- `npm run lint` — run Oxlint
