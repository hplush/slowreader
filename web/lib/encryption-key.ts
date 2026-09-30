let pending: Promise<unknown> = Promise.resolve()

function request<Result>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<Result>
): Promise<Result> {
  return new Promise((resolve, reject) => {
    let open = indexedDB.open('slowreader', 1)
    open.addEventListener('upgradeneeded', () => {
      open.result.createObjectStore('keys')
    })
    open.addEventListener('error', () => {
      reject(open.error ?? new Error('IndexedDB is not available'))
    })
    open.addEventListener('success', () => {
      let db = open.result
      let transaction = db.transaction('keys', mode)
      let result = action(transaction.objectStore('keys'))
      transaction.addEventListener('complete', () => {
        db.close()
        resolve(result.result)
      })
      transaction.addEventListener('error', () => {
        db.close()
        reject(transaction.error ?? new Error('IndexedDB transaction failed'))
      })
    })
  })
}

export function saveEncryptionKey(key: CryptoKey | undefined): Promise<void> {
  let saving = (
    key
      ? request('readwrite', store => store.put(key, 'encryption'))
      : request('readwrite', store => store.delete('encryption'))
  ).then(() => {})
  pending = saving.catch(() => {})
  return saving
}

export async function loadEncryptionKey(): Promise<CryptoKey | undefined> {
  let key = await request<unknown>('readonly', store => store.get('encryption'))
  return key instanceof CryptoKey ? key : undefined
}

/**
 * Reload during the transaction could keep the key of signed out user.
 */
export function waitKeySaving(): Promise<unknown> {
  return pending
}
