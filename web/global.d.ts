/// <reference types="svelte" />
/// <reference types="vite/client" />

declare const COMMIT_TIME: number

interface FileSystemFileHandle {
  createSyncAccessHandle(): Promise<{
    close(): Promise<void>
    flush(): void
    truncate(size: number): void
    write(buffer: AllowSharedBufferSource, options?: { at?: number }): number
  }>
}

interface Navigator {
  userAgentData:
    | {
        brands: { brand: string; version: string }[]
        platform: string
      }
    | undefined
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

interface Performance {
  memory:
    | {
        usedJSHeapSize: number
      }
    | undefined
}

interface StorageEstimate {
  usageDetails:
    | {
        indexedDB?: number
      }
    | undefined
}

declare module '*.avif'
declare module '*.png'

interface Window {
  PasswordCredential:
    | {
        new (data: { id: string; password: string }): Credential
      }
    | undefined
}

interface CredentialCreationOptions {
  mediation?: CredentialMediationRequirement
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent
}
