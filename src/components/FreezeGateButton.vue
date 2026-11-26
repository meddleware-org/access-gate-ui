<script setup lang="ts">
// Irreversible: make the gate immutable (consumes the AdminCap, permanently ending all setters
// and airdrop). Guarded behind a typed confirmation in a dialog. A gate whose policy forbids freezing
// while paused shows why instead of offering a transaction that would abort.
// Vue, the shared UI components, the client's freeze transaction and this app's own modules.
import { computed, ref, useId } from 'vue'
import { UiButton, UiDialog, UiNotice, UiTextField } from '@meddleware/ui'
import { buildMakeGateImmutableTx } from '@meddleware/access-gate-client'
import type { OwnedGate } from '@meddleware/access-gate-client'
import { adminContext, errorMessage, executeTx } from '../gates.js'

// The component's input and event.
const props = defineProps<{
  /** The gate to freeze. */
  gate: OwnedGate
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()

// A unique id prefix, and the dialog's state: open, the typed confirmation, a running transaction and the last error.
const id = useId()
const confirming = ref(false)
const confirmText = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

/** The gate's policy forbids freezing while it is paused (the contract would abort with code 10). */
const blockedByPause = computed(() => Boolean(props.gate.policy?.freezeRequiresUnpaused && props.gate.paused))

/** freeze(): after the typed confirmation, build and execute the freeze transaction, then tell the parent; the dialog closes either way. */
async function freeze(): Promise<void> {
  // Guard: nothing happens unless the exact word was typed.
  if (confirmText.value !== 'FREEZE') return
  error.value = null
  busy.value = true
  try {
    // Build the freeze transaction and have the wallet sign and execute it.
    await executeTx(buildMakeGateImmutableTx(adminContext(props.gate)))
    emit('changed')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
    // Close the dialog whether it worked or not; the error stays on the page.
    confirming.value = false
  }
}
</script>

<template>
  <div class="freeze">
    <!-- When the policy forbids freezing while paused, say why instead of offering a transaction that would abort. -->
    <UiNotice v-if="blockedByPause" type="info">
      This gate can't be frozen while paused (its policy keeps frozen gates purchasable). Unpause it first.
    </UiNotice>
    <UiButton v-else variant="danger" @click="confirming = true">Freeze gate (irreversible)</UiButton>
    <UiNotice v-if="error" type="error" :message="error" />

    <!-- The confirmation: the typed word must match exactly before the button enables. -->
    <UiDialog v-model:open="confirming" title="Freeze this gate?" @close="confirmText = ''">
      <UiNotice type="warning">
        Freezing is <strong>permanent</strong>: it destroys the AdminCap and ends all settings and airdrops for this gate. Purchases and
        consumption continue.
        <template v-if="gate.policy?.lockCommissionOnFreeze">The current platform fee is locked in for all future purchases.</template>
      </UiNotice>
      <UiTextField :id="`${id}-confirm`" v-model="confirmText" label="Type FREEZE to confirm" placeholder="FREEZE" spellcheck="false" />
      <template #actions="{ close }">
        <UiButton variant="ghost" :disabled="busy" @click="close()">Cancel</UiButton>
        <UiButton variant="danger" :busy="busy" :disabled="confirmText !== 'FREEZE'" @click="freeze">{{ busy ? 'Freezing…' : 'Confirm freeze' }}</UiButton>
      </template>
    </UiDialog>
  </div>
</template>

<style scoped>
/* The button and notices in a column. */
.freeze {
  display: flex;
  flex-direction: column;
  /* Left-aligned. */
  align-items: start;
  gap: var(--space-2xs);
}
</style>
