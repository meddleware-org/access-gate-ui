<script setup lang="ts">
// Create a new access gate. Builds `create_gate` (or `create_gate_with_policy` when the operator
// configured restrictions) via @meddleware/nft-gate-client under the hardcoded Meddleware package
// (commission enforced), enforcing the operator's minimum price, then emits the tx digest.
import { onMounted, ref } from 'vue'
import { UiCard, UiButton, UiNotice, UiStepper, type StepperStep } from '@meddleware/ui'
import { buildCreateGateTx, isRestrictivePolicy } from '@meddleware/nft-gate-client'
import { PACKAGE_ID, executeTx, minimumGatePriceMist } from '../gates.js'
import { GATE_ALLOW_FREE, GATE_POLICY } from '../config.js'
import { gatePriceError, mistToSui, suiToMist } from '../pricing.js'

const props = defineProps<{
  /** Connected operator address; prefilled as the default payment recipient. */
  address: string
}>()
const emit = defineEmits<{ (e: 'created', digest: string): void }>()

const priceSui = ref<string | number>('0')
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

/** Operator minimum non-zero price (MIST); `null` until resolved (or if it could not be read). */
const minPriceMist = ref<bigint | null>(null)
const restricted = isRestrictivePolicy(GATE_POLICY)

onMounted(async () => {
  try {
    minPriceMist.value = await minimumGatePriceMist()
  } catch {
    // Resolved again (and surfaced) at submit time.
  }
})

async function submit(): Promise<void> {
  error.value = null
  okDigest.value = null
  submitting.value = true
  try {
    const priceMist = suiToMist(priceSui.value)
    // Re-resolve at submit so the floor reflects the live commission (fails closed if unreadable).
    const minMist = await minimumGatePriceMist()
    minPriceMist.value = minMist
    const priceError = gatePriceError(priceMist, minMist, GATE_ALLOW_FREE)
    if (priceError) throw new Error(priceError)
    const tx = buildCreateGateTx(PACKAGE_ID, {
      priceMist,
      paymentRecipient: paymentRecipient.value.trim(),
      defaultUses: BigInt(defaultUses.value || '0'),
      soulbound: soulbound.value,
      autoBurnAtZero: autoBurnAtZero.value,
      nftName: nftName.value,
      nftImageUrl: nftImageUrl.value,
      nftDescription: nftDescription.value,
      policy: GATE_POLICY,
    })
    const digest = await executeTx(tx)
    okDigest.value = digest
    emit('created', digest)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UiCard title="Create a gate">
    <UiStepper :steps="STEPS" v-model="step" />
    <form class="form" @submit.prevent="submit">

      <!-- Step 0: Economics -->
      <template v-if="step === 0">
        <label class="field">
          <span>Price (SUI)</span>
          <input v-model="priceSui" type="number" min="0" step="0.000000001" inputmode="decimal" />
          <small>
            <template v-if="GATE_ALLOW_FREE">0 = free gate. </template>
            <template v-if="minPriceMist !== null && minPriceMist > 0n">
              Minimum {{ mistToSui(minPriceMist) }} SUI.
            </template>
          </small>
        </label>

        <label class="field">
          <span>Default credits</span>
          <input v-model="defaultUses" type="number" min="0" step="1" />
          <small>0 = unlimited pass; N = NFT granting N upload credits.</small>
        </label>

        <label class="field">
          <span>Payment recipient</span>
          <input v-model="paymentRecipient" type="text" placeholder="0x…" spellcheck="false" />
          <small>Where purchase revenue is sent (after the platform commission).</small>
        </label>

        <div class="nav-row">
          <UiButton type="button" @click="step++">Next</UiButton>
        </div>
      </template>

      <!-- Step 1: Appearance -->
      <template v-else-if="step === 1">
        <label class="field">
          <span>NFT name</span>
          <input v-model="nftName" type="text" placeholder="My access pass" />
        </label>

        <label class="field">
          <span>NFT image URL</span>
          <input v-model="nftImageUrl" type="url" placeholder="https://…" spellcheck="false" />
        </label>

        <label class="field">
          <span>NFT description</span>
          <input v-model="nftDescription" type="text" placeholder="Grants access to…" />
        </label>

        <div class="nav-row">
          <UiButton type="button" variant="secondary" @click="step--">Back</UiButton>
          <UiButton type="button" @click="step++">Next</UiButton>
        </div>
      </template>

      <!-- Step 2: Options + submit -->
      <template v-else-if="step === 2">
        <label class="check">
          <input v-model="soulbound" type="checkbox" />
          <span>Soulbound (non-transferable NFTs)</span>
        </label>

        <label class="check">
          <input v-model="autoBurnAtZero" type="checkbox" />
          <span>Auto-burn NFTs at zero credits</span>
        </label>

        <section v-if="restricted" class="policy" aria-labelledby="gate-policy-heading">
          <h4 id="gate-policy-heading">Permanent rules on this deployment</h4>
          <ul>
            <li v-if="GATE_POLICY.freezeRequiresUnpaused">The gate can't be frozen while paused.</li>
            <li v-if="GATE_POLICY.lockCommissionOnFreeze">Freezing locks in the current platform commission.</li>
            <li v-if="GATE_POLICY.pauseBlocksDecryption">Pausing the gate also stops Seal-protected content from being unlocked.</li>
          </ul>
        </section>

        <div class="nav-row">
          <UiButton type="button" variant="secondary" @click="step--">Back</UiButton>
          <UiButton type="submit" :disabled="submitting">
            {{ submitting ? 'Creating…' : 'Create gate' }}
          </UiButton>
        </div>
      </template>

      <UiNotice v-if="error" type="error">{{ error }}</UiNotice>
      <UiNotice v-else-if="okDigest" type="ok">Gate created. Tx: {{ okDigest }}</UiNotice>
    </form>
  </UiCard>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field > span {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}
.field input {
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: var(--mw-radius, 8px);
  background: var(--surface);
  color: var(--text);
  font-size: 0.95rem;
}
.field small {
  color: var(--muted);
  font-size: 0.8rem;
}
.policy h4 {
  margin: 0 0 0.3rem;
  font-size: 0.9rem;
}
.policy ul {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--muted);
  font-size: 0.85rem;
}
.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text);
}
.nav-row {
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
  margin-top: 0.4rem;
}
</style>
