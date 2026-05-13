import loguxOxfmtConfig from '@logux/oxc-configs/fmt'
import { defineConfig } from 'oxfmt'

export default defineConfig({
  ...loguxOxfmtConfig,
  svelte: true
})
