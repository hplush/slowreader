import { atom, type ReadableAtom } from 'nanostores'

export function injectCustomServerField(): {
  customServer: ReadableAtom<string | undefined>
  resetCustomServer: () => void
  showCustomServer: () => void
} {
  let $customServer = atom<string | undefined>()

  function resetCustomServer(): void {
    $customServer.set(undefined)
  }

  function showCustomServer(): void {
    $customServer.set('server.slowreader.app')
  }

  return {
    customServer: $customServer,
    resetCustomServer,
    showCustomServer
  }
}
