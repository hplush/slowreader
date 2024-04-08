import type http from 'node:http'
import { after, before } from 'node:test'

interface TestServer {
  address: string
  baseUrl: string
  port: number
  server: http.Server
}

const __testServers: {
  [key: string]: TestServer
} = {}

/**
 * Use this function if you need to init local http server for testing. Express is supported. Server will be closed automatically after tests finish
 *
 * @example
 * Usage: in your *.test.ts file
 *
 * await describe('test', async () => {
 *   await initTestHttpServer('test', ...)
 *
 *   await test('test', async () => {
 *      fetch(getTestHttpServer('test'))
 *   })
 * })
 *
 * @param name
 * @param server
 * @param opts
 */
export async function initTestHttpServer(
  name: string,
  server: any,
  opts?: { port?: number; protocol?: string }
): Promise<void> {
  //
  before(async () => {
    let port = opts?.port || 0
    let protocol = opts?.protocol || 'http'

    // port=0 is <any free port>
    let testServerInstance = await server.listen(port)
    // @ts-ignore
    let addressInfo: { address: string; family: string; port: number } =
      testServerInstance.address()

    let testServerAddress =
      addressInfo.address === '::' ? 'localhost' : addressInfo.address
    let testServerPort = addressInfo.port

    __testServers[name] = {
      address: testServerAddress,
      baseUrl: `${protocol}://${testServerAddress}:${testServerPort}`,
      port: testServerPort,
      server: testServerInstance
    }
  })

  after(async () => {
    if (__testServers[name]) {
      // @ts-ignore
      __testServers[name].server.close()
      delete __testServers[name]
    }
  })
}

/**
 * Use it to get server initialized by initTestHttpServer function
 * @param name
 */
export function getTestHttpServer(name: string): TestServer | undefined {
  return __testServers[name]
}
