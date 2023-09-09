/// <reference types="svelte" />
/// <reference types="vite/client" />

interface Navigator {
  connection:
    | {
        type:
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
