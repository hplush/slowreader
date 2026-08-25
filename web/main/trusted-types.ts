// SQLocal creates Web Worker for SQLite database by itself, so we can’t wrap
// worker’s URL into own Trusted Types policy. Default policy allows scripts
// only from our own origin.
if (window.trustedTypes && !window.trustedTypes.defaultPolicy) {
  window.trustedTypes.createPolicy('default', {
    createScriptURL(url) {
      if (new URL(url, location.href).origin !== location.origin) {
        throw new Error(`Blocked script from ${url}`)
      }
      return url
    }
  })
}
