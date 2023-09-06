export type OriginPost = {
  full?: string
  id: string
  intro?: string
  media: string[]
  title?: string
  url?: string
}

export type PostValue = OriginPost & {
  feedId: string
  reading: 'fast' | 'slow'
}
