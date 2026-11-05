/**
 * In-memory, so restart resets it. Prometheus counters expect resets.
 */
export const eventCounts = new Map<string, number>()

function escapeLabel(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('\n', '\\n')
}

export function formatMetric(
  name: string,
  type: 'counter' | 'gauge',
  values: Record<string, number> | number,
  label = ''
): string {
  let lines = [`# TYPE ${name} ${type}`]
  if (typeof values === 'number') {
    lines.push(`${name} ${values}`)
  } else {
    for (let key of Object.keys(values).toSorted()) {
      lines.push(`${name}{${label}="${escapeLabel(key)}"} ${values[key]}`)
    }
  }
  return lines.join('\n') + '\n'
}
