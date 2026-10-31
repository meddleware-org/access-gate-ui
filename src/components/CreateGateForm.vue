<script setup lang="ts">
// Create a new access gate via @meddleware/access-gate-client under Meddleware's recorded deployment:
// `create_gate` for a paid gate (at or above the minimum paid price) or `create_free_gate` (paying the
// platform's free-gate fee), with the operator's immutable GatePolicy. Emits the tx digest.
import { computed, onMounted, ref, useId } from 'vue'
import { CopyableAddress, ExplorerLink, UiButton, UiCard, UiCheckField, UiNotice, UiStepper, UiTextField, type StepperStep } from '@meddleware/ui'
import { mistToSui, suiExplorerUrl, suiToMist } from '@meddleware/web-utils'
import { isRestrictivePolicy } from '@meddleware/access-gate-client'
import { buildNewGateTx, errorMessage, executeTx, getPlatformConfig, minimumGatePriceMist } from '../gates.js'
import { imageUrlError } from '../validation.js'
import { GATE_ALLOW_FREE, GATE_POLICY, GATE_POLICY_ERROR, explorerNetwork } from '../config.js'
import { gatePriceError } from '../gate-price.js'

const props = defineProps<{
  /** Connected operator address; prefilled as the default payment recipient. */
  address: string
}>()
const emit = defineEmits<{ (e: 'created', digest: string): void }>()

const id = useId()
const priceSui = ref('0')
const defaultUses = ref('0')
const soulbound = ref(false)
const autoBurnAtZero = ref(false)
const nftName = ref('')
const nftImageUrl = ref('')
const nftDescription = ref('')
const paymentRecipient = ref(props.address)

const submitting = ref(false)
const error = ref<string | null>(null)
const okDigest = ref<string | null>(null)

const STEPS: StepperStep[] = [
  { id: 'economics', label: 'Economics' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'options', label: 'Options' },
]
const step = ref(0)

/** Minimum paid price and free-gate fee (MIST); `null` until read (or if they could not be). */
const minPriceMist = ref<bigint | null>(null)
const freeGateFeeMist = ref<bigint | null>(null)
const restricted = isRestrictivePolicy(GATE_POLICY)

/** What the price field tells the person: free gates, the free-gate fee, the minimum. */
const priceHint = computed(() => {
  const parts: string[] = []
  if (GATE_ALLOW_FREE) {
    const fee = freeGateFeeMist.value !== null && freeGateFeeMist.value > 0n ? ` (one-off fee of ${mistToSui(freeGateFeeMist.value)} SUI)` : ''
    parts.push(`0 = free gate${fee}.`)
  }
  if (minPriceMist.value !== null && minPriceMist.value > 0n) parts.push(`Minimum ${mistToSui(minPriceMist.value)} SUI.`)
  return parts.join(' ') || undefined
})

onMounted(async () => {
  try {
    const platform = await getPlatformConfig()
    minPriceMist.value = minimumGatePriceMist(platform)
    freeGateFeeMist.value = platform.freeGateFeeMist
  } catch {
    // Read again (and surfaced) at submit time.
  }
})

