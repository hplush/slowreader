export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}
