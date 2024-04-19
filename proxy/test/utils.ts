//  Use this function if you need to init local http server for testing. Express is supported. Server will be closed automatically after tests finish
//
//  Usage: in your *.test.ts file
//
//  await describe('test', async () => {
//  await initTestHttpServer('test', ...)
//
//  await test('test', async () => {
//    fetch(getTestHttpServer('test'))
//  })})
//

import type http from 'node:http'
import { after, before } from 'node:test'

interface TestServer {
  address: string
  baseUrl: string
  port: number
  server: http.Server
}

const testServers: {
  [key: string]: TestServer
} = {}

export async function initTestHttpServer(
  name: string,
  server: http.Server,
  opts?: { port?: number; protocol?: string }
): Promise<void> {
  before(async () => {
    // port=0 is <any free port>
    let port = opts?.port || 0
    let protocol = opts?.protocol || 'http'

    let testServerInstance = server.listen(port)

    let addressInfo: { address: string; family: string; port: number } =
      testServerInstance.address() as {
        address: string
        family: string
        port: number
      }

    let testServerAddress =
      addressInfo.address === '::' ? 'localhost' : addressInfo.address
    let testServerPort = addressInfo.port

    testServers[name] = {
      address: testServerAddress,
      baseUrl: `${protocol}://${testServerAddress}:${testServerPort}`,
      port: testServerPort,
      server: testServerInstance
    }
  })

  after(async () => {
    if (testServers[name]) {
      testServers[name]?.server.close()
      delete testServers[name]
    }
  })
}

export function getTestHttpServer(name: string): TestServer | undefined {
  return testServers[name]
}
