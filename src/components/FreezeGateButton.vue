<script setup lang="ts">
// Irreversible: make the gate immutable (consumes the AdminCap, permanently ending all setters
// and airdrop). Guarded behind a typed confirmation in a dialog. A gate whose policy forbids freezing
// while paused shows why instead of offering a transaction that would abort.
import { computed, ref, useId } from 'vue'
import { UiButton, UiDialog, UiNotice, UiTextField } from '@meddleware/ui'
import { buildMakeGateImmutableTx } from '@meddleware/access-gate-client'
import type { OwnedGate } from '@meddleware/access-gate-client'
import { adminContext, errorMessage, executeTx } from '../gates.js'

const props = defineProps<{
  /** The gate to freeze. */
  gate: OwnedGate
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const id = useId()
const confirming = ref(false)
const confirmText = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

/** The gate's policy forbids freezing while it is paused (the contract would abort with code 10). */
const blockedByPause = computed(() => Boolean(props.gate.policy?.freezeRequiresUnpaused && props.gate.paused))

async function freeze(): Promise<void> {
  if (confirmText.value !== 'FREEZE') return
  error.value = null
  busy.value = true
  try {
    await executeTx(buildMakeGateImmutableTx(adminContext(props.gate)))
    emit('changed')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
    confirming.value = false
  }
}
</script>

<template>
  <div class="freeze">
    <UiNotice v-if="blockedByPause" type="info">
      This gate can't be frozen while paused (its policy keeps frozen gates purchasable). Unpause it first.
    </UiNotice>
    <UiButton v-else variant="danger" @click="confirming = true">Freeze gate (irreversible)</UiButton>
    <UiNotice v-if="error" type="error" :message="error" />

    <UiDialog v-model:open="confirming" title="Freeze this gate?" @close="confirmText = ''">
      <UiNotice type="warning">
        Freezing is <strong>permanent</strong>: it destroys the AdminCap and ends all settings and airdrops for this gate. Purchases and
        consumption continue.
        <template v-if="gate.policy?.lockCommissionOnFreeze">The current platform commission terms are locked in for all future purchases.</template>
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
.freeze {
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: var(--space-2xs);
}
</style>
