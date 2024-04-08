import http from 'http'
import { after, before } from 'node:test'

const __testServers: {
  [key: string]: {
    server: http.Server
    address: string
    port: number
    baseUrl: string
  }
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
  opts?: { protocol?: string; port?: number }
) {
  await before(async () => {
    const port = opts?.port || 0
    const protocol = opts?.protocol || 'http'

    // port=0 is <any free port>
    const testServerInstance = await server.listen(port)
    // @ts-ignore
    const addressInfo: { address: string; family: string; port: number } =
      testServerInstance.address()

    const testServerAddress =
      addressInfo?.address === '::' ? 'localhost' : addressInfo.address
    const testServerPort = addressInfo?.port

    __testServers[name] = {
      server: testServerInstance,
      address: testServerAddress,
      port: testServerPort,
      baseUrl: `${protocol}://${testServerAddress}:${testServerPort}`
    }
  })

  await after(async () => {
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
export function getTestHttpServer(name: string) {
  return __testServers[name]
}
