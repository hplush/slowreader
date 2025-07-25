// PostCSS plugin to add --tune-background() and --tune-color() to CSS
// to replace them to long relative color syntax.

import type { Plugin } from 'postcss'

export default {
  Declaration(decl) {
    if (decl.value.includes('--tune-color(')) {
      decl.value = decl.value
        .replaceAll(
          /--tune-color\(\s*([^\s,]+),\s*([^\s,]+)\s*\)/g,
          (match, base, prefix) => {
            return (
              `oklch(from var(${base}) ` +
              `calc(l + var(${prefix}-l, 0)) calc(c + var(${prefix}-c, 0)) h)`
            )
          }
        )
        .replaceAll(
          /--tune-color\(\s*([^\s,]+),\s*([^\s,]+)\s*,\s*([^\s,]+)\s*\)/g,
          (match, base, prefix, extra) => {
            return (
              `oklch(from var(${base}) ` +
              `calc(l + var(${prefix}-l, 0) + var(${extra}-l, 0)) ` +
              `calc(c + var(${prefix}-c, 0) + var(${extra}-c, 0)) ` +
              `h)`
            )
          }
        )
    }
    if (decl.value.includes('--tune-background(')) {
      decl.value = decl.value
        .replaceAll(
          /--tune-background\(\s*([^\s,]+)\s*\)/g,
          (match, prefix) => {
            return (
              `oklch(from var(--current-background) ` +
              `calc(l + var(${prefix}-l, 0)) calc(c + var(${prefix}-c, 0)) h)`
            )
          }
        )
        .replaceAll(
          /--tune-background\(\s*([^\s,]+)\s*,\s*([^\s,]+)\s*\)/g,
          (match, prefix, extra) => {
            return (
              `oklch(from var(--current-background) ` +
              `calc(l + var(${prefix}-l, 0) + var(${extra}-l, 0)) ` +
              `calc(c + var(${prefix}-c, 0) + var(${extra}-c, 0)) ` +
              `h)`
            )
          }
        )
    }
  },
  postcssPlugin: 'tune-color'
} satisfies Plugin
