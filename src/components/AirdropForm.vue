<script setup lang="ts">
// AdminCap-gated grant of the gate's NFT flavour to an address. Free for the recipient; the admin
// pays the platform the commission a purchase at the current price would carry.
import { onMounted, ref } from 'vue'
import { UiButton, UiNotice } from '@meddleware/ui'
import { gateCommissionMist } from '@meddleware/access-gate-client'
import type { OwnedGate } from '@meddleware/access-gate-client'
import { buildGateAirdropTx, errorMessage, executeTx, getPlatformConfig } from '../gates.js'
import { mistToSui } from '../pricing.js'

const props = defineProps<{
  /** The gate whose NFT flavour is airdropped. */
  gate: OwnedGate
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const recipient = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const okDigest = ref<string | null>(null)
/** Commission per airdrop (MIST); `null` until read. */
const commissionMist = ref<bigint | null>(null)

onMounted(async () => {
  try {
    commissionMist.value = gateCommissionMist(props.gate, await getPlatformConfig())
  } catch {
    // Computed again when airdropping.
  }
})

async function airdrop(): Promise<void> {
  error.value = null
  okDigest.value = null
  busy.value = true
  try {
    const digest = await executeTx(await buildGateAirdropTx(props.gate, recipient.value.trim()))
    okDigest.value = digest
    recipient.value = ''
    emit('changed')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="airdrop">
    <div class="line">
      <label class="field">
        <span>Airdrop access to</span>
        <input v-model="recipient" type="text" placeholder="0x…" spellcheck="false" />
      </label>
      <UiButton variant="secondary" :disabled="busy || !recipient" @click="airdrop">
        {{ busy ? 'Sending…' : 'Airdrop' }}
      </UiButton>
    </div>
    <small v-if="commissionMist !== null && commissionMist > 0n" class="fee">
      Each airdrop pays the platform commission of {{ mistToSui(commissionMist) }} SUI.
    </small>
    <UiNotice v-if="error" type="error">{{ error }}</UiNotice>
    <UiNotice v-else-if="okDigest" type="ok">Airdropped. Tx: {{ okDigest }}</UiNotice>
  </div>
</template>

<style scoped>
.fee {
  color: var(--muted);
  font-size: 0.8rem;
}
.airdrop {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
/* The input nests inside its label (implicit association); caption sits above it. */
.field {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 0.4rem;
}
.field > span {
  font-size: 0.85rem;
  color: var(--muted);
}
.line {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}
.line input {
  width: 100%;
  min-width: 0;
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: var(--mw-radius, 8px);
  background: var(--surface);
  color: var(--text);
  font-size: 0.9rem;
}
</style>
