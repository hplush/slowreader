let listeners: (() => void)[] = []

export function onExit(cb: () => void): void {
  listeners.push(cb)
}

function exit(): void {
  for (let listener of listeners) {
    listener()
  }
}

process.on('SIGTERM', exit)
process.on('SIGINT', exit)
