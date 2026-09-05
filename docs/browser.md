# How to Debug in Browser?

Dev Container has Firefox and Chromium with [Playwright MCP](https://github.com/microsoft/playwright-mcp) server. LLM uses them to check visual issues and to debug client database.

## Run Application

```sh
pnpm start
```

Web client will be on `http://localhost:2553`.

Storybook is a separate process:

```sh
pnpm -F web visual
```

## Open Story

Open story without Storybook UI to keep screenshot clean:

```text
http://localhost:2555/iframe.html?id=STORY_ID&globals=theme:light
```

Story IDs are in `http://localhost:2555/index.json`. Themes are `theme:light` and `theme:dark`.

## Record Steps

`--caps devtools` adds `browser_start_tracing`, `browser_stop_tracing`, and video tools. Record long scenario to get DOM snapshots, console, and network for every step.

## Debug Extension

Playwright browsers don’t load the extension. Use own Chrome or Firefox profile:

```sh
pnpm -F extension start
```

Then load `extension/dist` by `Load unpacked` in `chrome://extensions/` or `extension/dist/manifest.json` by `Load Temporary Add-on` in `about:debugging#/runtime/this-firefox`. See [extension guide](../extension/README.md) for Safari and for the host access errors.

## Reset State

Browser profile keeps cookies, `localStorage`, and IndexedDB between sessions:

```sh
rm -rf ~/.local/share/playwright-chromium ~/.local/share/playwright-firefox
```

Screenshots and session logs are in `~/.local/share/playwright-output`.
