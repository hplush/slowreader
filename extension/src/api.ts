export type AppMessage = {
  id?: string
  options: RequestInit
  url: string
}

type ExtensionMessageType = 'connected' | 'error' | 'fetched'

export type ExtensionMessage = {
  data?: null | Response
  error?: string
  id?: string
  type: ExtensionMessageType
}
