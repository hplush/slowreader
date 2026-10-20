import { atom } from 'nanostores'

export const loadedScripts = Array.from(
  document.querySelectorAll('script[src]'),
  i => i.getAttribute('src')
).join(' ')

function scriptsInHtml(html: string): string {
  return Array.from(
    html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g),
    i => i[1]
  ).join(' ')
}

export const clientUpdate = atom<
  'available' | 'checking' | 'latest' | 'offline'
>('checking')

export async function checkClientUpdate(): Promise<
  ReturnType<typeof clientUpdate.get>
> {
  clientUpdate.set('checking')
  try {
    let response = await fetch('/app.html', { cache: 'no-cache' })
    if (!response.ok) {
      clientUpdate.set('offline')
    } else if (scriptsInHtml(await response.text()) !== loadedScripts) {
      clientUpdate.set('available')
    } else {
      clientUpdate.set('latest')
    }
  } catch {
    clientUpdate.set('offline')
  }
  return clientUpdate.get()
}
