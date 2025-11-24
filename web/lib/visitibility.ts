export function onNextVisibility(cb: () => void): () => void {
  if (!document.hidden) {
    cb()
    return () => {}
  } else {
    function visibilitychange(): void {
      if (!document.hidden) {
        cb()
        document.removeEventListener('visibilitychange', visibilitychange)
      }
    }
    document.addEventListener('visibilitychange', visibilitychange)
    return () => {
      document.removeEventListener('visibilitychange', visibilitychange)
    }
  }
}
