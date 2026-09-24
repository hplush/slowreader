// @ts-expect-error Remove this file when @types/node will have util.debounce
import { debounce as nodeDebounce } from 'node:util'

type Debounce = <Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  wait: number,
  options?: {
    leading?: boolean
    rejectOnCancel?: boolean
    signal?: AbortSignal
  }
) => ((...args: Args) => Promise<Result>) & {
  cancel(reason?: unknown): void
  flush(): void
  readonly pending: null | Promise<Result>
  readonly pendingCount: number
  ref(): unknown
  unref(): unknown
}

export const debounce = nodeDebounce as Debounce
