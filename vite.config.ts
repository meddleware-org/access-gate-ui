import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { meddlewareApp } from '@meddleware/frontend-config/vite'

// design-tokens and ui resolve from node_modules (published packages). The end-to-end build (`--mode e2e`) includes a mock wallet;
// nothing else may (meddlewareApp refuses VITE_E2E in another mode). Dark is the brand default; wallet-adapter stays out of pre-bundling.
export default defineConfig(meddlewareApp({ plugins: [vue()] }))
