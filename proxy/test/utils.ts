import type http from 'node:http'
import { after, before } from 'node:test'

interface TestServer {
  address: string
  baseUrl: string
  port: number
  server: http.Server
}

const TEST_SERVERS: Record<string, TestServer> = {}

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

    TEST_SERVERS[name] = {
      address: testServerAddress,
      baseUrl: `${protocol}://${testServerAddress}:${testServerPort}`,
      port: testServerPort,
      server: testServerInstance
    }
  })

  after(async () => {
    if (TEST_SERVERS[name]) {
      TEST_SERVERS[name]?.server.close()
      delete TEST_SERVERS[name]
    }
  })
}

export function getTestHttpServer(name: string): TestServer | undefined {
  return TEST_SERVERS[name]
}
