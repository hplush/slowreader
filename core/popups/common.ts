import { atom, type ReadableAtom } from 'nanostores'

import type { PopupName } from '../router.ts'

type Extra = {
  destroy?: () => void
  notFound: boolean
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
}

export interface PopupCreator<
  Name extends PopupName,
  Rest extends Extra =
    | ({ notFound: false } & Record<string, unknown>)
    | { notFound: true }
> {
  (
    param: string
  ):
    | (BasePopup<Name, false, false> & Rest)
    | BasePopup<Name, false, true>
    | BasePopup<Name, true>
}

export type LoadedPopup<Creator extends PopupCreator<PopupName>> = Extract<
  ReturnType<Creator>,
  { loading: ReadableAtom<false>; notFound: false }
>

export interface PopupHelpers {
  startTask(): () => void
}

export function definePopup<Name extends PopupName, Rest extends Extra>(
  name: Name,
  builder: (param: string, popup: PopupHelpers) => Promise<Rest>
): PopupCreator<Name, Rest> {
  let creator: PopupCreator<Name, Rest> = param => {
    let destroyed = false
    let rest: Rest | undefined
    let loading = atom(true)
    let popup = {
      destroy() {
        destroyed = true
        rest?.destroy?.()
      },
      loading,
      name,
      notFound: false,
      param
    }

    let tasks = 0
    let helpers: PopupHelpers = {
      startTask() {
        tasks += 1
        loading.set(true)
        return () => {
          tasks -= 1
          if (tasks <= 0) loading.set(false)
        }
      }
    }

    let stop = helpers.startTask()
    builder(param, helpers).then(extra => {
      rest = extra
      if (destroyed) extra.destroy?.()
      for (let i in rest) {
        // @ts-expect-error Too complex case for TypeScript
        popup[i] = extra[i]
      }
      stop()
    })
    return popup as
      | (BasePopup<Name, false, false> & Rest)
      | BasePopup<Name, false, true>
      | BasePopup<Name, true>
  }
  return creator
}
