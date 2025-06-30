import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  server: {
    port: 8080,
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
})
