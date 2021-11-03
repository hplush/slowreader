export function mockFetch(status = 200): object[] {
  let ok = status >= 200 && status < 300
  let requests: object[] = []
  global.fetch = async (input: RequestInfo, init: RequestInit = {}) => {
    requests.push({ url: input, ...init })
    return { ok, status } as Response
  }
  return requests
}
