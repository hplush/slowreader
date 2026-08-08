let listeners: (() => void)[] = []
let exiting = false

export function onExit(cb: () => void): void {
  listeners.push(cb)
}

function exit(): void {
  if (exiting) return
  exiting = true
  for (let listener of listeners) {
    listener()
  }
}

process.on('SIGTERM', exit)
process.on('SIGINT', exit)
process.on('exit', exit)
