export type OriginPost = {
  full?: string
  intro?: string
  media: string[]
  title?: string
  url?: string
}

export type PostValue = OriginPost & {
  feedId: string
  id: string
  reading: 'fast' | 'slow'
}
