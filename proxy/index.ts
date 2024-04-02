import { createServer } from 'node:http'
import pico from 'picocolors'

const server = createServer(async (req, res) => {
  let url = decodeURIComponent(req.url!.slice(1))
  let sent = false

  try {
    let proxy = await fetch(url, {
      headers: {
        ...(req.headers as HeadersInit),
        host: new URL(url).host
      },
      method: req.method
    })

    res.writeHead(proxy.status, {
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
      'Access-Control-Allow-Origin': '*',
      'Content-Type': proxy.headers.get('content-type') ?? 'text/plain'
    })
    sent = true
    res.write(await proxy.text())
    res.end()
  } catch (e) {
    if (e instanceof Error) {
      process.stderr.write(pico.red(e.stack) + '\n')
      if (!sent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('Internal Server Error')
      }
    } else if (typeof e === 'string') {
      process.stderr.write(pico.red(e) + '\n')
    }
  }
})

server.listen(5284, () => {
  process.stderr.write(pico.green('Proxy server running on port 5284\n'))
})
