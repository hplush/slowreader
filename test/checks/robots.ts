// Check that search engines index only what we want them to index

import { fail, pass, type Site } from './utils.ts'

export async function checkRobots(
  sites: Record<string, Site>
): Promise<boolean> {
  let results = []
  for (let [host, site] of Object.entries(sites)) {
    let response = await fetch(`https://${host}/robots.txt`)
    let robots = await response.text()
    let rules = robots
      .toLowerCase()
      .split('\n')
      .map(i => i.trim())
    let closed =
      rules.includes('user-agent: *') && rules.includes('disallow: /')
    if (site.hidden && !closed) {
      results.push(fail(`Search engines can index ${host}:\n${robots}`))
    } else if (!site.hidden && closed) {
      results.push(fail(`Search engines can not index ${host}:\n${robots}`))
    } else if (site.hidden) {
      results.push(pass(`Search engines can not index ${host}`))
    } else {
      results.push(pass(`Search engines can index ${host}`))
    }
  }
  return results.every(Boolean)
}
