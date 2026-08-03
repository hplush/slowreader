// Loaders report themselves to the benchmark. Reporter is empty by default
// and `benchmark.ts` sets the real one, so clients will not download
// benchmark tools.

export interface LoaderReporter {
  (name: string): () => void
}

let reporter: LoaderReporter = () => {
  return () => {}
}

export function setLoaderReporter(cb: LoaderReporter): void {
  reporter = cb
}

/**
 * Tell benchmark that the loader is rendered. Returns function to call
 * when the loader was removed from the screen.
 */
export function reportLoader(name: string): () => void {
  return reporter(name)
}
