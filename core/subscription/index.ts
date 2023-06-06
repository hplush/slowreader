import type { SourceName } from '../sources/index.js'

import { syncMapTemplate } from '@logux/client'

export type SubscriptionValue = {
  url: string
  source: SourceName
  title: string
}

export let Subscription = syncMapTemplate<SubscriptionValue>('subscriptions')
