declare module 'node:util' {
  // Hack until this PR will be merged
  // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/69212
  export function styleText(format: string, text: string): string
}
