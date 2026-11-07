import '@meddleware/design-tokens/tokens.css'
import '@meddleware/design-tokens/seasons.css'
import '@meddleware/ui/reset.css'
import { createApp } from 'vue'
import { useSeason } from '@meddleware/ui'
import { selectBuiltNetwork } from '@meddleware/wallet-adapter'
import App from './App.vue'

// The standalone build targets one network; select it in the shared selector so the client, the
// ids and the explorer links all agree. (Embedded, the host's selector rules.) A network without a
// recorded access_gate deployment shows a notice instead of issuing calls.
selectBuiltNetwork(import.meta.env.VITE_NETWORK || 'testnet')

useSeason()

// End-to-end builds only: a mock wallet and a stub chain (`src/e2e.ts`). Both conditions are static, so no other build contains it.
void (async () => {
  if (import.meta.env.MODE === 'e2e' && import.meta.env.VITE_E2E === '1') (await import('./e2e.js')).installE2e()
  createApp(App).mount('#app')
})()
