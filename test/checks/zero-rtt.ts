// Check that returning readers send the request with the first TLS packet.
// Without 0-RTT the request waits for the whole TLS handshake.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { fail, pass, short } from './utils.ts'

type EarlyData = 'accepted' | 'failed' | 'missing' | 'rejected'

function sclient(args: string[], input: string): string {
  try {
    return execFileSync('openssl', ['s_client', ...args], {
      input,
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 10000
    }).toString()
  } catch (error) {
    // s_client exits with 1 when the server closes the connection
    if (error instanceof Error && 'stdout' in error) {
      return Buffer.isBuffer(error.stdout) ? error.stdout.toString() : ''
    }
    return ''
  }
}

function sendEarlyData(url: string, dir: string): EarlyData {
  let { host, pathname } = new URL(url)
  let requestFile = join(dir, 'request.txt')
  let sessionFile = join(dir, 'session.pem')
  let request = `GET ${pathname} HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`
  writeFileSync(requestFile, request)
  let connect = ['-connect', `${host}:443`, '-servername', host]
  sclient(
    [...connect, '-tls1_3', '-ign_eof', '-sess_out', sessionFile],
    request
  )
  let resumed = sclient(
    [...connect, '-sess_in', sessionFile, '-early_data', requestFile],
    ''
  )
  if (resumed.includes('Early data was accepted')) return 'accepted'
  if (resumed.includes('Early data was rejected')) return 'rejected'
  if (resumed.includes('Early data was not sent')) return 'missing'
  return 'failed'
}

export function checkZeroRtt(pages: string[]): boolean {
  let dir = mkdtempSync(join(tmpdir(), 'slowreader-'))
  let results = []
  for (let url of pages) {
    let result: EarlyData = 'failed'
    // Ticket is single-use, server can reject it to prevent replay attack
    for (let i = 0; i < 3 && result !== 'accepted'; i++) {
      result = sendEarlyData(url, dir)
    }
    if (result === 'accepted') {
      results.push(pass(`${short(url)} answers to 0-RTT request`))
    } else if (result === 'rejected') {
      results.push(fail(`${short(url)} rejects 0-RTT requests`))
    } else if (result === 'missing') {
      results.push(fail(`${short(url)} has no 0-RTT in TLS session ticket`))
    } else {
      results.push(fail(`OpenSSL can not test 0-RTT of ${short(url)}`))
    }
  }
  rmSync(dir, { recursive: true })
  return results.every(Boolean)
}
