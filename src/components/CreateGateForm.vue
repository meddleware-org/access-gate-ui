<script setup lang="ts">
// Create a new access gate via @meddleware/access-gate-client under Meddleware's recorded deployment:
// `create_gate` for a paid gate (at or above the minimum paid price) or `create_free_gate` (paying the
// platform's free-gate fee), with the deployment's immutable GatePolicy. Emits the tx digest.
// Vue, the shared UI components, the formatting helpers, the client's policy helper and this app's own modules.
import { computed, onMounted, ref, useId } from 'vue'
import { CopyableAddress, ExplorerLink, UiButton, UiCard, UiCheckField, UiNotice, UiStepper, UiTextField, type StepperStep } from '@meddleware/ui'
import { mistToSui, suiExplorerUrl, suiToMist } from '@meddleware/web-utils'
import { isRestrictivePolicy } from '@meddleware/access-gate-client'
import { buildNewGateTx, errorMessage, executeTx, getPlatformConfig, minimumGatePriceMist } from '../gates.js'
import { imageUrlError } from '../validation.js'
import { GATE_ALLOW_FREE, GATE_POLICY, GATE_POLICY_ERROR, explorerNetwork } from '../config.js'
import { gatePriceError } from '../gate-price.js'

// The component's input and event.
const props = defineProps<{
  /** Connected gate owner's address; prefilled as the default payment recipient. */
  address: string
}>()
const emit = defineEmits<{ (e: 'created', digest: string): void }>()

// A unique id prefix and the form's fields (price in SUI, credits, soulbound, auto-burn and the pass's name, image and description); the payment recipient starts as the connected address.
const id = useId()
const priceSui = ref('0')
// Credits are text in the form and converted on submit.
const defaultUses = ref('0')
const soulbound = ref(false)
const autoBurnAtZero = ref(false)
const nftName = ref('')
const nftImageUrl = ref('')
const nftDescription = ref('')
const paymentRecipient = ref(props.address)

// The submit state: running, the last error and the last digest.
const submitting = ref(false)
const error = ref<string | null>(null)
const okDigest = ref<string | null>(null)

// The three steps of the form.
const STEPS: StepperStep[] = [
  { id: 'economics', label: 'Economics' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'options', label: 'Options' },
]
const step = ref(0)

/** Minimum paid price and free-gate fee (MIST); `null` until read (or if they could not be). */
// The minimum paid price and the free-gate fee, read from the platform config.
const minPriceMist = ref<bigint | null>(null)
const freeGateFeeMist = ref<bigint | null>(null)
// Read-only deployment constants, held as computeds so the template type-checks the same under every vue-tsc (it treats a bare imported
// binding as a possible ref).
// Read-only deployment constants as computed values, so the template type-checks the same under every vue-tsc (an imported binding is treated as a possible ref).
const restricted = computed(() => isRestrictivePolicy(GATE_POLICY))
const policy = computed(() => GATE_POLICY)
const policyError = computed(() => GATE_POLICY_ERROR)

/** What the price field tells the person: free gates, the free-gate fee, the minimum. */
// The price field's hint.
const priceHint = computed(() => {
  // Collect the hint's sentences.
  const parts: string[] = []
  if (GATE_ALLOW_FREE) {
    const fee = freeGateFeeMist.value !== null && freeGateFeeMist.value > 0n ? ` (one-off fee of ${mistToSui(freeGateFeeMist.value)} SUI)` : ''
    parts.push(`0 = free gate${fee}.`)
  }
  if (minPriceMist.value !== null && minPriceMist.value > 0n) parts.push(`Minimum ${mistToSui(minPriceMist.value)} SUI.`)
  return parts.join(' ') || undefined
})

// Read the platform terms once for the hints; they are read again, and surfaced, at submit time.
onMounted(async () => {
  try {
    const platform = await getPlatformConfig()
    minPriceMist.value = minimumGatePriceMist(platform)
    freeGateFeeMist.value = platform.freeGateFeeMist
  } catch {
    // Read again (and surfaced) at submit time.
  }
})

