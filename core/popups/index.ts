import type { PopupName } from '../router.ts'
import type { PopupCreator } from './common.ts'
import { feedUrl } from './feed-url.ts'
import { feed } from './feed.ts'
import { post } from './post.ts'

export * from './common.ts'
export type { FeedUrlPopup } from './feed-url.ts'
export type { FeedPopup } from './feed.ts'
export type { PostPopup } from './post.ts'

export const popups = {
  feed,
  feedUrl,
  post
} satisfies {
  [Name in PopupName]: PopupCreator<Name>
}

export type Popups = typeof popups

export type Popup<Name extends PopupName = PopupName> = ReturnType<Popups[Name]>
