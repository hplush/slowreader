import { createPage } from './common.ts'

export const updateClientPage = createPage('updateClient', () => {
  return {
    exit() {},
    message: `Hi there 👋 It looks like you’re using an outdated client version. Please
    update the app.`,
    params: {}
  }
})

export type UpdateClientPage = ReturnType<typeof updateClientPage>
