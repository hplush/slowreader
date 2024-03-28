import pico from 'picocolors'

import {
  loaders,
  type Loader,
  type LoaderName,
  type TextResponse
} from '@slowreader/core'

const supportedExtensions = ['.xml', '.opml']

export function isSupportedExt(path: string): boolean {
  return supportedExtensions.some(ext => path.endsWith(ext))
}

export function isString(attr: null | string): attr is string {
  return typeof attr === 'string' && attr.length > 0
}

export function getLoader(text: TextResponse): Loader | null {
  const loaderNames = Object.keys(loaders) as LoaderName[]
  for (let name of loaderNames) {
    if (loaders[name].isMineText(text) !== false) {
      return loaders[name]
    }
  }
  return null
}

interface PicoLogger {
  err(msg: string): void
  log(msg: string): void
  succ(msg: string): void
  warn(msg: string): void
}

export const picoLogger: PicoLogger = {
  err(msg) {
    this.log(pico.red(msg))
  },
  log(msg) {
    process.stderr.write(msg)
  },
  succ(msg) {
    this.log(pico.green(msg))
  },
  warn(msg) {
    this.log(pico.yellow(msg))
  }
}
