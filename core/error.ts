export class SlowReaderError extends Error {
  constructor(message: string) {
    super('SlowReader' + message)
    this.name = 'SlowReaderError'
    Error.captureStackTrace(this)
  }
}
