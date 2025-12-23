import { nanoid } from 'nanoid/non-secure'
import { atom, type ReadableAtom } from 'nanostores'

import { isNotFoundError } from '../errors.ts'
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
