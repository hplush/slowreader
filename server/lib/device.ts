import { UAParser } from 'ua-parser-js'

/**
 * Only browser and OS names without versions, so the value can’t be used
 * to fingerprint the user. Result is `browser|os`, client translates it.
 */
export function getDevice(agent: string | undefined): string {
  let { browser, os } = UAParser(agent ?? '')
  // OS name already says it is a phone
  let name = browser.name?.replace(/^Mobile /, '') ?? ''
  return `${name}|${os.name ?? ''}`
}
