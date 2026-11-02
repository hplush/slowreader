import { EVENTS, type EventName, isEventName } from '../events.ts'
import { hasKey, hasOnlyKeys } from '../validators/utils.ts'
import { createRequester, type Endpoint } from './utils.ts'

export interface SendEventsRequest {
  events: EventName[]
}

export type SendEventsResponse = Record<string, never>

const METHOD = 'POST'

export const sendEvents = createRequester<
  SendEventsRequest,
  SendEventsResponse
>(METHOD, () => '/events')

export const sendEventsEndpoint: Endpoint<
  SendEventsResponse,
  SendEventsRequest
> = {
  checkBody(body) {
    if (
      hasKey(body, 'events') &&
      hasOnlyKeys(body, ['events']) &&
      Array.isArray(body.events) &&
      body.events.length > 0 &&
      body.events.length <= EVENTS.length &&
      body.events.every(isEventName)
    ) {
      return { events: [...new Set(body.events)] }
    }
    return false
  },
  method: METHOD,
  parseUrl(url) {
    if (url === '/events') {
      return {}
    } else {
      return false
    }
  }
}
