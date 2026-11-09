import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './manifest.json' with { type: 'json' }

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
  ],
})
