# Slow Reader Landings

Promotion materials.

_See the [full architecture guide](../README.md) first._

## Project Structure

- [`root/`](./root/): page on `/`.
- [`images/`](./images/): AI images and prompts to generate them.
- `dist/`: `pnpm build` will build the result here.

## Scripts

- `pnpm -F landings start`: watch and rebuild `dist/` on every change.
- `pnpm -F landings build`: build production files in `landings/dist/`.

## Deploy

The [web client](../web/) copies `dist/` to its own build, and then [nginx](../web/nginx.conf) serves the landing on `/`.

The [server](../server/modules/assets.ts) keeps the app on `/` and serves the landing on `/docs/landings/`.
