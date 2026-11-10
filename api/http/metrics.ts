/**
 * Stats, which `GET /metrics` with `Authorization: Bearer ANALYTICS_TOKEN`
 * returns in Prometheus format
 */
export interface AnalyticsStats {
  browsers: Record<string, number>
  clients: Record<'1' | '2' | '3' | '4+', number>
  dau: number
  mau: number
  online: number
  passkeys: Record<'0' | '1' | '2' | '3+', number>
  platforms: Record<'both' | 'desktop' | 'mobile', number>
  systems: Record<string, number>
  users: number
}
