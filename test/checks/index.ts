#!/usr/bin/env node
// Script to check DNS, HTTP, and search engines settings of the deploy

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { checkCompression } from './compression.ts'
import { checkDnssec } from './dnssec.ts'
import { checkHttp3 } from './http3.ts'
import { checkObservatory } from './observatory.ts'
import { checkRobots } from './robots.ts'
import type { Site } from './utils.ts'

let sites = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'sites.json'), 'utf8')
) as Record<string, Site>

let hosts = Object.keys(sites)
let pages = Object.entries(sites).flatMap(([host, site]) =>
  site.paths.map(path => `https://${host}${path}`)
)

let results = [
  await checkObservatory(hosts),
  await checkHttp3(hosts, pages),
  await checkDnssec(hosts),
  await checkCompression(pages),
  await checkRobots(sites)
]

if (!results.every(Boolean)) process.exit(1)
