# Slowreader Extension

Browser’s extensions to allow web client bypass CORS limit.

_See the [full architecture guide](../README.md) first._

- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
  - [Chrome](#chrome)
  - [Firefox](#firefox)
  - [Safari](#safari)
- [Host Access](#host-access)
- [Security](#security)
- [Using the Extension in the Main Application](#using-the-extension-in-the-main-application)
- [Publishing](#publishing)

## Project Structure

- [`api.ts`](./api.ts): message types between the app, the content script, and the background.
- [`content.ts`](./content.ts): content script on the app’s page, bridge between the app and the background.
- [`background.ts`](./background.ts): background script, makes the requests.
- [`options.ts`](./options.ts) and [`options.html`](./options.html): page to grant access to the feeds’ sites.
- [`manifest.ts`](./manifest.ts): manifest for all browsers.
- [`build.ts`](./build.ts): builder, writes `dist/` for every browser.
- [`_locales/`](./_locales/): translations of the extension’s own UI.

## Scripts

- `pnpm -F extension start` to build the extension and watch the changes.
- `pnpm -F extension build` to build the extension for production.

## Architecture

Firefox and Safari have no Chrome’s `externally_connectable`, so we need more complicated communication process.

```text
app → window.postMessage → content script → port → background → CORS's free fetch()
```

- [Content script](./content.ts) is the extension’s script, which the browser injects into the Slow Reader pages from `content_scripts.matches`. It sees the page’s DOM and `window`, but not the page’s JS variables.
- Port is a two-way channel between the extension’s parts, opened by `chrome.runtime.connect()`. The page can’t open it, only the content script can. Its messages are JSON, not structured clone, so the response body travels as base64.
- [Background](./background.ts) is the extension’s own script without any page. Only it can make requests without the CORS limit. Chrome runs it as a service worker, Firefox and Safari as an event page. The manifest declares both ways, and the code uses only APIs, which work in both.

The app and the content script are in the same tab, but in different JS worlds. `window.postMessage()` is the only way between them, and both sides check `event.origin`.

## Quick Start

Run `pnpm -F extension start` first. It writes `dist/` with the development manifest, where the content script matches `http://localhost:2553/*`.

### Chrome

1. Open `chrome://extensions/` → `Load unpacked` and choose the `dist/` folder.
2. Run the web client and open `http://localhost:2553`.

Re-build by the update button in the extension’s block. Logs are behind the `Inspect views: service worker` link.

### Firefox

1. Open `about:debugging#/runtime/this-firefox` → `Load Temporary Add-on` and choose `dist/manifest.json`.
2. Run the web client.

The add-on is removed on the browser restart. `Inspect` opens the console of the event page.

### Safari

Safari takes only extensions inside a macOS or iOS app, so it needs macOS with Xcode:

```sh
xcrun safari-web-extension-converter extension/dist
```

Then in Xcode run the generated app and enable the extension in `Safari` → `Settings` → `Extensions`. Turn on `Allow unsigned extensions` in the develop menu for development builds.

## Host Access

The extension asks for `*://*/*` since feeds live on any host.

Chrome grants it on the install. Firefox shows it in the install prompt since Firefox 127, but the user can revoke it later. Safari asks per site and grants nothing by default.

The user can also revoke the access later, or grant it only for a day in Safari. The background re-checks the access on every failed request and answers `restricted`, so the app switches back to the proxy and shows the note again instead of blaming the feed.

Without access `fetch()` fails on every feed. To avoid silent errors, the background answers the app with `granted: false`, the app falls back to the proxy and shows the button to open the options page, where the user can grant access back.

## Security

The `*://*/*` access is wide, so the background limits what the app can ask for:

- Only `GET` and `HEAD` to `http:` and `https:` URLs.
- `credentials: 'omit'`, so the request never carries the user’s cookies. The extension reads feeds as an anonymous visitor, and XSS on the app’s page can’t use it to read the user’s private pages on other sites.
- Only `Accept`, `Accept-Language`, `If-Modified-Since`, and `If-None-Match` from the app’s headers. Add the header here when a loader needs a new one.

The extension asks for no other permission: no `scripting`, `tabs`, `cookies`, or `webRequest`. It can’t read the user’s other tabs or inject anything into them, and the content script runs only on the app’s own origin.

## Using the Extension in the Main Application

The content script says hello on the page load. Since it starts before the app, the app also pings it:

```ts
window.postMessage(
  { to: 'slowreader-extension', type: 'ping' },
  location.origin
)
```

Both answers are the same message with the host access state:

```ts
window.addEventListener('message', event => {
  if (event.source !== window || event.origin !== location.origin) return
  if (event.data?.to !== 'slowreader-app') return
  // { granted: true, to: 'slowreader-app', type: 'connected' }
})
```

Every request takes an ID to match the answer, and the app can abort it by the same ID.

See possible messages in [types API](./api.ts) and the client’s side in [`web/main/extension.ts`](../web/main/extension.ts).

## Publishing

Run `pnpm -F extension build` and zip the content of the `dist/` folder.

- Chrome: [Chrome Web Store guide](https://developer.chrome.com/docs/webstore/publish).
- Firefox: [addons.mozilla.org guide](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/). The ID is fixed in `browser_specific_settings.gecko`.
- Safari: convert the build by `safari-web-extension-converter`, then publish the wrapper app to the App Store. It needs a paid Apple Developer account.
