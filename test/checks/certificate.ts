// Check that TLS certificate will not expire soon because of broken renewal

import { connect } from 'node:tls'

import { fail, grade, pass } from './utils.ts'

function getExpiration(host: string): Promise<Date> {
  return new Promise((resolve, reject) => {
    let socket = connect({ host, port: 443, servername: host }, () => {
      resolve(new Date(socket.getPeerCertificate().valid_to))
      socket.end()
    })
    socket.setTimeout(10_000, () => {
      socket.destroy(new Error('Timeout'))
    })
    socket.on('error', reject)
  })
}

export async function checkCertificate(hosts: string[]): Promise<boolean> {
  let results = []
  for (let host of hosts) {
    try {
      let days = Math.floor(
        ((await getExpiration(host)).getTime() - Date.now()) / 86_400_000
      )
      if (days < 7) {
        results.push(
          fail(`Certificate of ${host} expires in ${grade(`${days} days`)}`)
        )
      } else {
        results.push(
          pass(`Certificate of ${host} is valid for ${grade(`${days} days`)}`)
        )
      }
    } catch (e) {
      results.push(fail(`Certificate of ${host} failed: ${String(e)}`))
    }
  }
  return results.every(Boolean)
}
