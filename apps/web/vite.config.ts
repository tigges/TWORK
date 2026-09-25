import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function appVersion(env: string | undefined): string {
  const version = env?.trim()
  return version ? version : '0'
}

function versionPlugin(): Plugin {
  const version = appVersion(process.env['VITE_APP_VERSION'])
  return {
    name: 'twork-version',
    config() {
      return { define: { __APP_VERSION__: JSON.stringify(version) } }
    },
    transformIndexHtml(html) {
      return html.replaceAll('%TWORK_VERSION%', version)
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), react(), versionPlugin()],
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
