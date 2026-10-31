<script setup lang="ts">
// AdminCap-gated grant of the gate's NFT flavour to an address. Free for the recipient; the admin
// pays the platform the commission a purchase at the current price would carry.
import { onMounted, ref, useId } from 'vue'
import { CopyableAddress, ExplorerLink, UiButton, UiNotice, UiTextField } from '@meddleware/ui'
import { mistToSui, suiExplorerUrl } from '@meddleware/web-utils'
import { gateCommissionMist } from '@meddleware/access-gate-client'
import type { OwnedGate } from '@meddleware/access-gate-client'
import { explorerNetwork } from '../config.js'
import { buildGateAirdropTx, errorMessage, executeTx, getPlatformConfig } from '../gates.js'

const props = defineProps<{
  /** The gate whose NFT flavour is airdropped. */
  gate: OwnedGate
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const id = useId()
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
    <UiTextField
      :id="`${id}-recipient`"
      v-model="recipient"
      label="Airdrop access to"
      placeholder="0x…"
      spellcheck="false"
      :hint="commissionMist !== null && commissionMist > 0n ? `Each airdrop pays the platform commission of ${mistToSui(commissionMist)} SUI.` : undefined"
    />
    <UiButton variant="secondary" :busy="busy" :disabled="!recipient" @click="airdrop">{{ busy ? 'Sending…' : 'Airdrop' }}</UiButton>
    <UiNotice v-if="error" type="error" :message="error" />
    <UiNotice v-else-if="okDigest" type="ok">
      Airdropped. Transaction
      <CopyableAddress :address="okDigest" label="Copy transaction digest">
        <ExplorerLink :href="suiExplorerUrl('txblock', okDigest, explorerNetwork)" :value="okDigest" />
      </CopyableAddress>
    </UiNotice>
  </div>
</template>

<style scoped>
.airdrop {
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: var(--space-2xs);
}
</style>
