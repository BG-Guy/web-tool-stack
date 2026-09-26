import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this repo from /web-tool-stack/, not the domain
  // root — without this, built asset paths are absolute (/assets/...)
  // and 404 under that subpath, which is what causes a blank page.
  base: '/web-tool-stack/',
  plugins: [react()],
})
