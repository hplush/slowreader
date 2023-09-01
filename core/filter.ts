import { syncMapTemplate } from '@logux/client'

export type FilterValue = {
  action: 'delete' | 'fast' | 'slow'
  priority: number
  query: string
}

export const Filter = syncMapTemplate<FilterValue>('filters', {
  offline: true,
  remote: false
})
