export interface AnalyticsStats {
  browsers: Record<string, number>
  dau: number
  mau: number
  passkeys: Record<'0' | '1' | '2' | '3+', number>
  systems: Record<string, number>
  users: number
}

export interface AnalyticsDay extends AnalyticsStats {
  date: string
}

export interface EventsDay {
  count: number
  date: string
  // Not `EventName`, because the database keeps removed events
  name: string
}

/**
 * `GET /analytics` with `Authorization: Bearer ANALYTICS_TOKEN`
 */
export interface AnalyticsResponse {
  events: EventsDay[]
  history: AnalyticsDay[]
  now: { online: number } & AnalyticsStats
}
