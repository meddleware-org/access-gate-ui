// Screenshots for LOOKING at the app (see @meddleware/frontend-config/shots). Run: npm run shots. The connected states go through the e2e
// build's mock wallet.
import { defineShots } from '@meddleware/frontend-config/shots'
import { freezing, managing, open } from './open.js'

defineShots({
  disconnected: open(),
  create: open({ connected: true }),
  gates: open({ connected: true, tab: 'My gates' }),
  managing,
  freezing,
})
