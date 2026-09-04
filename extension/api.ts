export type AppMessage = {
  options: RequestInit
  url: string
}

export type ExtensionMessage =
  | { error: string; type: 'error' }
  | { type: 'connected' }
  | {
      body: string
      headers: [string, string][]
      redirected: boolean
      status: number
      type: 'fetched'
      url: string
    }
