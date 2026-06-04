<template>
  <div class="vampire-response">
    <div class="vampire-response__header">
      <h3 class="vampire-response__title">吸血鬼回应</h3>
      <div class="vampire-response__mode-toggle">
        <button
          type="button"
          class="vampire-response__mode-btn"
          :class="{ 'vampire-response__mode-btn--active': mode === 'player' }"
          @click="mode = 'player'"
        >
          🎮 玩家手写
        </button>
        <button
          type="button"
          class="vampire-response__mode-btn vampire-response__mode-btn--disabled"
          disabled
          title="Agent 生成模式尚未开发完成"
        >
          🤖 Agent 生成
          <span class="vampire-response__mode-coming-soon">开发中</span>
        </button>
      </div>
    </div>

    <!-- 编辑器区域 -->
    <div class="vampire-response__editor-container">
      <textarea
        v-model="textContent"
        class="vampire-response__textarea vampire-parchment-bg"
        :maxlength="MAX_LENGTH"
        placeholder="在此书写你的吸血鬼回应…"
        @input="onInput"
      />
    </div>

    <!-- 底部信息栏 -->
    <div class="vampire-response__footer">
      <div class="vampire-response__stats">
        <span class="vampire-response__char-count">
          {{ characterCount }} 字
        </span>
        <span v-if="lastSaved" class="vampire-response__saved">
          已自动保存
        </span>
      </div>
      <button
        type="button"
        class="vampire-response__submit-btn"
        :disabled="isSubmitting || characterCount === 0"
        @click="handleSubmit"
      >
        {{ isSubmitting ? '提交中...' : '提交回应' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useShellAuth } from '../../composables/useShellAuth'
import { useGameStore } from '../../stores/gameStore'

const MAX_LENGTH = 10000

const props = defineProps<{
  promptId?: string
}>()

const emit = defineEmits<{
  submitted: [response: string]
  'submit-requested': [submission: { promptId: string; promptContent: string; responseContent: string; mode: 'player' | 'agent' }]
}>()

const { httpClient } = useShellAuth()
const gameStore = useGameStore()

// chronicleId 来自 gameStore.lastConsumedPrompt（DiceRoller 投骰后写入）
// 不再从 perceive.current_prompt 拉取，因为那返回的是替换提示而非被消费提示
const resolvedPromptId = computed(() => {
  if (props.promptId) return props.promptId
  return gameStore.lastConsumedPrompt?.chronicleId ?? null
})

const mode = ref<'player' | 'agent'>('player')
const isSubmitting = ref(false)
const lastSaved = ref<Date | null>(null)
const textContent = ref('')

let saveTimer: ReturnType<typeof setTimeout> | null = null

const characterCount = ref(0)

function onInput() {
  characterCount.value = textContent.value.length

  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveDraft(textContent.value)
    lastSaved.value = new Date()
  }, 500)
}

function saveDraft(content: string) {
  try {
    localStorage.setItem(`vampire_draft_${resolvedPromptId.value}`, content)
  } catch (e) {
    console.warn('Failed to save draft:', e)
  }
}

function loadDraft(): string | null {
  try {
    return localStorage.getItem(`vampire_draft_${resolvedPromptId.value}`)
  } catch {
    return null
  }
}

async function handleSubmit() {
  const content = textContent.value.trim()
  if (!content || isSubmitting.value) return
  if (!resolvedPromptId.value) return

  const promptContent = gameStore.lastConsumedPrompt?.content ?? ''

  emit('submit-requested', {
    promptId: resolvedPromptId.value,
    promptContent,
    responseContent: content,
    mode: mode.value
  })
}

/** 由父组件（通过 ref）调用，确认提交到指定回忆。返回服务端创建的经历信息。 */
async function confirmSubmit(memoryId: string) {
  const content = textContent.value.trim()
  if (!content || isSubmitting.value) return null
  if (!resolvedPromptId.value) return null

  isSubmitting.value = true

  try {
    const result = await httpClient.respondToPrompt({
      promptId: resolvedPromptId.value,
      response: content,
      mode: mode.value,
      memoryId
    })

    localStorage.removeItem(`vampire_draft_${resolvedPromptId.value}`)
    textContent.value = ''
    characterCount.value = 0
    gameStore.setLastConsumedPrompt(null)
    emit('submitted', content)
    return result
  } catch (err) {
    console.error('Failed to submit response:', err)
    throw err
  } finally {
    isSubmitting.value = false
  }
}

defineExpose({ confirmSubmit })

onMounted(() => {
  const draft = loadDraft()
  if (draft) {
    textContent.value = draft
    characterCount.value = draft.length
  }
})

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
})
</script>

<style scoped>
.vampire-response {
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  overflow: hidden;
}

/* 编辑器内禁用全局金色聚焦环 */
.vampire-response :focus-visible {
  outline: none;
}

.vampire-response__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vampire-border-muted);
}

.vampire-response__title {
  font-family: var(--vampire-font-heading);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vampire-gold);
}

.vampire-response__mode-toggle {
  display: flex;
  gap: 4px;
}

.vampire-response__mode-btn {
  padding: 4px 10px;
  font-size: 0.75rem;
  background: none;
  border: 1px solid var(--vampire-border-subtle);
  color: var(--vampire-text-muted);
  cursor: pointer;
  border-radius: var(--vampire-radius-sm);
  transition: all var(--vampire-transition-fast);
}

.vampire-response__mode-btn:hover {
  background-color: var(--vampire-bg-deep);
}

.vampire-response__mode-btn--active {
  background-color: var(--vampire-blood-dim);
  color: var(--vampire-text-primary);
  border-color: var(--vampire-blood-dim);
}

.vampire-response__mode-btn--disabled {
  opacity: 0.45;
  cursor: not-allowed;
  display: flex;
  align-items: center;
  gap: 4px;
}

.vampire-response__mode-coming-soon {
  font-size: 0.5625rem;
  color: var(--vampire-text-muted);
}

.vampire-response__editor-container {
  min-height: 200px;
  padding: 16px;
}

/* 文本域 */
.vampire-response__textarea {
  display: block;
  width: 100%;
  min-height: 200px;
  resize: vertical;
  padding: 0;
  font-family: var(--vampire-font-body);
  font-size: 0.9375rem;
  line-height: 1.8;
  color: var(--vampire-text-primary);
  background: none;
  border: none;
  outline: none;
  caret-color: var(--vampire-gold);
}

.vampire-response__textarea::placeholder {
  color: var(--vampire-text-muted);
}

.vampire-response__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--vampire-border-muted);
}

.vampire-response__stats {
  display: flex;
  gap: 12px;
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
}

.vampire-response__saved {
  color: var(--vampire-state-success);
}

.vampire-response__submit-btn {
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

.vampire-response__submit-btn:hover:not(:disabled) {
  background-color: #a00000;
}

.vampire-response__submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
