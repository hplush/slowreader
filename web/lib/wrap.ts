import type { Attachment } from 'svelte/attachments'

export function hideIconsOnWrap(texts: string): Attachment<HTMLElement> {
  return element => {
    let observer = new ResizeObserver(() => {
      element.classList.remove('is-iconless')
      element.classList.toggle(
        'is-iconless',
        [...element.querySelectorAll(texts)].some(text => {
          let range = document.createRange()
          range.selectNodeContents(text)
          return range.getClientRects().length > 1
        })
      )
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }
}
