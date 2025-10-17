# Slow Reader Web Client

_See the [full architecture guide](../README.md) first._

- [Project Structure](#project-structure)
- [Tools](#tools)
- [Scripts](#scripts)
- [Design System](#design-system)
- [Test Strategy](#test-strategy)
- [Deploy](#deploy)

## Project Structure

We use **[Svelte](https://joyofcode.xyz/learn-svelte)** as the UI framework and **Vite** as the builder.

- [`main/`](./main): app entry point and global things like design tokens.
  - [`colors.css`](./main/colors.css): color tokens.
  - [`fonts.css`](./main/fonts.css): used fonts.
  - [`reset.css`](./main/reset.css): CSS reset to minimize the difference between browsers.
  - [`index.css`](./main/index.css): global styles.
  - [`index.ts`](./main/index.ts): JS entry point.
  - [`environment.ts`](./main/environment.ts): how client core should work with browser environment.
  - [`browser.ts`](./main/browser.ts): connect core stores to global browser settings like `document.title`.
- [`pages/`](./pages/): Svelte components for pages.
- [`ui/`](./ui/): shared components between different pages. Some people call it “UI kit”.
- [`public/`](./public/): static files like favicon and manifests.
- [`stores/`](./stores/): web client’s own smart stores. For instance, router on top of URL using [Nano Stores Router](https://github.com/nanostores/router).
- [`postcss/`](./postcss/): [PostCSS](https://postcss.org/) plugins to check CSS and optimize it. Check the plugin’s descriptions for more information.
- [`stories/`](./stories/): visual tests for pages and UI components by [Storybook](https://storybook.js.org/). The main way to test web client.
- [`scripts/`](./scripts/): scripts to check for popular errors, optimize files after Vite build, and deploy. Check the script’s descriptions for further details.
- [`test/`](./test/): unit tests for some parts of the web client.
- `dist/`: `pnpm build` will build the result here for deployment.
- [`.storybook/`](./.storybook/): visual tests tool config.
- [`index.html`](./index.html): builder entry point. It also contains styles for the app loading state.
- [`Dockerfile`](./Dockerfile) and [`nginx.conf`](./nginx.conf): web server to serve web client for staging and pull request preview servers.
- [`.browserslistrc`](./.browserslistrc): browsers, which we support. See [actual browsers list](https://browsersl.ist/#q=defaults+and+supports+es6-module).
- [`.size-limit.json`](./.size-limit.json): budget for JS bundles and whole webpage size. Don’t be afraid to tune the limit. We put it so tight that it makes you feel a small pain every time you add a significant amount of code.
- [`global.d.ts`](./global.d.ts): missed web platform types and fixes for Vite imports.

## Tools

- [Storybook](https://storybook.js.org/) to check styles for popular mistakes and keep CSS code style formatting.
- [Size Limit](https://github.com/ai/size-limit/) to prevent accidental bloat of JS bundle size, for instance, by adding a big dependency.
- [Browserslist](https://github.com/browserslist/browserslist) is the single config with target browsers for team and all tools.
- [KeyUX](https://github.com/ai/keyux) implements keyboard hotkeys and focus management around `aria-` attributes.

## Scripts

- `cd web && pnpm test`: run all web client tests.
- `cd web && pnpm visual`: run visual test server.
- `cd web && pnpm production`: start web client production build locally.
- `cd web && pnpm build`: build production files in `web/dist/`.
- `cd web && pnpm size`: check the JS bundle size of the production build.

## Design System

All **colors** must be declared in [`main/colors.css`](./main/colors.css).

**Fonts** are declared in [`main/fonts.css`](./main/fonts.css).

For **icons**, we use [Material Design Icons](https://pictogrammers.com/library/mdi/) and [`<Icon>`](./ui/icon.svelte) component.

```svelte
<script lang="ts">
  import { mdiAccount } from '@mdi/js'
</script>

<Icon path={mdiAccount} />
```

## Test Strategy

Since clients don’t have much logic (we moved logic to the client core), we don’t need to use unit tests.

We can use only visual tests to test web clients UI. We are using **[Storybook](https://storybook.js.org/)** and **[Chromatic snapshots](https://www.chromatic.com/builds?appId=65678843aa11589739e8fbee)**.

Since we use a free plan, we run Chromatic on CI only daily (or by commit with `Chromatic` in message in `main` branch).

We deploy the latest Storybook of `main` branch to staging: [dev.slowreader.app/ui/](https://dev.slowreader.app/ui/)

You can check Storybook of pull request by adding `/ui/` to the preview deploy URL: like <code>https://preview-100---staging-3ryqvfpd5q-ew.a.run.app<b>/ui/</b></code>

But those visuals can be very complex. We do not just test buttons in different states. We test whole pages by mocking network requests and stores states. We use small JS in stories to test animations or some JS code.

You can use [`<Scene>`](./stories/scene.svelte) to change core stores and mock HTTP.

We should cover with stories every page and every UI component which can be used by other developers. Storybook could be used to find UI component and by i18n team to check the context of the message. But you can avoid stories for low-level components used only by single page.

## Deploy

1. **Pull request preview:** the CI will publish a `View deployment` link to pull request events in 2 minutes.
2. **Staging**: `main` branch is on [`dev.slowreader.app`](https://dev.slowreader.app).

To return app HTML on app’s routes, we [export](./scripts/export-routes.ts) RegExp of all routes from web client to `routes.regexp` file and use it in [`nginx.conf`](./nginx.conf) or [Logux HTTP sever](../server/modules/assets.ts).

Both preview and staging have Storybook at `/ui/` route.

In staging and production are using **Google Cloud Run** to run nginx server with assets of web client. For pull request preview and self-hosted we use [Logux sever](../server/modules/assets.ts) to serve assets.

All Google Cloud settings are documented in [script](../scripts/prepare-google-cloud.sh).
