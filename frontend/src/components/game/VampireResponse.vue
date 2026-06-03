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
      <EditorContent :editor="editor" class="vampire-response__editor vampire-parchment-bg" />
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import CharacterCount from '@tiptap/extension-character-count'
import { useShellAuth } from '../../composables/useShellAuth'
import { useGameStore } from '../../stores/gameStore'

const props = defineProps<{
  promptId?: string
}>()

const emit = defineEmits<{
  submitted: [response: string]
}>()

const { httpClient } = useShellAuth()
const gameStore = useGameStore()

// 未传 promptId 时自动从服务端拉取当前提示 ID
const resolvedPromptId = ref<string | null>(props.promptId ?? null)

async function refreshPromptId() {
  try {
    const result = await httpClient.getCurrentPrompt()
    resolvedPromptId.value = result?.id ?? null
  } catch {
    resolvedPromptId.value = null
  }
}

onMounted(() => { if (!props.promptId) refreshPromptId() })
watch(() => gameStore.diceRollCount, () => { if (!props.promptId) refreshPromptId() })

const mode = ref<'player' | 'agent'>('player')
const isSubmitting = ref(false)
const lastSaved = ref<Date | null>(null)
const characterCount = ref(0)

let saveTimer: ReturnType<typeof setTimeout> | null = null

const editor = useEditor({
  extensions: [
    StarterKit,
    CharacterCount.configure({
      limit: 10000
    })
  ],
  content: '',
  onUpdate: ({ editor }: { editor: import('@tiptap/core').Editor }) => {
    characterCount.value = editor.storage.characterCount.characters()
    
    // 自动保存草稿
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveDraft(editor.getHTML())
      lastSaved.value = new Date()
    }, 500)
  },
  editorProps: {
    attributes: {
      class: 'vampire-response__editor-content',
      'data-placeholder': '在此书写你的吸血鬼回应…'
    }
  }
})

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
  if (!editor.value || isSubmitting.value) return

  const content = editor.value.getHTML()
  if (!content || content === '<p></p>') return

  isSubmitting.value = true

  try {
    await httpClient.respondToPrompt({
      promptId: resolvedPromptId.value ?? '',
      response: content,
      mode: mode.value
    })

    // 清除草稿
    localStorage.removeItem(`vampire_draft_${resolvedPromptId.value}`)
    
    emit('submitted', content)
  } catch (err) {
    console.error('Failed to submit response:', err)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  // 加载草稿
  const draft = loadDraft()
  if (draft && editor.value) {
    editor.value.commands.setContent(draft)
  }
})

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
  editor.value?.destroy()
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

/* 编辑器外层容器 */
.vampire-response :deep(.vampire-response__editor) {
  min-height: 200px;
}

/* ─── Tiptap 编辑器内容样式（:deep 穿透 EditorContent 子组件） ─── */
.vampire-response :deep(.vampire-response__editor-content) {
  font-family: var(--vampire-font-body);
  font-size: 0.9375rem;
  line-height: 1.8;
  color: var(--vampire-text-primary);
  caret-color: var(--vampire-gold);
}

.vampire-response :deep(.vampire-response__editor-content p) {
  margin-bottom: 0.75em;
}

.vampire-response :deep(.vampire-response__editor-content p:last-child) {
  margin-bottom: 0;
}

.vampire-response :deep(.vampire-response__editor-content strong) {
  color: var(--vampire-gold);
  font-weight: 600;
}

.vampire-response :deep(.vampire-response__editor-content em) {
  color: var(--vampire-parchment);
  font-style: italic;
}

.vampire-response :deep(.vampire-response__editor-content h3) {
  font-family: var(--vampire-font-heading);
  color: var(--vampire-gold);
  font-size: 1.125rem;
  margin: 1em 0 0.5em;
}

.vampire-response :deep(.vampire-response__editor-content blockquote) {
  border-left: 3px solid var(--vampire-blood-dim);
  padding-left: 12px;
  color: var(--vampire-text-secondary);
  font-style: italic;
  margin: 0.75em 0;
}

.vampire-response :deep(.vampire-response__editor-content hr) {
  border: none;
  border-top: 1px solid var(--vampire-border-muted);
  margin: 1em 0;
}

/* ProseMirror：撑满容器，禁用金色聚焦环 */
.vampire-response :deep(.ProseMirror) {
  min-height: 200px;
  outline: none;
  border: none;
  box-shadow: none;
}

.vampire-response :deep(.ProseMirror:focus) {
  outline: none;
  box-shadow: none;
}

.vampire-response :deep(.ProseMirror:focus-visible) {
  outline: none;
}

/* 编辑器占位提示 */
.vampire-response :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: var(--vampire-text-muted);
  pointer-events: none;
  float: left;
  height: 0;
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
