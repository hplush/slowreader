export type NetworkType = 'free' | 'paid' | 'undetectable' | 'unknown'

export interface NetworkTypeDetector {
  (): NetworkType
}
