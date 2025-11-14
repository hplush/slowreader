import type { EmptyReader } from './empty.ts'
import type { FeedReader } from './feed.ts'
import type { ListReader } from './list.ts'
import type { WelcomeReader } from './welcome.ts'

export type { BaseReader, ReaderCreator, ReaderName } from './common.ts'
export * from './empty.ts'
export * from './feed.ts'
export * from './list.ts'
export * from './welcome.ts'

export type Reader = EmptyReader | FeedReader | ListReader | WelcomeReader
