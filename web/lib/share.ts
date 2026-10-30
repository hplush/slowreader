export function canShare(): boolean {
  return 'share' in navigator
}

export async function shareUrl(url: string): Promise<void> {
  try {
    await navigator.share({ url })
  } catch {}
}
