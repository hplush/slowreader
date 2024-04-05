export function capitalizeWord(word) {
  return word.charAt(0).toUpperCase() + word.substring(1)
}

export function isUpperCase(word) {
  return /^[A-Z]+$/.test(word)
}
