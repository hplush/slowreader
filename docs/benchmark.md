# How to Benchmark UI?

Benchmark fills the client with a lot of data, replays user actions in the real app, and reports loader durations and main thread freezes.

It runs inside the real web client (lazy chunk, loaded only with `?benchmark`), not in a special page, so numbers include real bundle, real Svelte components, real IndexedDB.

## Run Script

Script starts the server, opens Chromium from Playwright’s cache, fills the
database on the first run, shows the progress bar, and prints total numbers:

```sh
pnpm -F web build:web
pnpm -F web benchmark
```

Other commands:

```sh
pnpm -F web benchmark --help # all options
DEBUG=1 pnpm -F web benchmark --clean # faster benchmark for development
```

Database is kept in `/tmp/slowreader-benchmark` between runs, so filling
happens only once. Set `CHROMIUM_PATH` if Chromium is not in Playwright’s cache.

Script raises Chromium’s JS heap limit to 8 GB and waits 10 minutes for
the app to load the database. Remove both from `web/scripts/benchmark.ts`
and `web/benchmark/measure.ts` after fixing app’s work with big database.

Script uses Chromium, not Firefox, because only Chromium has long tasks
and memory API.

## Run in Browser

It is better to use Chrome because it has long tasks and memory API.

```sh
pnpm start
```

Open `http://localhost:2553/?benchmark`. On the first opening benchmark
creates the database and reloads the page.

Then in browser console:

```js
await benchmark.run() // returns results object
benchmark.results // last results, use copy() to get JSON
benchmark.end() // return the tab to the normal app
```

Other commands:

```js
await benchmark.run('read-page') // single scenario, for debugging
await benchmark.clean() // remove database and reload with new data
await benchmark.fill() // create data again
```

For benchmark development you can use `?benchmark=debug` to make it faster.

## Methodology

20 categories, 1000 feeds, 0–2000 posts in feed with long tail distribution (most feeds are small, few are huge), ~70 000 posts total. Network is mocked. Every 5th feed returns 3 new posts on every refresh, so `refresh` scenario also measures database inserts and menu rebuilds.

Every scenario runs 5 times. Run, which did not finish in 1 minute or did not find element to click, is counted in `failed` and does not stop other scenarios. After 2 failed runs benchmark gives up on the scenario and goes to the next one.

Report has `total` to compare branches by a single object: sum of `duration`, `freezes`, `memory`, `domSize`, `failed`, and all loaders time; the biggest `longestFrame` and `longestTask`. Text report marks every number with `(sum)` or `(max)`.

Report also has time of database filling (`fill`), time from page opening to app without loaders (`start`), and for every scenario median of runs:

- `duration` — from action to the moment when no loader is rendered
  and 2 frames passed
- `freezes` — number of frames longer than 50 ms
- `longestFrame` — the longest frame, `0` only if the page did not render
- `longestTask` — the longest task in the main thread, `0` if there were no
  tasks longer than 50 ms (Chromium only)
- `loaders` — how long every loader was rendered
- `domSize` — elements in the page at the end of the scenario, when all
  loaders were removed
- `memory` — JS heap in MB at the same moment (Chromium only, browser
  rounds the value and does not run garbage collector before)

## Loaders

UI loaders reports itself by `reportLoader()` while it is rendered.

## Scenarios

Scenarios are in `web/benchmark/scenarios.ts`. They click real elements, so they depend on class names of the real UI.

`freeze` scenario blocks the main thread for 200 ms. It is not in the report, but you can run it to check that freeze metrics are still working:

```sh
pnpm -F web benchmark --scenario freeze
```
