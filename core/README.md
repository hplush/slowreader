# Slow Reader Core

_See the [full architecture guide](../README.md) first._

All clients share the logic from the core. This core logic is defined as **[Nano Stores](https://github.com/nanostores/nanostores)**.

In the best scenario, client should just subscribe to stores, render UI according to the stores, and call core’s function on user’s actions.

- [`loader/`](./loader/): support of each social network or news format.
- [`messages/`](./messages/): translations for text in client’s UI.
  - We are using [Nano Stores I18n](https://github.com/nanostores/i18n) to
    support different languages in UI.
  - Nano Stores I18n has 2 types of translations: JS files with messages structure for base locale (English), and JSON files for other languages following structure from that JS file.
  - For now, we support only English. We will add more languages later, when we stabilize UI a little.
- [`lib/`](./lib/): shared functions used in multiple core modules.
- [`test/`](./test/): unit tests for modules, loaders and utilities.
- `core/{MODULE}.ts`: client’s logic separated by modules.
  - We keep logic in smart stores from [Nano Stores](https://github.com/nanostores/nanostores).
  - Stores do things, which we often do UI components. For instance, pagination or validation.
  - Each page should have its own module.
  - To avoid name conflict, each module should use module’s name in exported functions and stores.

## Scripts

- `cd core && pnpm test`: run core unit tests.

## Client Environments

Core depends on the platform environment (like storage to store settings). Before using any store, client must call [`setEnvironment`](./environment.ts) to define how core should interact with platform.

- [Test environment](./test/environment.ts)
- [Web environment](../web/main/environment.ts)

## Test Strategy

We are using unit tests to emulate real user interactions. We mock network requests and use special [test environment](./test/environment.ts). But we call the same functions as clients UI will call and check the same stores, which clients will use to render UI.

All units test import functions/stores from `core/index.ts` to test exports and to test the whole stores compositions.

We run unit tests by `node --test` with [`better-node-test`](https://github.com/ai/better-node-test) for TypeScript and sugar.

[`c8`](https://github.com/bcoe/c8) checks that tests execute every line of code (100% line coverage).