/** submit(): refuse an unusable build policy; read the live terms; check the price and the image address; build and execute the create transaction; and tell the parent. */
async function submit(): Promise<void> {
  error.value = null
  okDigest.value = null
  if (GATE_POLICY_ERROR) {
    error.value = GATE_POLICY_ERROR
    return
  }
  submitting.value = true
  try {
    // The price field is SUI as text; convert it to MIST (an error here is shown like any other).
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
    // Every field goes into one create transaction under the deployment's fixed policy.
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
    // Show the digest and tell the parent the gate exists.
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
    <!-- A stepper over the three fieldsets. -->
    <UiStepper v-model="step" :steps="STEPS" />
    <form class="form" @submit.prevent="submit">
      <!-- Step 1: price, credits and where revenue goes. -->
      <fieldset v-if="step === 0">
        <legend>Economics</legend>
        <!-- The price in SUI; the hint explains free gates and the minimum. -->
        <UiTextField :id="`${id}-price`" v-model="priceSui" type="number" label="Price (SUI)" :hint="priceHint" min="0" step="0.000000001" inputmode="decimal" />
        <!-- Credits: how many uses a pass grants (0 means unlimited). -->
        <UiTextField :id="`${id}-uses`" v-model="defaultUses" type="number" label="Default credits" hint="0 = unlimited pass; N = a pass granting N upload credits." min="0" step="1" />
        <UiTextField :id="`${id}-recipient`" v-model="paymentRecipient" label="Payment recipient" hint="Where purchase revenue is sent (after the platform fee)." placeholder="0x…" spellcheck="false" />
      </fieldset>

      <!-- Step 2: how the pass looks (name, image, description). -->
      <fieldset v-else-if="step === 1">
        <legend>Appearance</legend>
        <UiTextField :id="`${id}-name`" v-model="nftName" label="Pass name" placeholder="My access pass" />
        <!-- The image must be https or a data:image address; it is checked again on submit. -->
        <UiTextField :id="`${id}-image`" v-model="nftImageUrl" type="url" label="Pass image URL" placeholder="https://…" spellcheck="false" />
        <UiTextField :id="`${id}-description`" v-model="nftDescription" label="Pass description" placeholder="Grants access to…" />
      </fieldset>

      <!-- Step 3: soulbound and auto-burn, and the permanent rules this deployment applies. -->
      <fieldset v-else>
        <legend>Options</legend>
        <!-- Soulbound passes cannot be transferred. -->
        <UiCheckField v-model="soulbound" label="Soulbound (passes cannot be transferred)" />
        <UiCheckField v-model="autoBurnAtZero" label="Remove a pass when its credits reach zero" />

        <!-- The immutable policy flags, stated in words, so nobody creates a gate under rules they did not read. -->
        <section v-if="restricted" class="policy" aria-labelledby="gate-policy-heading">
          <h4 id="gate-policy-heading">Permanent rules on this deployment</h4>
          <ul>
            <li v-if="policy.freezeRequiresUnpaused">The gate can't be frozen while paused.</li>
            <li v-if="policy.lockCommissionOnFreeze">Freezing locks in the current platform fee.</li>
            <li v-if="policy.pauseBlocksDecryption">Pausing the gate also stops Seal-protected content from being unlocked.</li>
            <li v-if="policy.pauseBlocksAccess">Pausing the gate also stops passes from being used (e.g. relay uploads).</li>
          </ul>
        </section>
      </fieldset>

      <!-- Back and next; the last step submits, unless the build policy is unusable. -->
      <p class="nav">
        <UiButton v-if="step > 0" type="button" variant="secondary" @click="step--">Back</UiButton>
        <UiButton v-if="step < 2" type="button" @click="step++">Next</UiButton>
        <UiButton v-else type="submit" :busy="submitting" :disabled="policyError !== null">{{ submitting ? 'Creating…' : 'Create gate' }}</UiButton>
      </p>

      <!-- The outcome: the error, or the created gate's transaction with an explorer link. -->
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
/* The form is a column. */
.form {
  /* Column layout with a fixed gap. */
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

/* A fieldset has no border or padding of its own; its legend is the step title. */
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
  /* The legend reads as the step's heading. */
  font-weight: var(--font-weight-semibold);
}

/* The rules list is muted secondary text. */
.policy ul {
  /* Secondary text. */
  color: var(--muted);
  font-size: var(--font-size-sm);
}

/* The buttons sit at the end of the row. */
.nav {
  display: flex;
  gap: var(--space-xs);
  /* Buttons at the end of the row. */
  justify-content: flex-end;
  margin: 0;
}
</style>
