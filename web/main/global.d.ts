/// <reference types="svelte" />
/// <reference types="vite/client" />

interface Navigator {
  connection:
    | {
        saveData?: boolean
        type?:
          | 'bluetooth'
          | 'cellular'
          | 'ethernet'
          | 'none'
          | 'other'
          | 'unknown'
          | 'wifi'
          | 'wimax'
      }
    | undefined
}

declare module '*.avif'
declare module '*.png'
