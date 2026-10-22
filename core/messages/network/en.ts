import { i18n } from '../../i18n.ts'

export const networkMessages = i18n('network', {
  allowExtension: 'Allow the sites',
  cacheAlways: 'Always',
  cacheFree: 'Wi-Fi',
  cacheImages: 'Save images for offline',
  cacheNever: 'Never',
  cacheMediaReading: 'Save media of posts',
  cacheMediaReadingAll: 'All',
  cacheMediaReadingNone: 'None',
  cacheMediaReadingSlow: 'Useful',
  cacheVideos: 'Save videos for offline',
  extension: 'Extension',
  extensionDesc:
    'The browser makes the requests itself. It is the fastest way, ' +
    'and nobody in the middle knows what you read.',
  method: 'Network requests',
  offline: 'App works without network',
  offlineMode: 'Offline mode',
  noExtension:
    'The extension makes the requests right from your browser: it is ' +
    'faster, and nobody in the middle knows what you read.',
  installExtension: 'Install the extension',
  pageTitle: 'Network',
  installedExtension: 'If you installed the extension, reload the page.',
  reloadApp: 'Reload the app',
  proxy: 'Proxy',
  proxyDesc:
    'Our server makes the requests for you. Use it if the sites ' +
    'are blocked in your country.',
  restrictedExtension:
    'The extension has no permission to send requests to the sites ' +
    'with your feeds.'
})
