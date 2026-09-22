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

async function audit(host: string): Promise<Health | undefined> {
  let response = await fetch(
    `https://www.nslookup.io/api/v1/dns-health/${host}`
  )
  if (!response.ok) return
  return (await response.json()) as Health
}

function report(host: string): string {
  return link(`https://www.nslookup.io/domains/${host}/dns-health/`)
}

export async function checkDnsHealth(hosts: string[]): Promise<boolean> {
  let results = []
  for (let host of hosts) {
    let health = await audit(host)
    if (!health) {
      results.push(fail(`NsLookup.io can not audit DNS of ${host}`))
      continue
    }
    // We do not send or receive mail on these domains
    let skip = ['mx']
    let zone = host.split('.').slice(-2).join('.')
    // Subdomain is a record inside the zone, not a zone of its own.
    // DNSSEC keys, DS and CAA are set on the zone and cover the subdomain,
    // and NS records checks look for a delegation the subdomain has not.
    if (zone !== host) skip.push('nsConfig', 'dnssec', 'caa')
    let categories = Object.entries(health.categories).filter(
      ([name]) => !skip.includes(name)
    )
    let links = [report(host)]
    let score = grade(health.score)
    if (zone !== host) {
      let apex = await audit(zone)
      if (!apex) {
        results.push(fail(`NsLookup.io can not audit DNS of ${zone}`))
        continue
      }
      categories.push(
        ...Object.entries(apex.categories).filter(
          ([name]) => name === 'dnssec' || name === 'caa'
        )
      )
      links.push(report(zone))
      score += `, zone ${zone} is ${grade(apex.score)}`
    }
    let broken = categories
      .flatMap(([, category]) => category.checks)
      .filter(check => check.pass === false && check.severity !== 'info')
    if (broken.length > 0) {
      let list = broken.map(check => `  ${check.label}`).join('\n')
      results.push(
        fail(
          `DNS health of ${host} is ${score}:\n${list}\n  ${links.join('\n  ')}`
        )
      )
    } else {
      results.push(pass(`DNS health of ${host} is ${score}`))
    }
  }
  return results.every(Boolean)
}
