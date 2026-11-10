import { parseId } from '@logux/core'
import {
  isRefreshLockAction,
  isRefreshUnlockAction,
  refreshLock,
  refreshLocked,
  refreshUnlock,
  refreshUnlocked
} from '@slowreader/api'

import type { AppServer } from '../lib/types.ts'

interface Holder {
  nodeId: string
  timeout: NodeJS.Timeout
}

/**
 * Only one tab of the user’s devices loads new posts at a time. Locks live
 * in memory, so server restart drops them.
 */
export default (server: AppServer): void => {
  let holders = new Map<string, Holder>()

  async function unlock(userId: string): Promise<void> {
    let holder = holders.get(userId)
    if (!holder) return
    clearTimeout(holder.timeout)
    holders.delete(userId)
    await server.process(refreshUnlocked({}), { users: [userId] })
  }

  function touch(userId: string, nodeId: string): void {
    let holder = holders.get(userId)
    if (holder) clearTimeout(holder.timeout)
    holders.set(userId, {
      nodeId,
      timeout: setTimeout(() => {
        void unlock(userId)
      }, 30 * 60_000)
    })
  }

  server.on('authenticated', client => {
    let holder = holders.get(client.userId!)
    if (holder) {
      void server.process(refreshLocked({ nodeId: holder.nodeId }), {
        clients: [client.clientId!]
      })
    }
  })

  server.on('disconnected', client => {
    if (!client.clientId || !client.userId) return
    let holder = holders.get(client.userId)
    if (holder && parseId(holder.nodeId).clientId === client.clientId) {
      void unlock(client.userId)
    }
  })

  // Any action of the holder is a sign that refresh is still working
  server.log.on('add', (action, meta) => {
    let { nodeId, userId } = parseId(meta.id)
    if (userId && holders.get(userId)?.nodeId === nodeId) {
      touch(userId, nodeId)
    }
  })

  server.on('report', event => {
    if (event === 'destroy') {
      for (let holder of holders.values()) clearTimeout(holder.timeout)
      holders.clear()
    }
  })

  server.type(refreshLock, {
    access(ctx, action) {
      return isRefreshLockAction(action)
    },
    async process(ctx) {
      let holder = holders.get(ctx.userId)
      if (!holder) {
        touch(ctx.userId, ctx.nodeId)
        await server.process(refreshLocked({ nodeId: ctx.nodeId }), {
          users: [ctx.userId]
        })
      } else {
        await server.process(refreshLocked({ nodeId: holder.nodeId }), {
          clients: [ctx.clientId]
        })
      }
    }
  })

  server.type(refreshUnlock, {
    access(ctx, action) {
      return isRefreshUnlockAction(action)
    },
    async process(ctx) {
      if (holders.get(ctx.userId)?.nodeId === ctx.nodeId) {
        await unlock(ctx.userId)
      }
    }
  })

  server.type(refreshLocked, {
    access() {
      return false
    }
  })

  server.type(refreshUnlocked, {
    access() {
      return false
    }
  })
}
