// PostCSS plugin to merge fonts of all writing systems from
// `@fontsource-variable/noto-sans-*` into `Noto Sans World Variable` family.
//
// Browser downloads only `woff2` files with symbols from the page
// by `unicode-range`. The plugin removes symbols, which are already
// in Noto Sans or previous fonts, so every symbol has only one font.

import type { AtRule, Plugin } from 'postcss'

type Range = [number, number]

// Base Noto Sans already has these subsets
const SHARED =
  /-(cyrillic|cyrillic-ext|greek|greek-ext|latin|latin-ext|math|symbols|vietnamese)-wght-/

function parseRanges(value: string): Range[] {
  return value.split(',').map(part => {
    let [from, to] = part.trim().slice(2).split('-')
    if (from!.includes('?')) {
      return [
        parseInt(from!.replaceAll('?', '0'), 16),
        parseInt(from!.replaceAll('?', 'F'), 16)
      ]
    }
    return [parseInt(from!, 16), parseInt(to ?? from!, 16)]
  })
}

function stringifyRanges(ranges: Range[]): string {
  return ranges
    .map(([from, to]) => {
      let start = from.toString(16).toUpperCase().padStart(4, '0')
      if (from === to) return `U+${start}`
      return `U+${start}-${to.toString(16).toUpperCase().padStart(4, '0')}`
    })
    .join(',')
}

function merge(ranges: Range[]): Range[] {
  let result: Range[] = []
  for (let range of ranges.toSorted((a, b) => a[0] - b[0])) {
    let last = result.at(-1)
    if (last && range[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], range[1])
    } else {
      result.push([...range])
    }
  }
  return result
}

function subtract(ranges: Range[], claimed: Range[]): Range[] {
  let result: Range[] = []
  let index = 0
  for (let [from, to] of merge(ranges)) {
    while (index < claimed.length && claimed[index]![1] < from) index += 1
    let start = from
    let next = index
    while (next < claimed.length && claimed[next]![0] <= to) {
      let [min, max] = claimed[next]!
      if (min > start) result.push([start, min - 1])
      start = Math.max(start, max + 1)
      next += 1
    }
    if (start <= to) result.push([start, to])
  }
  return result
}

function getDescriptor(rule: AtRule, prop: string): string | undefined {
  let found: string | undefined
  rule.each(node => {
    if (node.type === 'decl' && node.prop === prop) found = node.value
  })
  return found
}

function getLocalNames(script: string, style: 'Bold' | 'Regular'): string[] {
  let full = `Noto Sans ${script}`
  return [
    ...(style === 'Regular' ? [`local('${full}')`] : []),
    `local('${full} ${style}')`,
    `local('NotoSans${script.replaceAll(' ', '')}-${style}')`
  ]
}

// Installed fonts are usually static, so they need separated regular and bold
function addLocalFonts(
  rule: AtRule,
  script: string,
  ranges: Range[]
): AtRule[] {
  return (['Regular', 'Bold'] as const).map(style => {
    let clone = rule.clone()
    clone.walkDecls(decl => {
      if (decl.prop === 'font-family') decl.value = "'Noto Sans World Variable'"
      if (decl.prop === 'unicode-range') decl.value = stringifyRanges(ranges)
      if (decl.prop === 'font-weight') {
        decl.value = style === 'Bold' ? '550 900' : '100 549'
      }
      if (decl.prop === 'src') {
        decl.value = [...getLocalNames(script, style), decl.value].join(', ')
      }
    })
    return clone
  })
}

export default {
  postcssPlugin: 'notoWorld',
  Once(root) {
    let claimed: Range[] = []
    let merged: AtRule[] = []
    let originals: AtRule[] = []
    root.walkAtRules('font-face', rule => {
      let family = getDescriptor(rule, 'font-family')
      let range = getDescriptor(rule, 'unicode-range')
      if (family === "'Noto Sans Variable'" && range) {
        claimed = merge([...claimed, ...parseRanges(range)])
      }
      let script = family?.match(/^'Noto Sans (.+) Variable'$/)?.[1]
      let value = getDescriptor(rule, 'unicode-range')
      if (!script || script === 'Mono' || !value) return
      originals.push(rule)
      if (SHARED.test(getDescriptor(rule, 'src') ?? '')) return
      let ranges = subtract(parseRanges(value), claimed)
      if (ranges.length > 0) {
        merged.push(...addLocalFonts(rule, script, ranges))
        claimed = merge([...claimed, ...ranges])
      }
    })
    originals[0]?.before(merged)
    for (let rule of originals) rule.remove()
  }
} satisfies Plugin
