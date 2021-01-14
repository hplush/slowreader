export type ErrorCode = 'wrong-password'

export class SlowReaderError extends Error {
  constructor (code: ErrorCode) {
    super(code)
    this.name = 'SlowReaderError'
  }
}
