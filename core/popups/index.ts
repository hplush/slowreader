import type { PopupName } from '../router.ts'
import type { PopupCreator } from './common.ts'
import { feed } from './feed.ts'
import { passkey } from './passkey.ts'
import { post } from './post.ts'
import { refresh } from './refresh.ts'
import { session } from './session.ts'

export { type BasePopup, getPopupId, type LoadedPopup } from './common.ts'
export type { FeedPopup } from './feed.ts'
export type { PasskeyPopup } from './passkey.ts'
export type { PostPopup } from './post.ts'
export { getPostPopupParam } from './post.ts'
export type { RefreshPopup } from './refresh.ts'
export type { SessionPopup } from './session.ts'

export const popups = {
  feed,
  passkey,
  post,
  refresh,
  session
} satisfies {
  [Name in PopupName]: PopupCreator<Name>
}

export type PopupCreators = typeof popups

export type Popup<Name extends PopupName = PopupName> = ReturnType<
  PopupCreators[Name]
>
