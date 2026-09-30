import { getEnvironment } from '../environment.ts'
import { NotFoundError } from '../errors.ts'
import { pages } from '../pages/index.ts'
import { passkeysList, renamePasskey } from '../passkeys.ts'
import { hasCloud } from '../settings.ts'
import { type CreatedLoadedPopup, definePopup, loadListItem } from './common.ts'

export const passkey = definePopup('passkey', async id => {
  if (!hasCloud.get()) throw new NotFoundError()
  let { $item, unbind } = await loadListItem(passkeysList, id)
  return {
    destroy: unbind,
    passkey: $item,
    /**
     * Deletion needs a proof by another sign-in method, which is asked
     * by the Cloud page.
     */
    remove(): void {
      getEnvironment().openRoute({ params: {}, popups: [], route: 'cloud' })
      pages.cloud().deletePasskey(id)
    },
    rename(name: string): Promise<void> {
      return renamePasskey(id, name)
    }
  }
})

export type PasskeyPopup = CreatedLoadedPopup<typeof passkey>
