export type OriginPost = {
  full?: string
  intro?: string
  media: string[]
  originId: string
  title?: string
  url?: string
}

export type PostValue = OriginPost & {
  feedId: string
  reading: 'fast' | 'slow'
}
