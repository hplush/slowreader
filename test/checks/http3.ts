// Check that clients open HTTP/3 on the first connection. Alt-Svc header
// asks them to reconnect, HTTPS DNS record saves that round trip.

import { execFileSync } from 'node:child_process'

import { fail, pass, resolve, short } from './utils.ts'

function getVersion(url: string): string {
  // Socket Firewall sends pnpm scripts through TCP proxy, HTTP/3 needs UDP
  let env = Object.fromEntries(
    Object.entries(process.env).filter(i => !/proxy|ssl_cert/i.test(i[0]))
  )
  try {
    return execFileSync(
      'curl',
      [
        '-sI',
        '--http3-only',
        '-m',
        '10',
        '-o',
        '/dev/null',
        '-w',
        '%{http_version}',
        url
      ],
      { env }
    )
      .toString()
      .trim()
  } catch {
    return 'none'
  }
}

export async function checkHttp3(
  hosts: string[],
  pages: string[]
): Promise<boolean> {
  let results = []
  for (let host of hosts) {
    let record = await resolve('https://dns.google/resolve', host, 'HTTPS')
    if (!record.Answer) {
      results.push(fail(`${host} has no HTTPS DNS record to start from HTTP/3`))
    }
    for (let answer of record.Answer ?? []) {
      let [, target, ...params] = answer.data.split(' ')
      if (target !== '.' && target !== `${host}.`) {
        results.push(fail(`HTTPS DNS record of ${host} points to ${target}`))
      } else if (!params.some(i => i.startsWith('alpn=') && i.includes('h3'))) {
        results.push(
          fail(`HTTPS DNS record of ${host} has no h3: ${answer.data}`)
        )
      } else {
        results.push(pass(`HTTPS DNS record of ${host} offers h3`))
      }
    }
  }
  for (let url of pages) {
    if (getVersion(url) === '3') {
      results.push(pass(`${short(url)} answers by HTTP/3`))
    } else {
      results.push(fail(`${short(url)} has no HTTP/3`))
    }
  }
  return results.every(Boolean)
}
