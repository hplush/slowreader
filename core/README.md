# Slow Reader Client Core

_See the [full architecture guide](../README.md) first._

- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Client Environments](#client-environments)
- [URL Routing](#url-routing)
- [Data Storage](#data-storage)
  - [Log Retention](#log-retention)
  - [Local Mode](#local-mode)
  - [Migrations](#migrations)
  - [Reset](#reset)
- [Test Strategy](#test-strategy)
  - [Mocking Requests](#mocking-requests)

## Project Structure

All clients share the logic from the core. This core logic is defined as smart stores of **[Nano Stores](https://github.com/nanostores/nanostores)**.

In the best scenario, the client should just subscribe to stores, render UI according to the stores, and call core function on user actions.

- [`loader/`](./loader/): support of each social network or news format.
- [`pages/`](./pages/): logic of each app’s page.
  - [`mixins/`](./pages/mixins): a way to share common logic between pages.
- [`readers/`](./readers/): logic of each way to read user’s feeds.
- [`popups/`](./popups/): logic of each side popup.
- [`messages/`](./messages/): translations for in the UI of all clients.
  - We are using [Nano Stores I18n](https://github.com/nanostores/i18n) to
    support different languages in UI.
  - Nano Stores I18n has 2 types of translations: JS files with messages structure for base locale (English) and JSON files for other languages following structure from that JS file.
  - For now, we support only English. We will add more languages later when we stabilize the UI a little.
- [`lib/`](./lib/): shared functions used in multiple core modules.
- [`test/`](./test/): unit tests for modules, loaders and utilities.
- `{MODULE}.ts`: client logic separated by modules.
  - To avoid name conflict, each module should use the module’s name or term in exported functions and stores.

## Scripts

- `pnpm -F core test`: run core unit tests and check coverage.

## Client Environments

Core depends on the platform environment (like storage or network). Before using any store, the client must call [`setEnvironment`](./environment.ts) to define how the core should interact with the platform.

- [Test environment](./test/utils.ts)
- [Web environment](../web/main/environment.ts)

All networks requests should be done by [`request()`](./request.ts) to support different environment and proxy server. But we also recommend using [`DownloadTask`](./lib/download.ts) and think about network request aborting.

## URL Routing

Slow Reader router is a little complicated because it needs to work in desktop/mobile apps, not only in web. This is why router is split to 2 parts:

1. Every environment (like web client) has own low-level “base router”. Web client uses [URL router](../web/stores/url-router.ts) from [Nano Stores Router](https://github.com/nanostores/router).
2. [Core router](./router.ts) takes “base router” and adds redirects, guards, etc.

This is why core code should not rely on URL routing, since not every client will use it. For instance, desktop app with use just a simple store with plain object of current route.

Instead, core code should use API:

- `getEnvironment().openRoute(route)` to change current page.
- Read `router` store to get current page or subscribe to the store to listen for current page changes (for instance, to clean temporary stores when user leaves the page).

## Data Storage

All user’s data is in the SQLite database of [`schema.ts`](./schema.ts). Every table is a CRDT map with per-field last write wins: each field has an `updatedAt_field` column with the the Logux time of its last change. Tables are filled by Logux actions (`feeds/created`, `feeds/changed`, `feeds/deleted`), and the same actions are the sync format between devices.

On the client the tables are the source of truth. The client’s log is not a second copy of them: [`log.ts`](./log.ts) keeps in it only what can not be restored from the tables.

### Log Retention

`updatedAt_field` keeps the sortable Logux meta, so the action ID and the time of every cell are restorable from the table itself. An action is kept only if it is not derivable from the tables:

- It was not sent to the server yet (the log is the outbox).
- It is a deletion: we keep the tombstone for a month.
- it is not simple last-write-wins action.

Everything else keeps only a `shadow` action: the ID of the original action, its reasons, its indexes and its time, without the body.

We use `shadow` action to track by `indexes` and `reasons` when the origin even is not needed anymore and remove this action from the server.

Reasons are the reference counter of the cells:

- `plural/id/field` is added in the `preadd` event for every cell the action **touches**.
- `plural/id` is added to every `plural/created`.
- `tombstone` is added to every `plural/deleted`.

Reasons are removed by the `applied()` hook of the database from new action applied.

Because all actions are encrypted on the server, clients control server’s log cleaning.

When the last reason is removed, the client removes `shadow` action and sends `0/clean` to the server, so the log on the server keeps exactly the actions owning at least one live cell, plus the tombstones inside the retention window. Tombstones are deleted by the clients too: any device removes the tombstones older than 1 month on the start and on the connect.

### Local Mode

The user without a cloud account does not keep any actions since it does not need to control server’s log cleaning.

The sign-up generates the actions from the tables with a fresh meta and uploads them.

### Migrations

Any change in the tables schema drops the tables and replays the actions. Shadowed actions is restores from the tables by `crdtTableToActions()`. The same snapshot is shared with the menu reducer of [`menu.ts`](./menu.ts).

The `dbMigrating` marker in the storage detects if browser tab was closed in the middle of the migration or of the sign-up upload to run the task again.

### Reset

In the reset process the client uploads own unsent actions, drops the whole database and restarts the app to download everything from the server again. It is called when:

- The server saw that the device was offline longer than the 12 month and could miss a tombstone.
- The migration was interrupted.
- The database or reducer is broken.
- The user asked for it on the profile page.

For debug the reason and the time of the last reset are kept in `localStorage` under `slowreader:reset`.

## Test Strategy

Our tests should help us do the refactoring, not blocking us from refactoring by requirement rewriting tests on every change.

We are using unit tests to emulate real user interactions. We mock network requests and use special [test environment](./test/utils.ts). But we call the same functions as clients UI will call and check the same stores, which clients will use to render UI.

It is better to use pages/popups stores/function rather than any low-level functions. The exception is network requests parsing, XSS protection and other utilizes with many test cases.

All unit tests import functions/stores from `core/index.ts` to test exports and the whole stores compositions.

We run unit tests by `node --test` with [`better-node-test`](https://github.com/ai/better-node-test) for TypeScript and sugar.

```sh
# Run all tests with coverage
pnpm -F core test

# Run all tests without coverage (a little faster)
pnpm -F core exec bnt

# Run specific test file
n bnt core/test/html.test.ts

# Run specific test
n bnt core/test/html.test.ts -t 'sanitizes HTML'
```

We have 100% lines coverage requirement, but it is OK to use `/* node:coverage disable */`-`/* node:coverage enable */`, `/* node:coverage ignore next 2 */` for error and rare edge cases.

In VS Code you can use [extension](https://marketplace.visualstudio.com/items?itemName=connor4312.nodejs-testing) to run specific test from UI.

### Mocking Requests

To enable network request mocking in tests, you have to set up and tear down request mock before and after each test:

```ts
beforeEach(() => {
  mockRequest()
})

afterEach(() => {
  checkAndRemoveRequestMock()
})
```

In the test itself, before making or triggering the request itself, use either:

```ts
// for simple mocking
expectRequest('https://example.com').andRespond(200, '<html></html>')
callLogicWithRequest()
```

```ts
// for simulate network delays
let reply = expectRequest('https://example.com').andWait()
callLogicWithRequest()
reply1(200, '<html></html>')
```

If you need to make HTTP requests to Logux server, doen’t use `mockRequest` and just run test Logux server. See [auth tests](./test/auth.test.ts) for example.
