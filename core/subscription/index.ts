import { syncMapTemplate } from '@logux/client'

import type { SourceName } from '../sources/index.js'

export type SubscriptionValue = {
  source: SourceName
  title: string
  url: string
}

export let Subscription = syncMapTemplate<SubscriptionValue>('subscriptions')
