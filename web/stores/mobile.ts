import { fromMediaQuery } from '@nanostores/media-query'

export const MOBILE_WIDTH = 1024

export const mobileMedia = fromMediaQuery(`(max-width: ${MOBILE_WIDTH}px)`)
