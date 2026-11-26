import type { PopupName } from '../router.ts'
import { account } from './account.ts'
import { category } from './category.ts'
import type { PopupCreator } from './common.ts'
import { experiment } from './experiment.ts'
import { experiments } from './experiments.ts'
import { feed } from './feed.ts'
import { later } from './later.ts'
import { passkey } from './passkey.ts'
import { post } from './post.ts'
import { refresh } from './refresh.ts'
import { session } from './session.ts'

export type { AccountPopup } from './account.ts'
export type { CategoryPopup } from './category.ts'
export {
  type BasePopup,
  getPopupId,
  getPopupUrl,
  type LoadedPopup
} from './common.ts'
export type { ExperimentPopup } from './experiment.ts'
export type { ExperimentsPopup } from './experiments.ts'
export { type FeedPopup, getLinkPopup } from './feed.ts'
export type { LaterPopup } from './later.ts'
export type { PasskeyPopup } from './passkey.ts'
export type { PostPopup } from './post.ts'
export { canOpenPostUrl, getPostPopupParam } from './post.ts'
export type { RefreshPopup } from './refresh.ts'
export type { SessionPopup } from './session.ts'

export const popups = {
  account,
  category,
  experiment,
  experiments,
  feed,
  later,
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
