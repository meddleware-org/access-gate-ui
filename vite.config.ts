import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { assertE2eOnlyInE2eMode, themeInit, viteTarget } from '@meddleware/frontend-config/vite'

// design-tokens and ui resolve from node_modules (published packages).
export default defineConfig(({ mode }) => {
  // The end-to-end build (`--mode e2e`) includes a mock wallet; nothing else may.
  assertE2eOnlyInE2eMode(mode)
  return {
    build: { target: viteTarget() },
    plugins: [vue(), themeInit({ default: 'dark' })],
    optimizeDeps: {
      // @meddleware/wallet-adapter ships TS + .vue source and holds the shared wallet singleton.
      // Pre-bundling would put its TS in .vite/deps while its .vue files (which esbuild can't bundle)
      // are served raw and import the raw wallet.ts — two singletons in dev, so WalletGuard and the
      // app see different connection state. Excluding it keeps a single module instance.
      exclude: ['@meddleware/wallet-adapter'],
    },
  }
})
