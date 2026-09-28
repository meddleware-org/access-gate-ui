import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// design-tokens and ui resolve from node_modules (published packages).
export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    // @meddleware/wallet-adapter ships TS + .vue source and holds the shared wallet singleton.
    // Pre-bundling would put its TS in .vite/deps while its .vue files (which esbuild can't bundle)
    // are served raw and import the raw wallet.ts — two singletons in dev, so WalletGuard and the
    // app see different connection state. Excluding it keeps a single module instance.
    exclude: ['@meddleware/wallet-adapter'],
  },
})
