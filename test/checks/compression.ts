// Check that pages are compressed better than by gzip

import { fail, pass, short } from './utils.ts'

export async function checkCompression(pages: string[]): Promise<boolean> {
  let results = []
  for (let url of pages) {
    let response = await fetch(url, {
      headers: { 'accept-encoding': 'br, zstd' }
    })
    await response.arrayBuffer()
    let used = response.headers.get('content-encoding')
    if (used !== 'br' && used !== 'zstd') {
      results.push(
        fail(`${short(url)} has ${used ?? 'no'} compression instead of zstd`)
      )
    } else if (!response.headers.get('vary')?.includes('Accept-Encoding')) {
      results.push(
        fail(`${short(url)} has no Vary: Accept-Encoding for caches`)
      )
    } else {
      results.push(pass(`${short(url)} is compressed by ${used}`))
    }
  }
  return results.every(Boolean)
}
