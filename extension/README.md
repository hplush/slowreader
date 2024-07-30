# Slowreader extension

## Tooling

- React + Vite
- [Typescript](https://github.com/hplush/slowreader/blob/main/tsconfig.json)
- Linters: [Prettier](https://github.com/hplush/slowreader/blob/main/.prettierrc), [ESLint](https://github.com/hplush/slowreader/blob/main/eslint.config.js)

## Scripts

- `pnpm install` to install dependencies
- `pnpm dev` to run the plugin in development mode
- `pnpm build` to build the plugin for production
- `pnpm lint` to run linters

## Quickstart

- Run `pnpm install` to install dependencies
- Run `pnpm dev` to build the extension and watch the changes
- Open `chrome://extensions/` -> `Load unpacked` and choose `dist` folder from this repo. The extension should appear in the list of your extensions
- In the `.env` file of the main app, place the next line (`EXTENSION_ID` can be found in the `ID` line inside the uploaded extension block):

```
VITE_EXTENSION_ID=<EXTENSION_ID>
```

- Run the main app

During the development process, you can re-build the extension by clicking on the update button at the right bottom of the extension's block.

You can see the console for errors and logs by clicking on the link at the line `Inspect views: service worker` in the extension's block.

## Using the extension in the main application

Connect the extension on application start:

```ts
const port = chrome.runtime.connect(import.meta.env.VITE_EXTENSION_ID)
```

Send messages to the extension to fetch data:

```ts
port.postMessage({
  url: 'https://example-url',
  options: { method: 'GET' }
})

port.onMessage.addListener(response => {
  console.log(response.data) // The extension will send the message with fetched data
})
```

Check if the extension was disconnected:

```ts
port.onDisconnect.addListener(() => {})
```

## Publishing

- In the `manifest.json` place `"https://dev.slowreader.app/*"` instead of `"http://localhost:5173/*"`

- Run `yarn build` to build the production files (will be located in `dist/`)

- Zip the content of the `dist/` folder

- [Follow this official guide to publish the extension in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)

- After the extension is published in the Chrome Web Store, add the <EXTENSION_ID> of the published extension as a prod env for the main app.
