import '@meddleware/design-tokens/tokens.css'
import '@meddleware/ui/base.css'
import { createApp } from 'vue'
import App from './App.vue'
import { NETWORK } from './config'
import { warnIfPackageConfigInvalid } from './constants'

// Fail-closed diagnostic: surfaces a clear reason if the active network's package/config ids are
// missing or malformed (e.g. mainnet before deploy) instead of silently issuing broken calls.
warnIfPackageConfigInvalid(NETWORK)

createApp(App).mount('#app')