async function submit(): Promise<void> {
  error.value = null
  okDigest.value = null
  if (GATE_POLICY_ERROR) {
    error.value = GATE_POLICY_ERROR
    return
  }
  submitting.value = true
  try {
    const priceMist = suiToMist(priceSui.value)
    // Re-read at submit so the floor and fee reflect the live platform (fails closed if unreadable).
    const platform = await getPlatformConfig()
    const minMist = minimumGatePriceMist(platform)
    minPriceMist.value = minMist
    freeGateFeeMist.value = platform.freeGateFeeMist
    const priceError = gatePriceError(priceMist, minMist, GATE_ALLOW_FREE)
    if (priceError) throw new Error(priceError)
    const imageError = imageUrlError(nftImageUrl.value)
    if (imageError) throw new Error(imageError)
    const tx = buildNewGateTx({
      priceMist,
      paymentRecipient: paymentRecipient.value.trim(),
      defaultUses: BigInt(defaultUses.value || '0'),
      soulbound: soulbound.value,
      autoBurnAtZero: autoBurnAtZero.value,
      nftName: nftName.value,
      nftImageUrl: nftImageUrl.value.trim(),
      nftDescription: nftDescription.value,
      policy: GATE_POLICY,
      freeGateFeeMist: platform.freeGateFeeMist,
    })
    const digest = await executeTx(tx)
    okDigest.value = digest
    emit('created', digest)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UiCard title="Create a gate">
    <UiStepper v-model="step" :steps="STEPS" />
    <form class="form" @submit.prevent="submit">
      <fieldset v-if="step === 0">
        <legend>Economics</legend>
        <UiTextField :id="`${id}-price`" v-model="priceSui" type="number" label="Price (SUI)" :hint="priceHint" min="0" step="0.000000001" inputmode="decimal" />
        <UiTextField :id="`${id}-uses`" v-model="defaultUses" type="number" label="Default credits" hint="0 = unlimited pass; N = NFT granting N upload credits." min="0" step="1" />
        <UiTextField :id="`${id}-recipient`" v-model="paymentRecipient" label="Payment recipient" hint="Where purchase revenue is sent (after the platform commission)." placeholder="0x…" spellcheck="false" />
      </fieldset>

      <fieldset v-else-if="step === 1">
        <legend>Appearance</legend>
        <UiTextField :id="`${id}-name`" v-model="nftName" label="NFT name" placeholder="My access pass" />
        <UiTextField :id="`${id}-image`" v-model="nftImageUrl" type="url" label="NFT image URL" placeholder="https://…" spellcheck="false" />
        <UiTextField :id="`${id}-description`" v-model="nftDescription" label="NFT description" placeholder="Grants access to…" />
      </fieldset>

      <fieldset v-else>
        <legend>Options</legend>
        <UiCheckField v-model="soulbound" label="Soulbound (non-transferable NFTs)" />
        <UiCheckField v-model="autoBurnAtZero" label="Auto-burn NFTs at zero credits" />

        <section v-if="restricted" class="policy" aria-labelledby="gate-policy-heading">
          <h4 id="gate-policy-heading">Permanent rules on this deployment</h4>
          <ul>
            <li v-if="GATE_POLICY.freezeRequiresUnpaused">The gate can't be frozen while paused.</li>
            <li v-if="GATE_POLICY.lockCommissionOnFreeze">Freezing locks in the current platform commission.</li>
            <li v-if="GATE_POLICY.pauseBlocksDecryption">Pausing the gate also stops Seal-protected content from being unlocked.</li>
            <li v-if="GATE_POLICY.pauseBlocksAccess">Pausing the gate also stops passes from being used (e.g. relay uploads).</li>
          </ul>
        </section>
      </fieldset>

      <p class="nav">
        <UiButton v-if="step > 0" type="button" variant="secondary" @click="step--">Back</UiButton>
        <UiButton v-if="step < 2" type="button" @click="step++">Next</UiButton>
        <UiButton v-else type="submit" :busy="submitting" :disabled="GATE_POLICY_ERROR !== null">{{ submitting ? 'Creating…' : 'Create gate' }}</UiButton>
      </p>

      <UiNotice v-if="error" type="error" :message="error" />
      <UiNotice v-else-if="okDigest" type="ok">
        Gate created. Transaction
        <CopyableAddress :address="okDigest" label="Copy transaction digest">
          <ExplorerLink :href="suiExplorerUrl('txblock', okDigest, explorerNetwork)" :value="okDigest" />
        </CopyableAddress>
      </UiNotice>
    </form>
  </UiCard>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

fieldset {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  border: 0;
}

legend {
  padding: 0;
  font-weight: var(--font-weight-semibold);
}

.policy ul {
  color: var(--muted);
  font-size: var(--font-size-sm);
}

.nav {
  display: flex;
  gap: var(--space-xs);
  justify-content: flex-end;
  margin: 0;
}
</style>
