# Slow Reader Landings

Promotion materials.

_See the [full architecture guide](../README.md) first._

## Project Structure

- [`root/`](./root/): page on `/` with its own CSS and JS. The build renames `root.html` to `index.html`.
- [`images/`](./images/): AVIF sources for pages and prompts to generate them.
- [`vite/`](./vite/): Vite plugins of the build.
- [`scripts/`](./scripts/): tools to prepare the sources.
- [`postcss.config.ts`](./postcss.config.ts): PostCSS plugins for pages CSS, some of them are taken from [web client](../web/postcss/).
- `generated/`: resized images for `srcset`, made by the build.
- `dist/`: `pnpm build` will build the result here. Assets go to `landing/`, and smaller `srcset` images to `landing/small/`, which [web client](../web/.size-limit.json) keeps out of the page budget.

## Scripts

- `pnpm -F landings start`: watch and rebuild `dist/` on every change.
- `pnpm -F landings build`: build production files in `landings/dist/`.
- `pnpm -F landings save-images`: convert new PNG from generator in `images/*/` to AVIF source to store.

## Deploy

The [web client](../web/) copies `dist/` to its own build, and then [nginx](../web/nginx.conf) serves the landing on `/`.

The [server](../server/modules/assets.ts) keeps the app on `/` and serves the landing on `/docs/landings/`.
