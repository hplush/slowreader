import { persistentJSON } from '@nanostores/persistent'

import type { AccountService } from './schema.ts'

export interface DeviceSession {
  device: string
  service: AccountService
}

/**
 * Some accounts like Telegram keep session key only on one device.
 */
export const deviceSessions = persistentJSON<Record<string, DeviceSession>>(
  'slowreader:device-sessions',
  {}
)

export function saveDeviceSession(
  accountId: string,
  session: DeviceSession
): void {
  deviceSessions.set({ ...deviceSessions.get(), [accountId]: session })
}

/**
 * Service ended the session by itself, like after user’s request
 * in the official app.
 */
export function forgetDeviceSession(device: string): void {
  deviceSessions.set(
    Object.fromEntries(
      Object.entries(deviceSessions.get()).filter(
        ([, session]) => session.device !== device
      )
    )
  )
}
