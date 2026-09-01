<script setup lang="ts">
// One administered gate: summary of its on-chain state, expandable into the management surface
// (settings, airdrop, freeze). A frozen gate shows a locked notice instead of controls.
import { ref } from 'vue'
import { UiCard, UiButton, UiNotice } from '@meddleware/ui'
import type { OwnedGate } from '@meddleware/nft-gate-client'
import GateSettingsPanel from './GateSettingsPanel.vue'
import AirdropForm from './AirdropForm.vue'
import FreezeGateButton from './FreezeGateButton.vue'

defineProps<{
  /** The gate to display and manage. */
  gate: OwnedGate
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const open = ref(false)

/** Short 0x…tail form for object ids. */
function short(id: string): string {
  return id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id
}
function priceLabel(mist: bigint): string {
  return mist === 0n ? 'Free' : `${(Number(mist) / 1e9).toString()} SUI`
}
</script>

<template>
  <UiCard>
    <div class="head">
      <div>
        <h3>{{ gate.nftName || 'Untitled gate' }}</h3>
        <p class="id"><code>{{ short(gate.gateId) }}</code></p>
      </div>
      <div class="badges">
        <span class="badge">{{ priceLabel(gate.priceMist) }}</span>
        <span class="badge">{{ gate.defaultUses === 0n ? 'Unlimited' : `${gate.defaultUses} uses` }}</span>
        <span v-if="gate.soulbound" class="badge">Soulbound</span>
        <span v-if="gate.paused" class="badge badge--warn">Paused</span>
        <span v-if="gate.frozen" class="badge badge--warn">Frozen</span>
      </div>
    </div>

    <div class="actions">
      <UiButton variant="ghost" @click="open = !open">{{ open ? 'Hide' : 'Manage' }}</UiButton>
    </div>

    <div v-if="open" class="manage">
      <UiNotice v-if="gate.frozen" type="info">
        This gate is frozen. Its settings and airdrops are permanently disabled; purchases and
        consumption continue.
      </UiNotice>
      <template v-else>
        <GateSettingsPanel :gate="gate" @changed="emit('changed')" />
        <hr />
        <AirdropForm :gate="gate" @changed="emit('changed')" />
        <hr />
        <FreezeGateButton :gate="gate" @changed="emit('changed')" />
      </template>
    </div>
  </UiCard>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}
.head h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text);
}
.id {
  margin: 0.15rem 0 0;
  color: var(--muted);
  font-size: 0.8rem;
}
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
}
.badge--warn {
  color: var(--mw-gold-500, #b8860b);
  border-color: currentColor;
}
.actions {
  margin-top: 0.75rem;
}
.manage {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.manage hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 0.25rem 0;
  width: 100%;
}
</style>
