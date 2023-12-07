import { readFile, writeFile } from 'node:fs/promises'
import postcss from 'postcss'

import cleaner from '../postcss/vars-cleaner.js'

let files = process.argv.slice(2)

await Promise.all(
  files.map(async path => {
    let css = await readFile(path)
    let fixed = await postcss([cleaner]).process(css, { from: path })
    await writeFile(path, fixed.css)
  })
)
