export type RobotsRule = [allow: boolean, path: string]

function normalizePath(path: string): string {
  return path
    .replace(/[^\p{ASCII}]+/gu, chars => encodeURIComponent(chars))
    .replace(/%[\da-f]{2}/gi, code => {
      let char = String.fromCharCode(parseInt(code.slice(1), 16))
      return /[\w.~-]/.test(char) ? char : code.toUpperCase()
    })
}

/**
 * Own matcher instead of `RegExp`, since many `*` in a site’s rule
 * would make backtracking regexp freeze the app.
 */
function matchesRule(rule: string, path: string): boolean {
  let anchored = rule.endsWith('$')
  let parts = (anchored ? rule.slice(0, -1) : rule).split('*')
  let first = parts.shift()!
  if (!path.startsWith(first)) return false
  let last = anchored ? parts.pop() : undefined
  let position = first.length
  for (let part of parts) {
    let found = path.indexOf(part, position)
    if (found === -1) return false
    position = found + part.length
  }
  if (!anchored) return true
  if (last === undefined) return position === path.length
  return path.endsWith(last) && path.length - last.length >= position
}

/**
 * RFC 9309: group of our product token or `*` group, rules of groups
 * with the same agent are merged.
 */
export function parseRobots(text: string): RobotsRule[] {
  let groups = new Map<string, RobotsRule[]>()
  let agents: string[] = []
  let grouping = false
  let lines = text
    .replace(/^﻿/, '')
    .slice(0, 500 * 1024)
    .split(/\r\n?|\n/)
  for (let line of lines) {
    let record = line.replace(/#.*/, '')
    let colon = record.indexOf(':')
    if (colon === -1) continue
    let key = record.slice(0, colon).trim().toLowerCase()
    let value = record.slice(colon + 1).trim()
    if (key === 'user-agent') {
      if (!grouping) agents = []
      grouping = true
      let agent =
        value === '*'
          ? '*'
          : (value.match(/^[a-z_-]+/i)?.[0].toLowerCase() ?? '')
      agents.push(agent)
      if (!groups.has(agent)) groups.set(agent, [])
    } else if (key === 'allow' || key === 'disallow') {
      grouping = false
      if (!value) continue
      for (let agent of agents) {
        groups.get(agent)!.push([key === 'allow', normalizePath(value)])
      }
    }
  }
  return groups.get('slowreader') ?? groups.get('*') ?? []
}

export function isAllowedByRules(rules: RobotsRule[], url: string): boolean {
  let parsed = new URL(url)
  let path = normalizePath(parsed.pathname + parsed.search)
  let best: RobotsRule | undefined
  for (let rule of rules) {
    if (!matchesRule(rule[1], path)) continue
    if (
      !best ||
      rule[1].length > best[1].length ||
      (rule[1].length === best[1].length && rule[0])
    ) {
      best = rule
    }
  }
  return best ? best[0] : true
}
