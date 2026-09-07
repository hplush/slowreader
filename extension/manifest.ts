export type Target = 'chrome' | 'firefox' | 'safari'

/**
 * Chrome takes only `service_worker` and fails on `scripts`. Firefox has
 * no service workers, Safari runs `scripts` as an event page, which is easier
 * to debug. One manifest can’t fit them all.
 */
function background(target: Target): unknown {
  if (target === 'chrome') {
    return { service_worker: 'background.js' }
  } else {
    return { scripts: ['background.js'] }
  }
}

function settings(target: Target, local: boolean): object {
  if (target === 'firefox') {
    return {
      browser_specific_settings: {
        gecko: {
          data_collection_permissions: { required: ['none'] },
          /** Own ID keeps the local build next to the store’s one. */
          id: local ? 'local@slowreader.app' : 'extension@slowreader.app',
          strict_min_version: '128.0'
        }
      }
    }
  } else if (target === 'safari') {
    return {
      browser_specific_settings: {
        safari: {
          strict_min_version: '17.4'
        }
      }
    }
  } else {
    return {}
  }
}

export function manifest(local: boolean, target: Target): unknown {
  /** Match patterns have no port, so the pattern with it matches nothing. */
  let apps = local
    ? ['http://localhost/*', 'http://127.0.0.1/*']
    : ['https://*.slowreader.app/*']
  return {
    background: background(target),
    ...settings(target, local),
    content_scripts: [
      {
        js: ['content.js'],
        matches: apps,
        run_at: 'document_start'
      }
    ],
    default_locale: 'en',
    description: '__MSG_description__',
    /** Feeds live on any host and mostly have no CORS headers. */
    host_permissions: ['*://*/*'],
    icons: {
      '16': 'icons/16.png',
      '32': 'icons/32.png',
      '48': 'icons/48.png',
      '96': 'icons/96.png',
      '128': 'icons/128.png'
    },
    manifest_version: 3,
    /** The local build is easy to mix up with the store’s one in the browser. */
    name: local ? 'Slow Reader (local)' : '__MSG_name__',
    /** Firefox and Safari can revoke the host access, so the user needs a way
     * to grant it back. */
    options_ui: {
      open_in_tab: true,
      page: 'options.html'
    },
    version: '0.0.1'
  }
}
