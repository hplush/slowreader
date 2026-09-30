import { nanoid } from 'nanoid/non-secure'
import { atom, computed, type ReadableAtom } from 'nanostores'

import { isNotFoundError, NotFoundError } from '../errors.ts'
import { type Loadable, subscribeUntil } from '../lib/stores.ts'
import type { PopupName } from '../router.ts'

type Extra = {
  destroy: () => void
}

export type BasePopup<
  Name extends PopupName = PopupName,
  Loading extends boolean = boolean,
  NotFound extends boolean = boolean
> = {
  destroy(): void
  readonly loading: ReadableAtom<Loading>
  readonly name: Name
  readonly notFound: NotFound
  readonly param: string
  readonly uniqueId: string
}

export interface PopupCreator<
  Name extends PopupName,
  Rest extends Extra = Extra
> {
  (
    param: string
  ):
    | (BasePopup<Name, false, false> & Rest)
    | BasePopup<Name, false, true>
    | BasePopup<Name, true>
}

export type LoadedPopup<Popup extends BasePopup> = Extract<
  Popup,
  { loading: ReadableAtom<false>; notFound: false }
>

export type CreatedLoadedPopup<Creator extends PopupCreator<PopupName>> =
  LoadedPopup<ReturnType<Creator>>

export function getPopupId(name: PopupName, param: string): string {
  return `${name}-${param.replace(/[^\w]/g, '_')}-popup`
}

export function definePopup<Name extends PopupName, Rest extends Extra>(
  name: Name,
  builder: (param: string) => Promise<Rest>
): PopupCreator<Name, Rest> {
  let creator: PopupCreator<Name, Rest> = param => {
    let destroyed = false
    let rest: Rest | undefined
    let loading = atom(true)
    let popup = {
      destroy() {
        destroyed = true
        rest?.destroy()
      },
      loading,
      name,
      notFound: false,
      param,
      uniqueId: nanoid()
    }

    loading.set(true)
    builder(param)
      .then(extra => {
        rest = extra
        if (destroyed) extra.destroy()
        for (let i in rest) {
          // @ts-expect-error Too complex case for TypeScript
          popup[i] = extra[i]
        }
        loading.set(false)
      })
      .catch((e: unknown) => {
        if (isNotFoundError(e)) {
          popup.notFound = true
          popup.destroy()
          loading.set(false)
          /* node:coverage ignore next 3 */
        } else {
          throw e
        }
      })
    return popup as ReturnType<PopupCreator<Name, Rest>>
  }
  return creator
}

/**
 * Keeps the list loaded while the popup is open.
 */
export async function loadListItem<Item extends { id: string }>(
  $list: ReadableAtom<Loadable<Item[]>>,
  id: string
): Promise<{ $item: ReadableAtom<Item | undefined>; unbind: () => void }> {
  let unbind = $list.listen(() => {})
  let items = await new Promise<Item[]>(resolve => {
    subscribeUntil($list, list => {
      if (list.status === 'loading') return false
      resolve(list.value)
      return true
    })
  })
  if (!items.some(i => i.id === id)) {
    unbind()
    throw new NotFoundError()
  }
  let $item = computed($list, list => {
    return list.status === 'ready'
      ? list.value.find(i => i.id === id)
      : undefined
  })
  return { $item, unbind }
}
