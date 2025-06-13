# Slow Reader Client Core

_See the [full architecture guide](../README.md) first._

- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Client Environments](#client-environments)
- [URL Routing](#url-routing)
- [Test Strategy](#test-strategy)

## Project Structure

All clients share the logic from the core. This core logic is defined as smart stores of **[Nano Stores](https://github.com/nanostores/nanostores)**.

In the best scenario, the client should just subscribe to stores, render UI according to the stores, and call core function on user actions.

- [`loader/`](./loader/): support of each social network or news format.
- [`pages/`](./pages/): logic of each app’s page.
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

- `cd core && pnpm test`: run core unit tests and check coverage.

## Client Environments

Core depends on the platform environment (like storage or network). Before using any store, the client must call [`setEnvironment`](./environment.ts) to define how the core should interact with the platform.

- [Test environment](./test/utils.ts)
- [Web environment](../web/main/environment.ts)

All networks requests should be done by [`request()`](./request.ts) to support different environment and proxy server. But we also recommend using [`DownloadTask`](./download.ts) and think about network request aborting.

## URL Routing

Slow Reader router is a little complicated because it needs to work in desktop/mobile apps, not only in web. This is why router is split to 2 parts:

1. Every environment (like web client) has own low-level “base router”. Web client uses [URL router](../web/stores/router.ts) from [Nano Stores Router](https://github.com/nanostores/router).
2. [Core router](./router.ts) takes “base router” and add redirects, guards, etc.

This is why core code should not rely on URL routing, since not every client will use it. For instance, desktop app with use just a simple store with plain object of current route.

Instead, core code should use API:

- `getEnvironment().openRoute(route)` to change current page.
- Read `router` store to get current page or subscribe to the store to listen for current page changes (for instance, to clean temporary stores when user leaves the page).

## Test Strategy

Our tests should help us do the refactoring, not blocking us from refactoring by requirement rewriting tests on every change.

We are using unit tests to emulate real user interactions. We mock network requests and use special [test environment](./test/utils.ts). But we call the same functions as clients UI will call and check the same stores, which clients will use to render UI.

It is better to use pages/popups stores/function rather than any low-level functions. The exception is network requests parsing, XSS protection and other utilizes with many test cases.

All unit tests import functions/stores from `core/index.ts` to test exports and the whole stores compositions.

We run unit tests by `node --test` with [`better-node-test`](https://github.com/ai/better-node-test) for TypeScript and sugar.

We have 100% lines coverage requirement, but it is OK to use `/* c8 ignore start */`-`/* c8 ignore end */`, `/* c8 ignore next 2 */` for error and rare edge cases (see [`c8` docs](https://github.com/bcoe/c8) for ignore instruction examples).

```sh
# Run all tests with coverage
cd core && pnpm test

# Run all tests without coverage (a little faster)
cd core && n bnt

# Run specific test file
n bnt core/test/html.test.ts

# Run specific test
n bnt core/test/html.test.ts -t 'sanitizes HTML'
```

In VS Code you can use [extension](https://marketplace.visualstudio.com/items?itemName=connor4312.nodejs-testing) to run specific test from UI.

Open `core/coverage/lcov-report/index.html` to see coverage issues.

## Mocking requests

To enable network request mocking in tests, you have to set up and tear down request mock before and after each test:

```typescript
beforeEach(() => {
  mockRequest()
})

afterEach(() => {
  checkAndRemoveRequestMock()
})
```

In the test itself, before making or triggering the request itself, use either:

- `expectRequest(url).andRespond(...)` for simple mocking where the response is known upfront.
- or `expectRequest(url).andWait(...)` for complex scenarios where you need to control test loading states or simulate network delays.
