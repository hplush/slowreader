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
