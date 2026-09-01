import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// design-tokens and ui resolve from node_modules (published packages).
export default defineConfig({
  plugins: [vue()],
})
