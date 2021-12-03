/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module '*.svg?component' {
  export { SvelteComponentDev as default } from 'svelte/internal'
}
