export type FromWorker = { done: false; error: string } | { done: true }

export type ToWorker = { bytes: Uint8Array<ArrayBuffer>; name: string }

function send(message: FromWorker): void {
  postMessage(message)
}

addEventListener('message', async event => {
  let { bytes, name } = event.data as ToWorker
  try {
    let root = await navigator.storage.getDirectory()
    let file = await root.getFileHandle(name, { create: true })
    let handle = await file.createSyncAccessHandle()
    handle.truncate(0)
    handle.write(bytes, { at: 0 })
    handle.flush()
    await handle.close()
    send({ done: true })
  } catch (e) {
    send({ done: false, error: e instanceof Error ? e.message : String(e) })
  }
})
