addEventListener('message', async ({ data }) => {
  try {
    let root = await navigator.storage.getDirectory()
    let file = await root.getFileHandle(data.name, { create: true })
    let handle = await file.createSyncAccessHandle()
    handle.truncate(0)
    handle.write(data.bytes, { at: 0 })
    handle.flush()
    await handle.close()
    postMessage({ done: true })
  } catch (e) {
    postMessage({ done: false, error: e.message })
  }
})
