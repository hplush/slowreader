import { fromMediaQuery } from '@nanostores/media-query'

export const systemReducedMotion = fromMediaQuery(
  '(prefers-reduced-motion:reduce)'
)
