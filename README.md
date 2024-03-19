# Slow Reader

Web app to combine feeds from social networks and RSS and to help read more meaningful and deep content.

**[How to contribute and join the team](./CONTRIBUTING.md)**

- [License](#license)
- [Principles](#principles)
  - [Local-first: Clients Do All the Job](#local-first-clients-do-all-the-job)
  - [Zero-Knowledge Synchronization](#zero-knowledge-synchronization)
  - [Event-Sourcing and CRDT](#event-sourcing-and-crdt)
  - [Client Core: Reusing All Logic Between Different Platforms](#client-core-reusing-all-logic-between-different-platforms)
- [Project Structure](#project-structure)
- [Tools](#tools)
- [Scripts](#scripts)
- [Synchronization Protocol](#synchronization-protocol)
- [Client Storage](#client-storage)
- [Test Strategy](#test-strategy)
- [Visual Language](#visual-language)
- [Guides](#guides)

## License

Slow Reader is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License (version 3 or any later). For details see the [`LICENSE.md`](./LICENSE.md) file in this directory.

## Principles

### Local-first: Clients Do All the Job

Local-first means the client stores all data locally and does most of the job. Even if we decide to close the cloud, you can still use the Slow Reader client.

In our case, it means that:

- Client stores all feeds and posts. You can read posts offline.
- Client checks feeds for new posts.
- You need the cloud to sync data between clients.

[Local-first manifest](https://www.inkandswitch.com/local-first/) tells more philosophy behind that idea.

### Zero-Knowledge Synchronization

Clients use end-to-end encryption during cloud sync. It means the cloud can’t know what feeds you are reading or what posts you like.

You can check [encryption source code](https://github.com/logux/client/blob/main/encrypt-actions/index.js).

We have a proxy to make HTTP requests to other servers from the website. But this proxy is only for development, bypassing government censorship, or the initial test of the app. The web client should mostly use an upcoming web extension to bypass the CORS limit. Upcoming native clients will use direct HTTP requests since they don’t have a CORS limitation.

### Event-Sourcing and CRDT

The source of truth in the client is a list of changes (action log). An action is a JSON object like:

```json
{
  "type": "feeds/changed",
  "id": "kc4VfXpvw3vZZBu_ugGlC",
  "fields": {
    "reading": "slow"
  }
}
```

To render the UI, the client reduces actions from the log into the state (objects of feeds, posts, etc.). We store the state cache in [Nano Stores](https://github.com/nanostores/nanostores).

The log simplifies synchronization. We just need to track the last synchronized action and send all actions after that one.

We use [Logux](https://logux.org/) to work with log and synchronization.

### Client Core: Reusing All Logic Between Different Platforms

For now, we have only a web client. But we want to have native clients for different platforms.

To make client porting easier, we separate core logic and UI. Core logic is the same for every client. The client just needs to bind this logic to the UI using native components.

We write logic in TypeScript as smart stores in the [Nano Stores](https://github.com/nanostores/nanostores) state manager. The client needs to subscribe to stores and render UI according to the store.

We try to move to the store as much as possible: app routing, validations, and UI helpers. The client should be as thin as possible. The ideal client is just a UI renderer.

Core depends on the platform environment (like storage to store settings). Before using any store, the client must call [`setEnvironment()`](./core/environment.ts) to define how the core should interact with the platform.

## Project Structure

Slow Reader is a local-first app. Clients do most of the work, and the server just syncs data between users’ devices (with end-to-end encryption).

- **Clients.**
  - [`core/`](./core/): client’s logic and i18n translations. Clients for specific platforms is just a UI around this core to simplify porting
    - See **[`core/README.md`](./core/README.md)** for core architecture.
  - [`web/`](./web/): the client to be run in the browser. Both for desktop and mobile.
    - See **[`web/README.md`](./web/README.md)** for web client architecture.
- [`server/`](./server/): a small server that syncs data between users’ devices.
- [`proxy/`](./proxy/): HTTP proxy server to bypass censorship or to try web clients before they install the upcoming extensions (to bypass the CORS limit of the web apps).
- [`api/`](./api/): types and constants shared between clients and server.
- [`docs/`](./docs/): guides for developers.
- [`scripts/`](./scripts/): scripts to test project. Check the script’s descriptions for further details.
- [`.github/`](./.github/): scripts to test projects on CI.
- [`.husky/`](./.husky/): scripts to call on `git commit` command to avoid popular errors.
- [`.vscode/`](./.vscode/): VS Code settings to reduce code format errors for new contributors.

We are using [pnpm monorepo](https://pnpm.io/workspaces). Each project has its dependencies, tools, and configs. Read `README.md` in each project for project’s files and architecture.

## Tools

Global development tools:

- [asdf](./.tool-versions) to synchronize Node.js and pnpm versions across the team and CI.
- [Prettier](./.prettierrc) to use the same code style formatting.
- [TypeScript](./tsconfig.json) for strict type checking.
- [ESLint](./eslint.config.js) to check for popular mistakes in JavaScript.

Each project has its own tools, too.

## Scripts

- `pnpm test`: run all tests.
- `pnpm start`: run proxy and web client development server.
- `pnpm format`: fix code style in all files.
- `pnpm clean`: remove all temporary files.

We use pnpm feature to run scripts in parallel, having scripts like `test:types` and `test:audit`. Then, we run all scripts in all projects by `test:*` prefix.

## Synchronization Protocol

We use [Logux WebSocket protocol](https://logux.org/protocols/ws/spec/) to synchronize actions between clients and server.

Clients keep a list of changes (action log) as the source of truth and then send new actions to the server. The server then sends all new actions to other clients.

The server doesn’t see those actions because clients encrypt them before sending and decrypt them upon receiving. The server sees only actions like:

```js
// Add encrypted action to the server log
{
  "type": "0",
  "d": "encrypted data",
  "iv": "random vector used together with password in encryption"
}
```

```js
// Remove action from the server log
{
  "type": "0/clean",
  "id": "action ID"
}
```

## Client Storage

The clients store a list of changes (action log). During the start, the client reduces all necessary actions from the log to the [Logux SyncMap stores](https://logux.org/web-api/#globals-syncmaptemplate).

For simple things like client local settings, we use [Nano Store Persistent](https://github.com/nanostores/persistent).

The web client uses IndexedDB to store log and `localStorage` for the client’s settings.

## Test Strategy

If any mistake happens a few times, we should add an automatic tool to **prevent mistakes** in the future. Possible strategies:

1. Types.
2. [Scripts](./scripts/), custom ESLint or Stylelint plugins.
3. Unit-tests.
4. [Pull request checklist](./docs/pull_request_template.md).

Any **code-style** rule should be implemented as a `pre-commit` hook or linter’s rule.

Types should try to use precise **types** and explain data relations with them:

```diff
- { type: string, error?: Error }
+ { type: 'ok' } | { type: 'error', error: Error }
```

We are using unit tests for **client core**. We mock network requests and the platform environment but emulate user interaction and test the composition of all stores.

For the platform’s clients, we mostly use **visual tests**. But they could be complex and test the whole pages with mocking core’s stores.

## Visual Language

We prefer the platform native look and feel where possible.

Where not possible, we use old-style 3D with rich visual feedback and a z-axis.

The slow mode should always use a yellow newspaper-like background (on color screens).

We are using [Material Design Icons](https://pictogrammers.com/library/mdi/) icons.

On desktops, we care not only about mouse UX but also about keyboard UX. Our keyboard UX rules:

- Create a path: what keys can the user press to do some action? Try to make the path shorter.
- Make hotkeys and non-standard keys visible to the user.
- Think about focus. If the user starts to interact with the keyboard, move the focus to the next control.
- <kbd>Esc</kbd> should work in as many cases as possible.
- Don’t use only <kbd>Tab</kbd> to navigate. Mix it with arrows and hotkeys for list items.

## Guides

- [How to Add New Page to Web Client?](./docs/new_page.md)
