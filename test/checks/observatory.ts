// Check HTTP security headers by MDN HTTP Observatory.
// It scans only host’s root, other paths are checked by other tests.

import { fail, pass } from './utils.ts'

interface Scan {
  details_url: string
  error: null | string
  grade: null | string
  tests_failed: number
}

export async function checkObservatory(hosts: string[]): Promise<boolean> {
  let results = []
  for (let host of hosts) {
    let response = await fetch(
      `https://observatory-api.mdn.mozilla.net/api/v2/scan?host=${host}`,
      { method: 'POST' }
    )
    let scan = (await response.json()) as Scan
    if (scan.error) {
      results.push(fail(`Observatory can not scan ${host}: ${scan.error}`))
    } else if (scan.grade !== 'A+' || scan.tests_failed > 0) {
      results.push(
        fail(
          `Observatory grade of ${host} is ${scan.grade}\n  ${scan.details_url}`
        )
      )
    } else {
      results.push(
        pass(`Observatory grade of ${host} is A+\n  ${scan.details_url}`)
      )
    }
  }
  return results.every(Boolean)
}
