// Vite configuration for the Access Gate app: the fleet's shared application preset (@meddleware/frontend-config/vite) with the Vue plugin and the page name.
// The Vue plugin, defineConfig and the shared preset.
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { meddlewareApp } from '@meddleware/frontend-config/vite'

// design-tokens and ui resolve from node_modules (published packages). The end-to-end build (`--mode e2e`) includes a mock wallet;
// nothing else may (meddlewareApp refuses VITE_E2E in another mode). Dark is the brand default; wallet-adapter stays out of pre-bundling.
// The whole configuration is the preset; the comment above says what it does for this app.
export default defineConfig(meddlewareApp({ plugins: [vue()], name: 'Access Gate' }))
