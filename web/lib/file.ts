export async function askUserToSaveFile(
  name: string,
  promise: Promise<Blob | false>
): Promise<void> {
  let blob = await promise
  if (blob) {
    let url = URL.createObjectURL(blob)
    let a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }
}
