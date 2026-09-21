// Check DNS best practices like DNSSEC and CAA by NsLookup.io DNS health audit

import { fail, grade, link, pass } from './utils.ts'

interface Health {
  categories: Record<string, { checks: Check[] }>
  score: number
}

interface Check {
  label: string
  pass: boolean | null
  severity: 'critical' | 'info' | 'warning'
}

export async function checkDnsHealth(hosts: string[]): Promise<boolean> {
  let results = []
  for (let host of hosts) {
    let report = `https://www.nslookup.io/domains/${host}/dns-health/`
    let response = await fetch(
      `https://www.nslookup.io/api/v1/dns-health/${host}`
    )
    if (!response.ok) {
      results.push(fail(`NsLookup.io can not audit DNS of ${host}`))
      continue
    }
    let health = (await response.json()) as Health
    // We do not send or receive mail on these domains
    let skip = ['mx']
    // Subdomains have no own NS records, so every nameserver check fails
    if (host.split('.').length > 2) skip.push('nsConfig')
    let broken = Object.entries(health.categories)
      .filter(([name]) => !skip.includes(name))
      .flatMap(([, category]) => category.checks)
      .filter(check => check.pass === false && check.severity !== 'info')
    if (broken.length > 0) {
      let list = broken.map(check => `  ${check.label}`).join('\n')
      results.push(
        fail(
          `DNS health of ${host} is ${grade(health.score)}:\n${list}\n  ${link(report)}`
        )
      )
    } else {
      results.push(pass(`DNS health of ${host} is ${grade(health.score)}`))
    }
  }
  return results.every(Boolean)
}
