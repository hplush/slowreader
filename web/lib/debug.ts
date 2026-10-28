function getBrowserName(): string {
  let data = navigator.userAgentData
  if (!data) return navigator.userAgent
  let brands = data.brands
    .filter(i => !/not.a.brand/i.test(i.brand))
    .map(i => `${i.brand} ${i.version}`)
  return [...brands, data.platform].join(', ')
}

export function addDebugInfo(
  error: string | undefined,
  version: string
): string {
  let info = `${getBrowserName()}\nVersion: ${version}`
  return error ? `${error}\n\n${info}` : info
}
