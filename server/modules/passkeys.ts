import type { Context } from '@logux/server'
import {
  addedPasskeyAction,
  addPasskeyAction,
  deletedPasskeyAction,
  deletePasskeyAction,
  isAddPasskeyAction,
  isDeletePasskeyAction,
  isRenamePasskeyAction,
  loadedPasskeysAction,
  type PasskeyValue,
  renamePasskeyAction
} from '@slowreader/api'
import { and, eq } from 'drizzle-orm'

import { getProvider } from '../aaguids/utils.ts'
import { db, passkeys } from '../db/index.ts'
import { checkProof } from '../lib/limits.ts'
import type { AppServer } from '../lib/types.ts'
import {
  type NewPasskey,
  type Passkey,
  pickPasskeyName,
  verifyRegistration
} from '../lib/webauthn.ts'

function toValue(row: Passkey): PasskeyValue {
  return {
    createdAt: row.createdAt.getTime(),
    id: row.id,
    lockedKey: row.lockedKey,
    name: row.name,
    provider: getProvider(row.aaguid),
    synced: row.synced,
    usedAt: row.usedAt.getTime()
  }
}

async function isOwner(ctx: Context, id: string): Promise<boolean> {
  let passkey = await db.query.passkeys.findFirst({
    columns: { id: true },
    where: { id, userId: ctx.userId }
  })
  return !!passkey
}

export default (server: AppServer): void => {
  server.channel<{ id: string }>('users/:id/passkeys', {
    access(ctx) {
      return ctx.params.id === ctx.userId
    },
    async load(ctx) {
      let rows = await db.query.passkeys.findMany({
        where: { userId: ctx.userId }
      })
      return loadedPasskeysAction({ passkeys: rows.map(toValue) })
    }
  })

  server.type(loadedPasskeysAction, {
    access() {
      return false
    }
  })

  server.type(addedPasskeyAction, {
    access() {
      return false
    },
    resend(ctx, action) {
      return { channels: [`users/${action.userId}/passkeys`] }
    }
  })

  server.type(deletedPasskeyAction, {
    access() {
      return false
    },
    resend(ctx, action) {
      return { channels: [`users/${action.userId}/passkeys`] }
    }
  })

  server.type(renamePasskeyAction, {
    async access(ctx, action) {
      return isRenamePasskeyAction(action) && (await isOwner(ctx, action.id))
    },
    resend(ctx) {
      return { channels: [`users/${ctx.userId}/passkeys`] }
    },
    async process(ctx, action) {
      await db
        .update(passkeys)
        .set({ name: action.name })
        .where(and(eq(passkeys.id, action.id), eq(passkeys.userId, ctx.userId)))
    }
  })

  server.type(addPasskeyAction, {
    async access(ctx, action) {
      if (!isAddPasskeyAction(action)) return false
      if (!(await checkProof(server, ctx, action.proof))) return false
      let passkey = await verifyRegistration(action.response, ctx.userId)
      if (!passkey) return false
      ;(ctx.data as { passkey?: NewPasskey }).passkey = passkey
      return true
    },
    async process(ctx, action) {
      let passkey = (ctx.data as { passkey: NewPasskey }).passkey
      let used = await db
        .select({ name: passkeys.name })
        .from(passkeys)
        .where(eq(passkeys.userId, ctx.userId))
      let [row] = await db
        .insert(passkeys)
        .values({
          ...passkey,
          lockedKey: action.lockedKey,
          name: pickPasskeyName(
            getProvider(passkey.aaguid),
            used.map(i => i.name)
          ),
          userId: ctx.userId
        })
        .returning()
      await server.process(
        addedPasskeyAction({ ...toValue(row!), userId: ctx.userId })
      )
    }
  })

  server.type(deletePasskeyAction, {
    async access(ctx, action) {
      if (!isDeletePasskeyAction(action)) return false
      if (!(await isOwner(ctx, action.id))) return false
      return !!(await checkProof(server, ctx, action.proof))
    },
    async process(ctx, action) {
      await db
        .delete(passkeys)
        .where(and(eq(passkeys.id, action.id), eq(passkeys.userId, ctx.userId)))
      await server.process(
        deletedPasskeyAction({ id: action.id, userId: ctx.userId })
      )
    }
  })
}
