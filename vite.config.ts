import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // These ship WASM loaded relative to their own module URL; Vite's dev
    // pre-bundler mishandles that, per the jSquash project's own Vite
    // example (github.com/jamsinclair/jSquash/tree/main/examples/with-vite).
    exclude: ['@jsquash/avif', '@jsquash/jpeg', '@jsquash/webp', '@jsquash/oxipng', '@jsquash/resize'],
  },
})
