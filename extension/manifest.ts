export function manifest(dev: boolean): unknown {
  let app = dev ? 'http://localhost:2553/*' : 'https://*.slowreader.app/*'
  return {
    /**
     * Chrome takes only `service_worker`, Firefox has no service workers,
     * Safari runs `scripts` as an event page, which is easier to debug.
     */
    background: {
      scripts: ['background.js'],
      service_worker: 'background.js'
    },
    browser_specific_settings: {
      gecko: {
        id: 'extension@slowreader.app',
        strict_min_version: '128.0'
      },
      safari: {
        strict_min_version: '17.4'
      }
    },
    content_scripts: [
      {
        js: ['content.js'],
        matches: [app],
        run_at: 'document_start'
      }
    ],
    default_locale: 'en',
    description: '__MSG_description__',
    /** Feeds live on any host and mostly have no CORS headers. */
    host_permissions: ['*://*/*'],
    manifest_version: 3,
    name: '__MSG_name__',
    /** Firefox and Safari can revoke the host access, so the user needs a way
     * to grant it back. */
    options_ui: {
      open_in_tab: true,
      page: 'options.html'
    },
    version: '0.0.1'
  }
}
