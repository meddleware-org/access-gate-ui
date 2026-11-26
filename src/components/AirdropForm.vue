<script setup lang="ts">
// AdminCap-gated grant of the gate's NFT flavour to an address. Free for the recipient; the admin
// pays the platform the commission a purchase at the current price would carry.
// Vue, the shared UI components, the formatting helpers, the client's commission helper and this app's own modules.
import { onMounted, ref, useId } from 'vue'
import { CopyableAddress, ExplorerLink, UiButton, UiNotice, UiTextField } from '@meddleware/ui'
import { mistToSui, suiExplorerUrl } from '@meddleware/web-utils'
import { gateCommissionMist } from '@meddleware/access-gate-client'
import type { OwnedGate } from '@meddleware/access-gate-client'
import { explorerNetwork } from '../config.js'
import { buildGateAirdropTx, errorMessage, executeTx, getPlatformConfig } from '../gates.js'

// The component's input and event.
const props = defineProps<{
  /** The gate whose NFT flavour is airdropped. */
  gate: OwnedGate
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()

// A unique id prefix and the form's state: the recipient, a running transaction, the last error and the last digest.
const id = useId()
const recipient = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const okDigest = ref<string | null>(null)
/** Commission per airdrop (MIST); `null` until read. */
const commissionMist = ref<bigint | null>(null)

// Read the commission once to show it in the hint; if it cannot be read it is computed again when airdropping.
onMounted(async () => {
  try {
    commissionMist.value = gateCommissionMist(props.gate, await getPlatformConfig())
  } catch {
    // Computed again when airdropping.
  }
})

/** airdrop(): build and execute the airdrop transaction for the typed address, then clear the field and tell the parent. */
async function airdrop(): Promise<void> {
  error.value = null
  okDigest.value = null
  busy.value = true
  try {
    const digest = await executeTx(await buildGateAirdropTx(props.gate, recipient.value.trim()))
    okDigest.value = digest
    // Clear the field so the same address is not sent twice by accident.
    recipient.value = ''
    // Tell the parent to re-read the gate.
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
    <!-- The recipient's address; the hint states the platform fee each airdrop pays, when known. -->
    <UiTextField
      :id="`${id}-recipient`"
      v-model="recipient"
      label="Airdrop access to"
      placeholder="0x…"
      spellcheck="false"
      :hint="commissionMist !== null && commissionMist > 0n ? `Each airdrop pays the platform fee of ${mistToSui(commissionMist)} SUI.` : undefined"
    />
    <!-- The button is disabled until an address is typed. -->
    <UiButton variant="secondary" :busy="busy" :disabled="!recipient" @click="airdrop">{{ busy ? 'Sending…' : 'Airdrop' }}</UiButton>
    <!-- The outcome: the error, or the transaction digest with an explorer link. -->
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
/* The field, button and notices in a column. */
.airdrop {
  display: flex;
  flex-direction: column;
  /* Left-aligned, so the button does not stretch across the form. */
  align-items: start;
  /* The spacing between field, button and notice. */
  gap: var(--space-2xs);
}
</style>
