import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 3000,
    proxy: {
      '/trpc':           { target: 'http://localhost:3001', ws: true },
      '/auth/me':        { target: 'http://localhost:3001' },
      '/auth/logout':    { target: 'http://localhost:3001' },
      '/auth/passkey':   { target: 'http://localhost:3001' },
      '/files/upload':   { target: 'http://localhost:3001' },
      '/files/download': { target: 'http://localhost:3001' },
    },
  },
})
