<script setup lang="ts">
// One administered gate: summary of its on-chain state, expandable into the management surface
// (settings, airdrop, freeze). A frozen gate shows a locked notice instead of controls.
// The shared UI components, the formatting and link helpers, and the three management parts.
import { CopyableAddress, ExplorerLink, UiBadge, UiCard, UiNotice } from '@meddleware/ui'
import { mistToSui, safeHref, suiExplorerUrl } from '@meddleware/web-utils'
import type { OwnedGate } from '@meddleware/access-gate-client'
import { explorerNetwork } from '../config.js'
import GateSettingsPanel from './GateSettingsPanel.vue'
import AirdropForm from './AirdropForm.vue'
import FreezeGateButton from './FreezeGateButton.vue'

// The component's input and event.
defineProps<{
  /** The gate to display and manage. */
  gate: OwnedGate
}>()
defineEmits<{ (e: 'changed'): void }>()

/** sealed-storage-ui, opened on this gate (the id is chain data, so it is encoded into the query). */
/** sealUrl(gateId): the Sealed Storage app opened on this gate. */
function sealUrl(gateId: string): string {
  return `https://sui-sealed-storage.meddleware.co.uk/?gate=${encodeURIComponent(gateId)}`
}
// priceLabel(mist): "Free" or the price in SUI.
const priceLabel = (mist: bigint) => (mist === 0n ? 'Free' : `${mistToSui(mist)} SUI`)
</script>

<template>
  <UiCard as="li" :level="3" :title="gate.nftName || 'Untitled gate'">
    <p>
      <!-- The gate's object id, copyable, linking to the explorer. -->
      <CopyableAddress :address="gate.gateId" label="Copy gate ID">
        <ExplorerLink :href="suiExplorerUrl('object', gate.gateId, explorerNetwork)" :value="gate.gateId" />
      </CopyableAddress>
    </p>
    <!-- The gate's state as badges: price, credits, soulbound, paused, frozen, locked commission and the policy flags. -->
    <ul class="badges" role="list">
      <li><UiBadge :symbol="false">{{ priceLabel(gate.priceMist) }}</UiBadge></li>
      <li><UiBadge :symbol="false">{{ gate.defaultUses === 0n ? 'Unlimited' : `${gate.defaultUses} credits` }}</UiBadge></li>
      <li v-if="gate.soulbound"><UiBadge :symbol="false">Soulbound</UiBadge></li>
      <li v-if="gate.paused"><UiBadge tone="warn">Paused</UiBadge></li>
      <li v-if="gate.frozen"><UiBadge tone="warn">Frozen</UiBadge></li>
      <li v-if="gate.lockedCommission"><UiBadge :symbol="false">Commission locked at {{ gate.lockedCommission.bps }} bps</UiBadge></li>
      <li v-if="gate.policy?.pauseBlocksDecryption"><UiBadge :symbol="false">Pause blocks unlocks</UiBadge></li>
      <li v-if="gate.policy?.pauseBlocksAccess"><UiBadge :symbol="false">Pause blocks access</UiBadge></li>
    </ul>

    <p>
      <!-- A link to Sealed Storage, opened on this gate; the address is made safe (https only) before it is used. -->
      <a class="seal-link" :href="safeHref(sealUrl(gate.gateId))" target="_blank" rel="noopener" title="Seal-encrypt content that only this gate's pass-holders can unlock"><span aria-hidden="true">🔒</span> Add unlockable content →</a>
    </p>

    <!-- The management surface, closed until asked for; a frozen gate shows why there are no controls. -->
    <details class="manage">
      <summary>Manage</summary>
      <!-- A frozen gate's settings and airdrops are permanently disabled, so only the explanation is shown. -->
      <UiNotice v-if="gate.frozen" type="info">
        This gate is frozen. Its settings and airdrops are permanently disabled; purchases and consumption continue.
      </UiNotice>
      <!-- The three management parts: settings, airdrop and freeze. -->
      <template v-else>
        <GateSettingsPanel :gate="gate" @changed="$emit('changed')" />
        <AirdropForm :gate="gate" @changed="$emit('changed')" />
        <FreezeGateButton :gate="gate" @changed="$emit('changed')" />
      </template>
    </details>
  </UiCard>
</template>

<style scoped>
/* The badges wrap onto several lines. */
.badges {
  display: flex;
  /* Badges wrap on a narrow screen. */
  flex-wrap: wrap;
  /* Tight spacing between badges. */
  gap: var(--space-3xs);
  margin: 0 0 var(--space-xs);
}

/* Space between the management parts. */
.manage > :not(summary) {
  margin-top: var(--space-xs);
}
</style>
