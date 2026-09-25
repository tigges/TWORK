import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// VERSION at the repo root. Raise that integer by one in the same commit as a change.
function appVersion(): string {
  const starts = [process.cwd(), dirname(fileURLToPath(import.meta.url))]
  const files = starts.flatMap(start => [
    resolve(start, 'VERSION'),
    resolve(start, '../VERSION'),
    resolve(start, '../../VERSION'),
  ])
  for (const file of files) {
    try {
      const n = readFileSync(file, 'utf8').trim()
      if (/^[0-9]+$/.test(n)) return `v${n}`
    } catch { /* try the next location */ }
  }
  return 'v0'
}

function versionPlugin(): Plugin {
  const version = appVersion()
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
      '/mail/files':     { target: 'http://localhost:3001' },
    },
  },
})
