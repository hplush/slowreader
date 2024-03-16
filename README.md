# Slow Reader

Web app to combine feeds from social networks and RSS and to help read more meaningful and deep content.

**[Join the Team](./CONTRIBUTING.md)**

## License

Slow Reader is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License (version 3 or any later). For details see the [`LICENSE.md`](./LICENSE.md) file in this directory.

## Principles

### Local-first: Clients Do All the Job

Local-first means that client store all data locally and do most of the job. Even if we decided to close the cloud, you can still use Slow Reader client.

In our case it means, that:

- Client stores all feeds and posts. You can read posts offline.
- Clients checks feed for new posts.
- You will need cloud only to sync data between clients.

Read [Local-first manifest](https://www.inkandswitch.com/local-first/) for inspiration.

### Zero-Knowledge Synchronization

Clients use end-to-end encryption during the sync by cloud. It means that cloud can’t know what feeds are you reading or what posts do you like.

You can check [encryption source code](https://github.com/logux/client/blob/main/encrypt-actions/index.js).

We have proxy to make HTTP requests to other servers from website. But this proxy is only for development, bypassing government censorship or initial test of the app. Web client should mostly use upcoming web extension to bypass CORS limit. Upcoming native clients will use direct HTTP request since they don’t have CORS limitation.

### Event-Sourcing and CRDT

The source of truth in client is a list of changes (action’s log). An action is an JSON object like:

```json
{
  "type": "feeds/changed",
  "id": "kc4VfXpvw3vZZBu_ugGlC",
  "fields": {
    "reading": "slow"
  }
}
```

To render UI, client reduces actions from the log into the state (objects of feeds, posts, etc). We store state cache in [Nano Stores](https://github.com/nanostores/nanostores).

The log simplifies synchronization. We just need to track last synchronized action and send all actions after that one.

We are using [Logux](https://logux.org/) to work with log and log’s synchronization.

### Client Core: Reusing All Logic Between Different Platforms

For now, we have only web client. But we want to have native clients for different platforms.

To make client porting easier, we separate core logic and UI. Core logic will be the same for every client. Client just needs to bind this logic to UI using native components.

We write logic in JavaScript as smart stores in [Nano Stores](https://github.com/nanostores/nanostores) state manager. Client needs to subscribe to store changes and render UI according to the store.

We try to move to store as much as possible: app routing, validations, UI helpers. The client should as thin as possible. The ideal client is just UI renderer.

Core depends on the platform environment (like storage to store settings). Before using any store, client must call [`setEnvironment`](./core/environment.ts) to define how core should interact with platform.

## Project Structure

Slow Reader is local-first app: clients do most of the work. Server is just syncing data between user’s devices (with end-to-end encryption).

Main folders:

- **Clients.**
  - [`core/`](./core/): shared logic between clients and i18n translations. Clients for specific platform should be a simple UI around this core to simplify supporting many platforms.
    - See **[`core/README.md`](./core/README.md)** for core architecture.
  - [`web/`](./web/): version of Slow Reader to be run in the browser. Both for desktop and mobile.
    - See **[`web/README.md`](./web/README.md)** for web client architecture.
- [`server/`](./server/): small server to sync data between user’s devices.
- [`proxy/`](./proxy/): HTTP-server to proxy all RSS fetching request from web client. User could use it to bypass censorship or to try web client before they install upcoming extension (to bypass CORS limit of web app).
- [`api/`](./api/): types and constants shared between clients and server.
- [`docs/](./docs/): guides for developers.

Other:

- [`scripts/`](./scripts/): scripts to test project. Check script’s descriptions for further details.
- [`.github/`](./.github/): scripts to test projects on CI on every commit or every day.
- [`.husky/`](./.husky/): scripts to call on `git commit` command to avoid popular errors.
- [`.vscode/`](./.vscode/): VS Code settings to reduce code format errors for new contributors.

We are using [pnpm’s monorepo](https://pnpm.io/workspaces). Each project has own dependencies, tools, configs.

## Tools

- [TypeScript](./tsconfig.json) for strict type checking.
- [Prettier](./.prettierrc) to use the same code style formatting.
- [ESLint](./eslint.config.js) to check for popular mistakes in JavaScript.
- [asdf](./.tool-versions) to synchronize Node.js and pnpm versions across the team and CI.

## Scripts

- `pnpm test`: run all tests.
- `pnpm start`: run proxy and web client development server.
- `pnpm format`: run code style formatting tool for all files.
- `pnpm clean`: remove all temporary files.

We use pnpm’s feature to run scripts in parallel by having scripts like `test:types`, `test:audit` and then run all those scripts by prefix.

## Synchronization Protocol

We are using [Logux WebSocket protocol](https://logux.org/protocols/ws/spec/) to synchronize actions between clients and server.

Clients keep list of changes (action log) as the source of truth and then send new actions to the server. Then server sends all new actions to other clients.

The server doesn’t see those actions, because clients encrypt them before sending and decrypt on receiving. The server see only actions like:

```js
// Add encrypted action to the server log
{
  "type": "0",
  "d": "encrypted data",
  "iv": "random vector used together with password in encryption"
}
```

```js
// Remove action from server log
{
  "type": "0/clean",
  "id": "action ID"
}
```

## Client Storage

The clients store list of changes (action log). During the start, client reduce all necessary actions from the log to the [Logux SyncMap store](https://logux.org/web-api/#globals-syncmaptemplate).

For simple things like client’s settings we use [Nano Store Persistent](https://github.com/nanostores/persistent).

Web client uses IndexedDB to store log and `localStorage` for client’s settings.

## Test Strategy

If any mistake happens few times we should add automatic tool to **prevent mistake** in the future. Possible strategies:

1. Types.
2. [Scripts](./scripts/), custom ESLint and Stylelint plugins.
3. Unit-tests.
4. [Pull request checklist](./docs/pull_request_template.md).

Any **code-style** rule should be implemented as `pre-commit` hook or linter’s rule.

Types should try to use precise **types** and explain data relations with them:

```diff
- { type: string, error?: Error }
+ { type: 'error', error: Error } | { type: 'ok' }
```

We are using unit tests for **client core**. We mock network request and platform environment, but emulate user interaction and test all stores composition.

For platform’s clients, we mostly use **visual tests**. But they could be complex and test the whole pages with mocking core’s stores.

## Visual Language

We should prefer platform’s native look at feel where it is possible.

Where it is not possible, we should use old style 3D with rich visual feedback and using z-axis.

Slow mode should always use yellow newspaper like background (on color screens).

We are using [Material Design Icons](https://pictogrammers.com/library/mdi/) icons.
