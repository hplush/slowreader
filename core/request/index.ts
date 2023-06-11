export type RequestMethod = typeof fetch

let currentMethod: RequestMethod

export function setRequestMethod(method: RequestMethod): void {
  currentMethod = method
}

export const request: RequestMethod = (...args) => {
  return currentMethod(...args)
}
