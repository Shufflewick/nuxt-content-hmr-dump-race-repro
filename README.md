# @nuxt/content: HMR event is sent before the collection dump is written

Reproduction for a dev-mode ordering bug in `@nuxt/content` 3.17.0 (Nuxt 4.6.4).

In `src/utils/dev.ts`, `broadcast()` calls `updateTemplates()` for the manifest and the
compressed dump without `await`, then immediately sends the `nuxt-content:update` websocket
event. A browser tab that has not loaded that collection answers the event by fetching
`/__nuxt_content/<collection>/sql_dump.txt`, which the dev server serves from
`.nuxt/content/database.compressed.mjs`. That file has not been rewritten yet. The components
watcher in the same file already awaits `updateTemplates()`.

## Setup

Node 22.5 or newer (the project uses the built-in `node:sqlite` connector, so no native module
is installed).

```sh
npm install
npm run dev   # first runs scripts/generate-b.mjs, which writes 3000 files to content/b
```

- Collection `a`: one page. `/` queries only `a`, in the browser (`server: false`).
- Collection `b`: 3000 generated pages of hard-to-compress text, so its compressed dump is large
  (about 27 MB) and slow to rebuild. Nothing on the page queries it until you click the button.

## Steps (ordering, reproduces every time)

With the dev server running, in a second terminal:

```sh
npm run check-order -- http://localhost:3000 10
```

The script opens the dev server's HMR socket the way a browser tab does, appends a unique line
to `content/b/page-00000.md`, and as soon as `nuxt-content:update` arrives fetches B's dump, the
same request a tab that has not loaded B makes. It then fetches again until the dump contains
the edit.

Result on my machine (macOS, Apple Silicon, Node 22.23.5), unmodified 3.17.0:

```
run 1: event 19 ms after the edit; dump fetched on the event was stale; dump first current 1074 ms after the event
...
10/10 dumps fetched on the HMR event did not contain the change the event announced
```

With `await` added before `updateTemplates(` in `broadcast()` (in
`node_modules/@nuxt/content/dist/module.mjs`), restarting the dev server:

```
run 1: event 1102 ms after the edit; dump fetched on the event was current; dump first current 247 ms after the event
...
0/10 dumps fetched on the HMR event did not contain the change the event announced
```

## The failure this ordering allows (did not reproduce here)

Because the event goes out before the dump is written, the tab's dump request races the write of
`database.compressed.mjs`. If the read overlaps the write, the tab gets a dump that does not
decompress, `loadCollectionDatabase()` rejects, and `loadDatabaseAdapter()` keeps that rejected
promise in `dbPromises`, so every later query on that collection fails until a full page reload.
We hit this in a real app's dev server (Nuxt 4.5.2, @nuxt/content 3.16.0).

In this project I could not make that visible failure happen. A Playwright run of 30 iterations
(open `/`, wait for collection A to render from the browser database, edit a B file, wait for
the B dump request, then click "Query collection B in the browser") got the stale but complete
dump 30 out of 30 times, and the B query then succeeded 30 out of 30 times, because the queries
in the HMR event are applied on top of the stale dump. So on this machine the reproducible part
is the ordering above, and the truncated read is a narrow window inside it.
