# How to Benchmark UI?

Benchmark fills the client with a lot of data, replays user actions in the real app, and reports loader durations and main thread freezes.

It runs inside the real web client (lazy chunk, loaded only with `?benchmark` on local server, `dev.slowreader.app`, and PR previews), not in a special page, so numbers include real bundle, real Svelte components, real SQLite in OPFS.

Benchmark fills the data as a local user and signs up, so it measures the upload of local data too. Then scenarios run as this cloud user on a local sync server, because the log tracking and the sync are a big part of every write.

## Run Script

Script starts the web server and the sync server, opens Chromium from Playwright’s cache (downloads it on the first run), fills the database on the first run, shows the progress bar, and prints total numbers:

```sh
pnpm -F web benchmark
```

Other commands:

```sh
pnpm -F web benchmark --help # all options
DEBUG=1 pnpm -F web benchmark --clean # faster benchmark for development
```

Databases are kept between runs, so filling happens only once and the account of the previous run is reused: the client’s one is in `/tmp/slowreader-benchmark` (Chromium profile) and the server’s one is in `/tmp/slowreader-benchmark-server` (pglite). `--clean` removes both.

Chromium is downloaded to `~/.cache/ms-playwright/` by
`playwright-mcp install-browser chromium`, the same cache as Playwright MCP
uses. Set `CHROMIUM_PATH` to use another binary.

Script uses Chromium, not Firefox, because only Chromium has long tasks
and memory API.

## Run in Browser

It is better to use Chrome because it has long tasks and memory API.

```sh
pnpm start
```

Open `http://127.0.0.1:2553/app?benchmark`. On the first opening benchmark
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
await benchmark.storage() // IndexedDB, OPFS, and localStorage sizes in bytes
```

For benchmark development you can use `?benchmark=debug` to make it faster.

## Weekly Run

[Benchmark workflow](../../.github/workflows/benchmark.yml) runs the benchmark script every Monday. GitHub runners have CPUs of different speed, so it tries 12 runners one by one and runs the benchmark only on the first 3 with the CPU set in the workflow. It fails only if a scenario run failed or no runner had this CPU.

Every Monday the workflow replaces the whole `benchmark` branch with a new commit without parents, which has only the last run, so the repository does not grow.

[Production VictoriaMetrics](../../infra/README.md#metrics) reads the branch and keeps old runs for the chart on `dashboard.hplush.dev`.

[Our Grafana](https://github.com/hplush/cloud) warns in Telegram if a number of the last run is over the median of the 4 weeks before it on the same CPU ([rules](https://github.com/hplush/cloud/blob/main/roles/dashboards/templates/rules.alerting.yml.j2)):

- By 10% for DOM size, listeners, storage, and storage growth.
- By 30% and 50 ms for duration, loaders, start, database filling, and upload.
- By 30% for renderer memory.

## Methodology

10 categories, 100 feeds, 0–2000 posts in feed with long tail distribution (most feeds are small, few are huge), about ~18 500 posts total (2 big feeds with 5000 posts each). Network is mocked. Every 5th feed returns 3 new posts on every refresh, so `refresh` scenario also measures database inserts and menu rebuilds.

Every scenario runs 5 times. Run, which did not finish in 1 minute or did not find element to click, is counted in `failed` and does not stop other scenarios. After 2 failed runs benchmark gives up on the scenario and goes to the next one.

```js
{
  feeds: 100, // Feeds in the database
  fill: 4360, // Time of database filling in ms
  posts: 7342, // Posts in the database
  scenarios: {
    'read-page': {
      // The biggest number of elements in the page during the scenario,
      // counted on every 10th frame
      domSize: 2688,
      // From start to the moment when the last loader was removed.
      duration: 516,
      // Did not finish in 1 minute or did not find element to click
      failed: 0,
      freezes: 7, // Frames longer than 50 ms
      loaders: { posts: 120 }, // How long every loader was rendered in ms
      longestFrame: 300, // The longest frame in ms
      // 0 if the page did not render
      // The longest task in the main thread in ms
      // 0 if there were no tasks longer than 50 ms (Chromium only)
      longestTask: 305,
      // The biggest JS heap in MB seen on scenario’s frames. Chromium only.
      memory: 112
    }
    //,  … other scenarios
  },
  start: 12000, // Time from page opening to app without loaders in ms
  storage: { // Sizes in bytes
    end: { // After all scenarios
      indexedDB: 0, // From navigator.storage.estimate()
      localStorage: 2048, // Sum of all keys and values
      opfs: 13000000, // Sum of all files in origin private file system
      // Sum of the three sizes above.
      total: 13002048
    },
    start: {} // The same, but after database filling, before scenarios
  },
  upload: 2100, // Time from the sign-up to the end of the upload loader in ms
  // Time from the sign-up until the server confirmed every uploaded action
  uploadSync: 5300,
  total: {
    domSize: 2688, // Sum of scenarios
    duration: 35462, // Sum
    failed: 5, // Sum
    freezes: 7, // Sum
    loaders: 749, // Sum of all loaders of all scenarios
    longestFrame: 300, // The biggest of scenarios
    longestTask: 305, // The biggest
    memory: 112, // The biggest
    // Only the script can take 3 numbers below. They are not in
    // benchmark.run() results in the browser. They are the biggest values
    // of the whole session.
    documents: 1004,
    listeners: 40610,
    // Memory of all renderer processes in MB. Renderer is killed by this
    // number, not by JS heap: it also has DOM, IndexedDB, images, workers,
    // and buffers outside the heap
    renderer: 1209
  },
  // Only the script adds 3 values below
  chromium: '141.0.7390.37', // Browser version
  commit: '9eb8ecf8a0b1c2d3e4f5061728394a5b6c7d8e9f', // Git commit of the app
  cpu: 'AMD EPYC 7763 64-Core Processor' // Model of the processor
}
```

## Loaders

UI loaders reports itself by `reportLoader()` while it is rendered.

## Scenarios

Scenarios are in `web/benchmark/scenarios.ts`. They click real elements, found by `data-anchor` markers.

`freeze` scenario blocks the main thread for 200 ms. It is not in the report, but you can run it to check that freeze metrics are still working:

```sh
pnpm -F web benchmark --scenario freeze
```
