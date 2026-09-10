import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: '../dist'
  },
  root: 'root'
})
