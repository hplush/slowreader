export interface StorageSize {
  indexedDB: number
  localStorage: number
  opfs: number
  total: number
}

async function opfsSize(dir: FileSystemDirectoryHandle): Promise<number> {
  let size = 0
  for await (let handle of dir.values()) {
    if (handle.kind === 'file') {
      size += (await handle.getFile()).size
    } else {
      size += await opfsSize(handle)
    }
  }
  return size
}

function localStorageSize(): number {
  let size = 0
  for (let i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i)!
    size += (key.length + (localStorage.getItem(key) ?? '').length) * 2
  }
  return size
}

export async function measureStorage(): Promise<StorageSize> {
  let estimate = await navigator.storage.estimate()
  let opfs = 0
  try {
    opfs = await opfsSize(await navigator.storage.getDirectory())
  } catch {
    // OPFS is not supported
  }
  let indexedDB = estimate.usageDetails?.indexedDB ?? 0
  let localStorage = localStorageSize()
  // `estimate().usage` counts the OPFS files by the disk space they reserve,
  // which is gigabytes for a database of a hundred megabytes, so the total
  // is the sum of the sizes we can measure ourselves
  return {
    indexedDB,
    localStorage,
    opfs,
    total: indexedDB + localStorage + opfs
  }
}
