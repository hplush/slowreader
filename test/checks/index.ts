#!/usr/bin/env node
// Script to check DNS, HTTP, and search engines settings of the deploy

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { checkCompression } from './compression.ts'
import { checkDnsHealth } from './dns-health.ts'
import { checkHttp3 } from './http3.ts'
import { checkLighthouse } from './lighthouse.ts'
import { checkObservatory } from './observatory.ts'
import type { Site } from './utils.ts'
import { checkZeroRtt } from './zero-rtt.ts'

let sites = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'sites.json'), 'utf8')
) as Record<string, Site>

let hosts = Object.keys(sites)
let pages = Object.entries(sites).flatMap(([host, site]) =>
  site.paths.map(path => `https://${host}${path}`)
)

let results = [
  await checkObservatory(hosts),
  await checkLighthouse(sites),
  await checkHttp3(hosts, pages),
  checkZeroRtt(pages),
  await checkDnsHealth(hosts),
  await checkCompression(pages)
]

if (!results.every(Boolean)) process.exit(1)
