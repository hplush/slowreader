// Check that DNS answers are signed and public resolvers accept the signature

import { fail, pass, resolve } from './utils.ts'

export async function checkDnssec(hosts: string[]): Promise<boolean> {
  let results = []
  for (let host of hosts) {
    for (let [name, doh] of Object.entries({
      Cloudflare: 'https://cloudflare-dns.com/dns-query',
      Google: 'https://dns.google/resolve'
    })) {
      let answer = await resolve(doh, host, 'A')
      if (answer.Status === 2) {
        results.push(fail(`${name} DNS can not validate ${host} signature`))
      } else if (!answer.AD) {
        results.push(fail(`${name} DNS sees ${host} without DNSSEC signature`))
      } else {
        results.push(pass(`${name} DNS validated DNSSEC of ${host}`))
      }
    }
  }
  return results.every(Boolean)
}
