import type { BaseServer } from '@logux/server'

/**
 * Data of the whole connection, filled on the authentication.
 */
export interface ClientData {
  sessionId: number
  /**
   * When the session was used before this connection. The device, which was
   * away longer than the retention window, could miss a tombstone.
   */
  usedAt: Date
}

export type AppServer = BaseServer<object, BaseServer['log'], ClientData>
