import type {
  AppMessage,
  ExtensionMessage,
  FetchAnswer,
  PortAnswer,
  PortRequest
} from './api.ts'

let ports = new Map<number, chrome.runtime.Port>()

function send(message: ExtensionMessage): void {
  window.postMessage(message, location.origin)
}

function reply(id: number, answer: FetchAnswer): void {
  send({ answer, id, to: 'slowreader-app', type: 'answer' })
}

function connect(request: PortRequest): chrome.runtime.Port | undefined {
  let port: chrome.runtime.Port
  try {
    port = chrome.runtime.connect()
  } catch {
    return undefined
  }
  port.postMessage(request)
  return port
}

function start(): void {
  let port = connect({ type: 'check' })
  if (!port) return
  port.onMessage.addListener((answer: PortAnswer) => {
    if (answer.type === 'checked') {
      port.disconnect()
      send({ granted: answer.granted, to: 'slowreader-app', type: 'connected' })
    }
  })
}

window.addEventListener('message', event => {
  if (event.source !== window || event.origin !== location.origin) return
  let message = event.data as AppMessage | undefined
  if (message?.to !== 'slowreader-extension') return

  if (message.type === 'ping') {
    start()
  } else if (message.type === 'grant') {
    connect({ type: 'grant' })
  } else if (message.type === 'abort') {
    ports.get(message.id)?.disconnect()
    ports.delete(message.id)
  } else {
    let id = message.id
    let port = connect(message.request)
    if (!port) {
      reply(id, { error: 'Extension was updated', type: 'error' })
      return
    }
    ports.set(id, port)
    port.onMessage.addListener((answer: FetchAnswer) => {
      ports.delete(id)
      port.disconnect()
      reply(id, answer)
    })
    port.onDisconnect.addListener(() => {
      if (ports.delete(id)) {
        reply(id, { error: 'Extension was disconnected', type: 'error' })
      }
    })
  }
})

start()
