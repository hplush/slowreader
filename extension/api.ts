export type AppMessage = {
  options: RequestInit
  url: string
}

export type ExtensionMessage =
  | { data: string; type: 'fetched' }
  | { error: string; type: 'error' }
  | { type: 'connected' }
