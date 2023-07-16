import { setRequestMethod } from '@slowreader/core'

function proxyUrl(url: string | URL): string {
  return 'http://localhost:5284/' + encodeURIComponent(url.toString())
}

let devProxy: typeof fetch = async (url, opts = {}) => {
  let originUrl: string
  if (typeof url === 'string' || url instanceof URL) {
    originUrl = url.toString()
    url = proxyUrl(url)
  } else {
    originUrl = url.url
    url = {
      ...url,
      url: proxyUrl(url.url)
    }
  }
  let response = await fetch(url, opts)
  Object.defineProperty(response, 'url', {
    value: originUrl
  })
  return response
}

setRequestMethod(devProxy)
