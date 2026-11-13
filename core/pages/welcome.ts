import { hasTelegram, loadTelegramApp } from '../loader/telegram.ts'
import { createPage } from './common.ts'

export const welcomePage = createPage('welcome', () => {
  void loadTelegramApp()
  return {
    exit() {},
    params: {},
    telegram: hasTelegram
  }
})

export type WelcomePage = ReturnType<typeof welcomePage>
