export interface Source {
  alwaysUseHttps: boolean
  isMineUrl(dirtyUrl: string): boolean
}
