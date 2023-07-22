class WebSocketPolyfill {
  close(): void {}
}

global.WebSocket = WebSocketPolyfill as any
