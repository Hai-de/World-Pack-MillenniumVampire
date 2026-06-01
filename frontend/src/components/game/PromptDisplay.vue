<template>
  <div class="vampire-prompt-display vampire-parchment-bg">
    <!-- 加载态 -->
    <VampireSkeleton v-if="status === 'loading'" variant="prompt" />

    <!-- 错误态 -->
    <VampireErrorBanner
      v-else-if="status === 'error'"
      :error="error"
      :retry="retry"
    />

    <!-- 空态 -->
    <div v-else-if="status === 'empty'" class="vampire-prompt-display__empty">
      <p class="vampire-prompt-display__empty-text">当前位置无提示</p>
      <p class="vampire-prompt-display__empty-hint">投掷骰子以滑动到新的提示位置</p>
    </div>

    <!-- 正常态 -->
    <div v-else-if="prompt" class="vampire-prompt-display__content">
      <div class="vampire-prompt-display__header">
        <span class="vampire-prompt-display__position">
          位置 #{{ prompt.position }}
        </span>
        <span
          class="vampire-prompt-display__status"
          :class="`vampire-prompt-display__status--${promptState}`"
        >
          {{ promptState === 'new' ? '新提示' : promptState === 'read' ? '已读' : '已处理' }}
        </span>
      </div>

      <div class="vampire-prompt-display__body vampire-handwritten">
        {{ prompt.content }}
      </div>

      <div class="vampire-prompt-display__footer">
        <button
          v-if="promptState !== 'processed'"
          type="button"
          class="vampire-prompt-display__respond-btn"
          @click="$emit('respond', prompt.id)"
        >
          回应此提示
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePromptStore } from '../../stores/promptStore'
import { useVampireAsync } from '../../composables/useVampireAsync'
import { useShellAuth } from '../../composables/useShellAuth'
import VampireSkeleton from '../shared/VampireSkeleton.vue'
import VampireErrorBanner from '../shared/VampireErrorBanner.vue'

const promptStore = usePromptStore()
const { httpClient } = useShellAuth()

const { data: prompt, status, error, retry } = useVampireAsync(
  async () => {
    const result = await httpClient.getCurrentPrompt()
    return {
      id: result.id,
      content: result.content,
      position: result.position
    }
  },
  { isEmpty: (d) => !d }
)

const promptState = computed(() => {
  if (!prompt.value) return 'new'
  const existing = promptStore.promptPool.find(p => p.id === prompt.value!.id)
  if (!existing) return 'new'
  if (existing.consumed) return 'processed'
  return 'read'
})

defineEmits<{
  respond: [promptId: string]
}>()
</script>

<style scoped>
.vampire-prompt-display {
  border-radius: var(--vampire-radius-lg);
  border: 1px solid var(--vampire-border-muted);
  box-shadow: var(--vampire-shadow-card);
  overflow: hidden;
}

.vampire-prompt-display__empty {
  padding: 32px;
  text-align: center;
}

.vampire-prompt-display__empty-text {
  color: var(--vampire-text-secondary);
  font-size: 1rem;
}

.vampire-prompt-display__empty-hint {
  color: var(--vampire-text-muted);
  font-size: 0.875rem;
  margin-top: 8px;
}

.vampire-prompt-display__content {
  padding: 20px;
}

.vampire-prompt-display__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.vampire-prompt-display__position {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vampire-text-muted);
}

.vampire-prompt-display__status {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.vampire-prompt-display__status--new {
  background-color: var(--vampire-gold-dim);
  color: var(--vampire-gold);
}

.vampire-prompt-display__status--read {
  background-color: var(--vampire-ink-dim);
  color: var(--vampire-text-secondary);
}

.vampire-prompt-display__status--processed {
  background-color: var(--vampire-parchment-dim);
  color: var(--vampire-text-muted);
}

.vampire-prompt-display__body {
  font-size: 1.125rem;
  line-height: 1.8;
  color: var(--vampire-parchment);
  margin-bottom: 16px;
}

.vampire-prompt-display__footer {
  display: flex;
  justify-content: flex-end;
}

.vampire-prompt-display__respond-btn {
  padding: 8px 20px;
  font-family: var(--vampire-font-body);
  font-size: 0.8125rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--vampire-parchment);
  background-color: var(--vampire-blood);
  border: none;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-prompt-display__respond-btn:hover {
  background-color: #a00000;
}
</style>
