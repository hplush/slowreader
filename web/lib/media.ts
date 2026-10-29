let observer: IntersectionObserver | undefined

export function pauseVideosWhenScrolledOut(node: Element): () => void {
  observer ??= new IntersectionObserver(entries => {
    for (let entry of entries) {
      if (!entry.isIntersecting) {
        // GIF-like videos have no controls to start them again
        for (let video of entry.target.querySelectorAll<HTMLVideoElement>(
          'video:not([autoplay])'
        )) {
          video.pause()
        }
      }
    }
  })
  observer.observe(node)
  return () => {
    observer?.unobserve(node)
  }
}
