import { isOutdatedClient } from '../client.ts'
import { createPage } from './common.ts'

export const updateClientPage = createPage('updateClient', () => {
  function handleUpdateClient(): void {
    isOutdatedClient.set(false)
  }

  return {
    exit() {},
    handleUpdateClient,
    params: {}
  }
})

export type UpdateClientPage = ReturnType<typeof updateClientPage>
