# Slowreader Extension

Browser’s extensions to allow web client bypass CORS limit.

_See the [full architecture guide](../README.md) first._

## Scripts

- `cd extension && pnpm install` to install dependencies.
- `cd extension && `pnpm start` to run the plugin in development mode.
- `cd extension && pnpm build` to build the plugin for production.

## Quick Start

1. Run `cd extension && pnpm start` to build the extension and watch the changes.
2. Open `chrome://extensions/` → `Load unpacked` and choose `dist` folder from this repo. The extension should appear in the list of your extensions.
3. In the `.env` file of the main app, place the next line (`EXTENSION_ID` can be found in the `ID` line inside the uploaded extension block):

   ```
   VITE_EXTENSION_ID=EXTENSION_ID
   ```

4. Run the web client.

During the development process, you can re-build the extension by clicking on the update button at the right bottom of the extension’s block.

You can see the console for errors and logs by clicking on the link at the line `Inspect views: service worker` in the extension’s block.

## Using the Extension in the Main Application

Connect the extension on application start:

```ts
let port = chrome.runtime.connect(import.meta.env.VITE_EXTENSION_ID)
```

Send messages to the extension to fetch data:

```ts
port.postMessage({
  url: 'https://example-url',
  options: { method: 'GET' }
})

port.onMessage.addListener(response => {
  console.log(response.data) // The extension will send the message
})
```

Check if the extension was disconnected:

```ts
port.onDisconnect.addListener(() => {})
```

See possible messages in [types API](./api.ts).

## Publishing

1. Run `pnpm build` to build the production files (will be located in `dist/`)
2. Zip the content of the `dist/` folder
3. Follow [official guide](https://developer.chrome.com/docs/webstore/publish) to publish the extension in the Chrome Web Store.
4. After the extension is published in the Chrome Web Store, add the `EXTENSION_ID` of the published extension as a prod env for the web app.
