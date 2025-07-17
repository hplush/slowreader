let listeners: (() => void)[] = []

export function onExit(cb: () => void): void {
  listeners.push(cb)
}

/* c8 ignore start */
function exit(): void {
  for (let listener of listeners) {
    listener()
  }
}
/* c8 ignore end */

process.on('SIGTERM', exit)
process.on('SIGINT', exit)
