import { atom, onMount, type ReadableAtom } from 'nanostores'

export function createClipboard(): {
  copied: ReadableAtom<boolean>
  copy(text: string): Promise<void>
} {
  let copied = atom(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  onMount(copied, () => () => {
    clearTimeout(timer)
    copied.set(false)
  })
  return {
    copied,
    async copy(text) {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        return
      }
      copied.set(true)
      clearTimeout(timer)
      timer = setTimeout(() => {
        copied.set(false)
      }, 3000)
    }
  }
}
