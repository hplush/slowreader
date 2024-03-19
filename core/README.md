# Slow Reader Client Core

_See the [full architecture guide](../README.md) first._

- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Client Environments](#client-environments)
- [Test Strategy](#test-strategy)

## Project Structure

All clients share the logic from the core. This core logic is defined as smart stores of **[Nano Stores](https://github.com/nanostores/nanostores)**.

In the best scenario, the client should just subscribe to stores, render UI according to the stores, and call core function on user actions.

- [`loader/`](./loader/): support of each social network or news format.
- [`messages/`](./messages/): translations for in the UI of all clients.
  - We are using [Nano Stores I18n](https://github.com/nanostores/i18n) to
    support different languages in UI.
  - Nano Stores I18n has 2 types of translations: JS files with messages structure for base locale (English) and JSON files for other languages following structure from that JS file.
  - For now, we support only English. We will add more languages later when we stabilize the UI a little.
- [`lib/`](./lib/): shared functions used in multiple core modules.
- [`test/`](./test/): unit tests for modules, loaders and utilities.
- `{MODULE}.ts`: client logic separated by modules.
  - Stores do things, which we often do UI components. For instance, pagination or validation.
  - Each page should have its own module.
  - To avoid name conflict, each module should use the module’s name in exported functions and stores.

## Scripts

- `cd core && pnpm test`: run core unit tests.

## Client Environments

Core depends on the platform environment (like storage or network). Before using any store, the client must call [`setEnvironment`](./environment.ts) to define how the core should interact with the platform.

- [Test environment](./test/utils.ts)
- [Web environment](../web/main/environment.ts)

All networks requests should be done by [`request()`](./request.ts) to support different environment and proxy server. But we also recommend using [`DownloadTask`](./download.ts) and think about network request aborting.

## Test Strategy

We are using unit tests to emulate real user interactions. We mock network requests and use special [test environment](./test/utils.ts). But we call the same functions as clients UI will call and check the same stores, which clients will use to render UI.

All unit tests import functions/stores from `core/index.ts` to test exports and the whole stores compositions.

We run unit tests by `node --test` with [`better-node-test`](https://github.com/ai/better-node-test) for TypeScript and sugar.

[`c8`](https://github.com/bcoe/c8) checks that tests execute every line of code (100% line coverage).
