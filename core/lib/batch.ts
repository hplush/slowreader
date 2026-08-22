export interface Batch<Item> {
  add(item: Item): void
  destroy(): void
}

/**
 * Collect the items of a single tick to process them by one call.
 *
 * @param process Called with all items added during the tick.
 */
export function createBatch<Item>(
  process: (items: Item[]) => void
): Batch<Item> {
  let items: Item[] = []
  let timer: ReturnType<typeof setTimeout> | undefined

  return {
    add(item) {
      items.push(item)
      timer ??= setTimeout(() => {
        timer = undefined
        let collected = items
        items = []
        process(collected)
      })
    },
    destroy() {
      clearTimeout(timer)
    }
  }
}
