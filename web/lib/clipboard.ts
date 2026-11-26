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

export async function readClipboard(): Promise<string | undefined> {
  try {
    return await navigator.clipboard.readText()
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotAllowedError') {
      return undefined
    }
    throw e
  }
}

export const clipboardReadable = atom(false)

onMount(clipboardReadable, () => {
  let unbind: (() => void) | undefined
  let mounted = true
  navigator.permissions
    .query({ name: 'clipboard-read' as PermissionName })
    .then(status => {
      if (!mounted) return
      function update(): void {
        clipboardReadable.set(status.state !== 'denied')
      }
      update()
      status.addEventListener('change', update)
      unbind = () => {
        status.removeEventListener('change', update)
      }
    })
    .catch(() => {})
  return () => {
    mounted = false
    unbind?.()
  }
})
