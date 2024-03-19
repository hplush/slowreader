# Slow Reader Web

_See the [full architecture guide](../README.md) first._

We use **Svelte** as the UI framework and **Vite** as the builder.

- [`main/`](./main): app entry point and global things like design tokens.
  - [`colors.css`](./main/colors.css): color tokens.
  - [`common.css`](./main/common.css): other design tokens.
  - [`reset.css`](./main/reset.css): CSS reset to minimize the difference between browser.
  - [`index.css`](./main/index.css): global styles.
  - [`index.ts`](./main/index.ts): JS entry point.
  - [`environment.ts`](./main/environment.ts): how client core should work with browser environment.
  - [`browser.ts`](./main/browser.ts): connect core stores to global browser settings like `document.title` or dark/light theme class on `<html>`.
- [`pages/`](./pages/): Svelte components for pages.
- [`ui/`](./ui/): shared components between different pages. Some people call it “UI kit”.
- [`public/`](./public/): static files like favicon and manifests.
- [`stores/`](./stores/): web client’s own smart stores. For instance, router on top of URL using [Nano Stores Router](https://github.com/nanostores/router).
- [`postcss/`](./postcss/): [PostCSS](https://postcss.org/) plugins to check CSS and optimize it. Check the plugin’s descriptions for more information.
- [`stories/`](./stories/): visual tests for pages and UI components by [Storybook](https://storybook.js.org/). The main way to test web client.
- [`scripts/`](./scripts/): scripts to check for popular errors and optimize files after Vite build. Check the script’s descriptions for further details.
- [`test/`](./test/): unit tests for some isolated parts of the web client.
- `web/dist/`: `pnpm build` will build the result here for deployment.
- [`.storybook/`](./.storybook/): Storybook’s config.
- [`index.html`](./index.html): builder entry point. It also contains styles for the app loading state.
- [`.browserslistrc](./.browserslistrc): browsers, which we support. See [actual browsers list](https://browsersl.ist/#q=defaults+and+supports+es6-module).
- [`.size-limit.json`]: budget for JS bundles and whole webpage size. Don’t be afraid to tune the limit. We put it so tight that it makes you feel a small pain every time you add a significant amount of code.

## Tools

- [Storybook](https://storybook.js.org/): check styles for popular mistakes and keep code style formatting.
- [Size Limit](https://github.com/ai/size-limit/): prevent accidental bloat of JS bundle size, for instance, by adding a big dependency.
- [Browserslist](https://github.com/browserslist/browserslist): the single config with target browsers for team and all tools.
- [KeyUX](https://github.com/ai/keyux): keyboard hotkeys and focus management tool around `aria-` attributes.

## Scripts

- `cd web && pnpm test`: run web client tests.
- `cd web && pnpm visual`: run visual test server.
- `cd web && pnpm start`: start web client development server.
- `cd web && pnpm production`: start web client production build locally.
- `cd web && pnpm build`: build production files in `web/dist/`.
- `cd web && pnpm size`: check the JS bundle size of the production build.

## Design System

All **colors** must be declared in [`main/colors.css`](./main/colors.css). We are using [Harmony Color Palette](https://github.com/evilmartians/harmony) and `oklch()` format.

**Sizes** and paddings should use `--padding-s`…`--padding-xl` tokens from [`main/common.css`](./main/common.css).

**Fonts** are declared in the same [`main/common.css`](./main/common.css). We are using system font to support all different writing systems in posts.

For **icons**, we use [Material Design Icons](https://pictogrammers.com/library/mdi/) and [`<Icon>`](./ui/icon.svelte) component.

```svelte
<script lang="ts">
  import { mdiAccount } from '@mdi/js'
</script>

<Icon path={mdiAccount} />
```

## Test Strategy

Since clients don’t have much logic (we moved logic to the client core), we don’t need to use unit tests.

We can use only visual tests to test web clients’ UI. We are using **Storybook** and **[Chromatic snapshots](https://www.chromatic.com/builds?appId=65678843aa11589739e8fbee)**.

But those visuals can be very complex. We do not just test buttons in different states. We test whole pages by mocking network requests and store states. We use small JS in stories to test animations or some JS code.

You can use [`<Scene>`](./stories/scene.svelte) to change core stores and mock HTTP.

Since we use a free plan, we run Chromatic only once daily on CI.
