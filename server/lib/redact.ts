import type { BaseServer } from '@logux/server'

const SECRET_KEYS = new Set([
  'authKey',
  'ipAddress',
  'lockedKey',
  'params',
  'password',
  'prf',
  'proof',
  'token'
])

function redactText(text: string): string {
  return text.replace(/\nparams: .*/g, '\nparams: [redacted]')
}

function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactText(value)
  } else if (
    typeof value !== 'object' ||
    value === null ||
    ArrayBuffer.isView(value)
  ) {
    return value
  } else if (value instanceof Error) {
    return {
      ...(redact(Object.fromEntries(Object.entries(value))) as object),
      message: redactText(value.message),
      name: value.name,
      stack: value.stack && redactText(value.stack)
    }
  } else if (Array.isArray(value)) {
    return value.map(i => redact(i))
  } else {
    let result: Record<string, unknown> = {}
    for (let [name, field] of Object.entries(value)) {
      result[name] = SECRET_KEYS.has(name) ? '[redacted]' : redact(field)
    }
    return result
  }
}

/**
 * Remove secrets from any log record
 */
export function redactLogger(logger: BaseServer['logger']): void {
  for (let level of ['debug', 'error', 'fatal', 'info', 'warn'] as const) {
    let original = logger[level].bind(logger)
    logger[level] = (...objs) => {
      original(...objs.map(i => redact(i)))
    }
  }
}
