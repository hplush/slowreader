import { styleText } from 'node:util'
import proxy from './proxy.js'

const PORT = 5284

proxy.listen(PORT, () => {
  process.stdout.write(
    styleText('green', `Proxy server running on port ${PORT}`)
  )
})
