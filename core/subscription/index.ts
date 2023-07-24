import { syncMapTemplate } from '@logux/client'

import type { LoaderName } from '../loader/index.js'

export type SubscriptionValue = {
  loader: LoaderName
  title: string
  url: string
}

export const Subscription = syncMapTemplate<SubscriptionValue>(
  'subscriptions',
  {
    offline: true
  }
)
