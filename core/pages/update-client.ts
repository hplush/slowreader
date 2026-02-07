import { createPage } from './common.ts'

export const updateClientPage = createPage('updateClient', () => {
  /* node:coverage disable */
  function handleUpdateClient(): void {
    location.reload()
  }
  /* node:coverage enable */

  return {
    exit() {},
    handleUpdateClient,
    params: {}
  }
})

export type UpdateClientPage = ReturnType<typeof updateClientPage>
