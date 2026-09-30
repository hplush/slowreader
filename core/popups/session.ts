import { signOut } from '../auth.ts'
import { NotFoundError } from '../errors.ts'
import { closeLastPopup } from '../router.ts'
import { deleteSession, sessionsList } from '../sessions.ts'
import { hasCloud } from '../settings.ts'
import { type CreatedLoadedPopup, definePopup, loadListItem } from './common.ts'

export const session = definePopup('session', async id => {
  if (!hasCloud.get()) throw new NotFoundError()
  let { $item, unbind } = await loadListItem(sessionsList, id)
  return {
    destroy: unbind,
    session: $item,
    async signOut(): Promise<void> {
      if ($item.get()?.current) {
        await signOut()
      } else {
        closeLastPopup()
        await deleteSession(id)
      }
    }
  }
})

export type SessionPopup = CreatedLoadedPopup<typeof session>
