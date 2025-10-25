import type { PopupName } from '../router.ts'
import type { PopupCreator } from './common.ts'
import { feed } from './feed.ts'
import { post } from './post.ts'
import { refresh } from './refresh.ts'

export type { BasePopup, LoadedPopup } from './common.ts'
export type { FeedPopup } from './feed.ts'
export type { PostPopup } from './post.ts'
export type { RefreshPopup } from './refresh.ts'

export const popups = {
  feed,
  post,
  refresh
} satisfies {
  [Name in PopupName]: PopupCreator<Name>
}

export type PopupCreators = typeof popups

export type Popup<Name extends PopupName = PopupName> = ReturnType<
  PopupCreators[Name]
>
