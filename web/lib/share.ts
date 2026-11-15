import { atom } from 'nanostores'

export const canShare = atom('share' in navigator)

export async function shareUrl(url: string): Promise<void> {
  try {
    await navigator.share({ url })
  } catch {}
}
