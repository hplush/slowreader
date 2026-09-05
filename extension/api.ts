export type FetchRequest = {
  headers: [string, string][]
  method: string
  type: 'fetch'
  url: string
}

export type FetchAnswer =
  | { error: string; type: 'error' }
  | { type: 'restricted' }
  | {
      body: string
      headers: [string, string][]
      redirected: boolean
      status: number
      type: 'fetched'
      url: string
    }

export type AppMessage =
  | {
      id: number
      request: FetchRequest
      to: 'slowreader-extension'
      type: 'request'
    }
  | { id: number; to: 'slowreader-extension'; type: 'abort' }
  | { to: 'slowreader-extension'; type: 'grant' }
  | { to: 'slowreader-extension'; type: 'ping' }

export type ExtensionMessage =
  | { answer: FetchAnswer; id: number; to: 'slowreader-app'; type: 'answer' }
  | { granted: boolean; to: 'slowreader-app'; type: 'connected' }

export type PortRequest = FetchRequest | { type: 'check' } | { type: 'grant' }

export type PortAnswer = FetchAnswer | { granted: boolean; type: 'checked' }
