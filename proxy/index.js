import http from 'node:http'
import pico from 'picocolors'

const server = http.createServer(async (req, res) => {
  let url = decodeURIComponent(req.url.slice(1))
  let sent = false

  try {
    let proxy = await fetch(url, {
      headers: {
        ...req.headers,
        host: new URL(url).host
      },
      method: req.method
    })

    res.writeHead(proxy.status, {
      ...proxy.headers,
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
      'Access-Control-Allow-Origin': '*'
    })
    sent = true
    res.write(await proxy.text())
    res.end()
  } catch (e) {
    process.stderr.write(pico.red(e.stack) + '\n')
    if (!sent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Internal Server Error')
    }
  }
})

server.listen(5284, () => {
  process.stderr.write(pico.green('Proxy server running on port 5284\n'))
})
