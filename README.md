# Slow Reader

Web app to combine feeds from social networks and RSS and to help read more meaningful and deep content.

Right now, it is just a _prototype_. We plan to have features:

- Combine all feeds (social media, RSS) in a single app.
- Track how each subscription is useful for you.
- Split subscriptions to **slow** (something useful, deep) and **fast-food** (fun and small).
- Spend more time on slow content by blocking fast in the evening, etc.

Pre-alpha prototype: [`dev.slowreader.app`](https://dev.slowreader.app/)

**[↬ How to contribute and join the team](./CONTRIBUTING.md)**

To ask any question: **[h+h lab Discord](https://discord.gg/TyFTp6mAZT)**

---

- [License](#license)
- [Principles](#principles)
  - [Local-First: Clients Do All the Job](#local-first-clients-do-all-the-job)
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
- [Dependencies](#dependencies)
  - [JS](#js)
  - [GitHub Actions](#github-actions)
  - [Update](#update)
- [Deploy](#deploy)
- [Guides](#guides)

## License

Slow Reader is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License (version 3 or any later). For details, see the [`LICENSE.md`](./LICENSE.md) file in this directory.

## Principles

### Local-First: Clients Do All the Job

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
- [`extension/`](./extension/): browser’s extension to avoid CORS limits in web client.
- [`api/`](./api/): types and constants shared between clients and server.
- [`docs/`](./docs/): guides for developers.
- [`scripts/`](./scripts/): scripts to test project and configure Google Cloud. Check the script’s descriptions for further details.
- [`loader-tests/`](./loader-tests/): integration tests for each social network or news format.
- [`.devcontainer`](./.devcontainer/): `Dockerfile` and configs to run project in Docker/Podman image on developer’s machine. It increases security (malicious dependency will not have access to the whole machine) and simplify onboarding. We have configs for Docker and [Podman](https://podman.io) (more secure version of Docker).
- [`.github/`](./.github/): scripts to test projects on CI.
- [`.husky/`](./.husky/): scripts to call on `git commit` command to avoid popular errors.
- [`.vscode/`](./.vscode/): VS Code settings to reduce code format errors for new contributors.

We are using [pnpm monorepo](https://pnpm.io/workspaces). Each project has its dependencies, tools, and configs. Read `README.md` in each project for project’s files and architecture.

## Tools

Global development tools:

- [Dev Container](https://containers.dev) to use the same environment for all developers and isolate project from developer’s machine.
- [Prettier](./.prettierrc.json) to use the same code style formatting.
- [TypeScript](./tsconfig.json) for strict type checking.
- [ESLint](./eslint.config.ts) to check for popular mistakes in JavaScript.
- [remark](./.remarkrc) to find mistakes in `.md` files.

Each project has its own tools, too.

## Scripts

- `pnpm test`: run all tests.
- `pnpm offline`: run all tests expect which need Internet. It is useful for developing in airplane/train.
- `pnpm start`: run proxy and web client development server.
- `pnpm format`: fix code style in all files.
- `pnpm clean`: remove all temporary files.
- `pnpm check-opml`: test loaders with user’s OPML RSS export.
- `pnpm test-loaders`: test loaders with different blogging platforms.
- `pnpm update-env`: check for Node.js and pnpm updates.

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

The clients store a list of changes (action log). Durin
console.log(client1.log.entries())g the start, the client reduces all necessary actions from the log to the [Logux SyncMap stores](https://logux.org/web-api/#globals-syncmaptemplate).

For simple things like client local settings, we use [Nano Store Persistent](https://github.com/nanostores/persistent).

The web client uses IndexedDB to store log and `localStorage` for the client’s settings.

## Test Strategy

If any mistake happens a few times, we should add an automatic tool to **prevent mistakes** in the future. Possible strategies:

1. Types.
2. [Scripts](./scripts/), custom ESLint or Stylelint plugins.
3. Tests.
4. [Pull request checklist](./docs/pull_request_template.md).

Any **code-style** rule should be implemented as a `pre-commit` hook or linter’s rule.

Types should try to use precise **types** and explain data relations with them:

```diff
- { type: string, error?: Error }
+ { type: 'ok' } | { type: 'error', error: Error }
```

We are using [integration tests for **client core**](./core/README.md#test-strategy). We mock network requests and the platform environment, but emulate user interaction and test the composition of all stores. As the result it is a little closer to integration tests rather than unit tests (by using high level APIs of pages/popups instead of simple functions).

For the platform’s clients, we mostly use **visual tests**. But they could be complex and test the whole pages with mocking core’s stores.

## Visual Language

We prefer the platform native look and feel where possible.

Where not possible, we use old-style 3D with rich visual feedback and a z-axis.

The slow mode should always use a yellow newspaper-like background (on color screens).

We are using [Material Design Icons](https://pictogrammers.com/library/mdi/) icons.

We prefer [natural non-linear shadows](https://www.joshwcomeau.com/css/designing-shadows/) for shadows more than 3 pixels.

On desktops, we care not only about mouse UX but also about keyboard UX. Our keyboard UX rules:

- Create a path: what keys can the user press to do some action? Try to make the path shorter.
- Make hotkeys and non-standard keys visible to the user.
- Think about focus. If the user starts to interact with the keyboard, move the focus to the next control.
- <kbd>Esc</kbd> should work in as many cases as possible.
- Don’t use only <kbd>Tab</kbd> to navigate. Mix it with arrows and hotkeys for list items.

## Dependencies

### JS

How we choose dependencies:

1. Always checking alternatives from npm search, not just take the most popular one.
2. By project activity looking at their repository/issues/PR.
3. By JS bundle size for web client dependency.
4. By `node_modules` size and number of sub-dependencies.

You can use [pkg-size.dev](https://pkg-size.dev) to get bundle, `node_modules`, and sub-dependencies.

After adding a web client dependency, do not forget to call `cd web && pnpm size` to check the real size of dependency in our JS bundle.

We put to `dependencies` only dependencies we need for production deploy. All other dependencies you should put to `devDependencies`. During production deploy we will use `pnpm install --prod` to reduce security risks of having malicious code in some dependency.

We are using in `package.json` `1.0.0` version requirement and not `^1.0.0` to not get unexpected dependencies updates (at least, direct dependencies) if we will break the pnpm lock file. The `./scripts/check-versions.ts` in `pre-commit` hook will check that you do not forget this rule.

### GitHub Actions

For security reasons we are pinning actions in [GitHub workflows](./.github/workflows/) by hash, rather than by version.

We have `pinact` tool to pin and update versions. If you need to add some action, just add it as `uses: some/action@v1.0.0` and then run:

```sh
pinact run
```

We are using [Harden Runner](https://docs.stepsecurity.io/harden-runner) to enforce network host allow-list for security reasons. If you need new domain, add it to the list in first `Harden the runner` step of your workflow.

### Update

We try to use progressive approach and update dependencies often (every month).

To update all dependencies:

```sh
# Update Node.js and pnpm
pnpm update-env

# Update Docker base images
./scripts/pin-docker.sh

# Update GitHub actions
pinact run --update

# Update Node.js dependencies
pnpm update --interactive --latest -r --include-workspace-root
pnpm update -r --include-workspace-root
```

By default `update-env` will keep Node.js major version, but it can update to next major by `pnpm update-env --major` argument.

If you need just to update specific Node.js dependency:

```sh
pnpm update DEPENDENCY
```

## Deploy

We prefer to use Docker containers (instead of lambda functions and other cloud vendor lock-ins) to be able to change cloud in any moment.

We also need to think about self-hosted solutions. Ideally it should one Docker image to run everything.

Self-hosted users, and we should use environment variable to configure images.

We should make Docker images as small as possible to reduce attack surface. We recommend:

- Use distroless images without package manager and CLI tools.
- Use multi-stage build if we need package manager.
- Prefer to install only binaries we really use, instead of using big base images with many non-relevant tools.

See [`proxy/Dockerfile`](./proxy/Dockerfile) as an example.

All projects have `./script/run-image.sh` script to build production image and run it. We recommend installing Podman instead of Docker for security reasons.

If you need to debug Docker image, add `-dev` to base image.

Don’t forget necessary files to `.dockerignore` since we are using allow-list there.

## Guides

- [How to Add New Page to Web Client?](./docs/new_page.md)
