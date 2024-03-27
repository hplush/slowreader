export const actualizeThemeColor = () => {
  const landColor = getComputedStyle(document.documentElement).getPropertyValue(
    '--theme-color'
  )

  const themeColorTag = document.querySelector('meta[name="theme-color"]')

  if (!themeColorTag || !landColor) {
    return
  }

  themeColorTag.setAttribute('content', landColor)
}
