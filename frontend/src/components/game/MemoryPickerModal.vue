<template>
  <Teleport to="body">
    <Transition name="vampire-modal">
      <div v-if="visible" class="vampire-memory-picker" @click.self="emit('close')">
        <div class="vampire-memory-picker__panel">

          <!-- 标题栏 -->
          <div class="vampire-memory-picker__header">
            <h2 class="vampire-memory-picker__title">
              <template v-if="mode === 'select' || mode === 'create-new'">选择回忆存储经历</template>
              <template v-else-if="mode === 'archive-pick'">选择要归档的回忆</template>
              <template v-else-if="mode === 'forget-pick'">选择要遗忘的回忆</template>
            </h2>
            <button class="vampire-memory-picker__close" @click="emit('close')">✕</button>
          </div>

          <!-- 提示 & 回应预览 -->
          <div class="vampire-memory-picker__preview">
            <div v-if="promptPreview" class="vampire-memory-picker__preview-item">
              <span class="vampire-memory-picker__preview-label">提示</span>
              <span class="vampire-memory-picker__preview-text">{{ truncate(promptPreview, 60) }}</span>
            </div>
            <div v-if="responsePreview" class="vampire-memory-picker__preview-item">
              <span class="vampire-memory-picker__preview-label">回应</span>
              <span class="vampire-memory-picker__preview-text">{{ truncate(stripHtml(responsePreview), 80) }}</span>
            </div>
          </div>

          <div class="vampire-memory-picker__body">

            <!-- ─── 正常选择模式 ─── -->
            <template v-if="mode === 'select'">
              <!-- 空态 -->
              <div v-if="isEmpty" class="vampire-memory-picker__empty">
                <p>尚未积累任何回忆</p>
                <p class="vampire-memory-picker__empty-hint">创建第一段回忆来存储你的经历</p>
              </div>

              <!-- 满载提示 -->
              <div v-else-if="allFull" class="vampire-memory-picker__full-notice">
                <p class="vampire-memory-picker__full-text">⚠️ 所有回忆已满（{{ maxExperiences }}/{{ maxExperiences }} 段经历）</p>
                <p class="vampire-memory-picker__full-hint">需要腾出空间才能存储新经历</p>
                <div class="vampire-memory-picker__full-actions">
                  <button
                    v-if="hasDiary && !isDiaryFull"
                    class="vampire-memory-picker__action-btn vampire-memory-picker__action-btn--archive"
                    @click="mode = 'archive-pick'"
                  >
                    📖 归档到日记
                  </button>
                  <button
                    class="vampire-memory-picker__action-btn vampire-memory-picker__action-btn--forget"
                    @click="mode = 'forget-pick'"
                  >
                    🗑️ 遗忘并新建
                  </button>
                </div>
              </div>

              <!-- 正常列表 -->
              <div v-else class="vampire-memory-picker__list">
                <button
                  v-for="memory in activeMemories"
                  :key="memory.id"
                  class="vampire-memory-picker__card"
                  :class="{
                    'vampire-memory-picker__card--full': memory.experiences.length >= maxExperiences
                  }"
                  :disabled="memory.experiences.length >= maxExperiences"
                  @click="handleSelectMemory(memory.id)"
                >
                  <div class="vampire-memory-picker__card-info">
                    <span class="vampire-memory-picker__card-name">{{ memory.name }}</span>
                    <span class="vampire-memory-picker__card-count">
                      {{ memory.experiences.length }}/{{ maxExperiences }}
                    </span>
                  </div>
                  <div class="vampire-memory-picker__progress">
                    <div
                      class="vampire-memory-picker__progress-fill"
                      :style="{ width: `${(memory.experiences.length / maxExperiences) * 100}%` }"
                    />
                  </div>
                </button>
              </div>

              <!-- 底部操作 -->
              <div class="vampire-memory-picker__footer">
                <button
                  class="vampire-memory-picker__new-btn"
                  @click="mode = 'create-new'"
                >
                  ＋ 新建回忆
                </button>
              </div>
            </template>

            <!-- ─── 新建回忆模式 ─── -->
            <template v-else-if="mode === 'create-new'">
              <div class="vampire-memory-picker__create-form">
                <label class="vampire-memory-picker__label">回忆名称</label>
                <input
                  v-model="newMemoryName"
                  type="text"
                  class="vampire-memory-picker__input"
                  placeholder="例如：童年阴影、佛罗伦萨岁月…"
                  maxlength="50"
                  @keyup.enter="handleCreateMemory"
                />
                <div class="vampire-memory-picker__form-actions">
                  <button class="vampire-memory-picker__back-btn" @click="mode = 'select'">← 返回</button>
                  <button
                    class="vampire-memory-picker__confirm-btn"
                    :disabled="!newMemoryName.trim()"
                    @click="handleCreateMemory"
                  >
                    创建并存储
                  </button>
                </div>
              </div>
            </template>

            <!-- ─── 归档选择模式 ─── -->
            <template v-else-if="mode === 'archive-pick'">
              <p class="vampire-memory-picker__pick-hint">选择一段回忆归档到日记，腾出空间：</p>
              <div class="vampire-memory-picker__list">
                <button
                  v-for="memory in activeMemories"
                  :key="memory.id"
                  class="vampire-memory-picker__card"
                  @click="handleArchiveThenSelect(memory.id)"
                >
                  <div class="vampire-memory-picker__card-info">
                    <span class="vampire-memory-picker__card-name">{{ memory.name }}</span>
                    <span class="vampire-memory-picker__card-count">
                      {{ memory.experiences.length }}/{{ maxExperiences }} 段经历
                    </span>
                  </div>
                </button>
              </div>
              <div class="vampire-memory-picker__footer">
                <button class="vampire-memory-picker__back-btn" @click="mode = 'select'">← 返回</button>
              </div>
            </template>

            <!-- ─── 遗忘选择模式 ─── -->
            <template v-else-if="mode === 'forget-pick'">
              <p class="vampire-memory-picker__pick-hint">选择一段回忆遗忘，腾出空间（此操作不可撤销）：</p>
              <div class="vampire-memory-picker__list">
                <button
                  v-for="memory in activeMemories"
                  :key="memory.id"
                  class="vampire-memory-picker__card vampire-memory-picker__card--danger"
                  @click="handleForgetThenSelect(memory.id)"
                >
                  <div class="vampire-memory-picker__card-info">
                    <span class="vampire-memory-picker__card-name">{{ memory.name }}</span>
                    <span class="vampire-memory-picker__card-count">
                      {{ memory.experiences.length }}/{{ maxExperiences }} 段经历
                    </span>
                  </div>
                </button>
              </div>
              <div class="vampire-memory-picker__footer">
                <button class="vampire-memory-picker__back-btn" @click="mode = 'select'">← 返回</button>
              </div>
            </template>

          </div>

          <!-- 取消按钮 -->
          <div class="vampire-memory-picker__cancel-area">
            <button class="vampire-memory-picker__cancel-btn" @click="emit('close')">取消</button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCharacterStore } from '../../stores/characterStore'

const props = defineProps<{
  visible: boolean
  promptPreview: string
  responsePreview: string
}>()

const emit = defineEmits<{
  'select-memory': [memoryId: string]
  'create-memory': [name: string]
  'archive-then-select': [memoryId: string]
  'forget-then-select': [memoryId: string]
  close: []
}>()

const characterStore = useCharacterStore()

const maxExperiences = 3

const activeMemories = computed(() => characterStore.activeMemories)
const hasDiary = computed(() => characterStore.hasDiary)
const isDiaryFull = computed(() => characterStore.isDiaryFull)

const isEmpty = computed(() => activeMemories.value.length === 0)
const allFull = computed(() =>
  activeMemories.value.length > 0 &&
  activeMemories.value.every(m => m.experiences.length >= maxExperiences)
)

const mode = ref<'select' | 'overflow' | 'archive-pick' | 'forget-pick' | 'create-new'>('select')
const newMemoryName = ref('')

// 打开时重置状态
watch(() => props.visible, (v) => {
  if (v) {
    mode.value = 'select'
    newMemoryName.value = ''
  }
})

function handleSelectMemory(memoryId: string) {
  emit('select-memory', memoryId)
}

function handleCreateMemory() {
  const name = newMemoryName.value.trim()
  if (!name) return
  emit('create-memory', name)
}

function handleArchiveThenSelect(memoryId: string) {
  emit('archive-then-select', memoryId)
}

function handleForgetThenSelect(memoryId: string) {
  emit('forget-then-select', memoryId)
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '…'
}

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}
</script>

<style scoped>
/* ─── 遮罩层 ─── */
.vampire-memory-picker {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background-color: rgba(10, 10, 15, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

/* ─── 模态框面板 ─── */
.vampire-memory-picker__panel {
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  background-color: var(--vampire-bg-base);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  box-shadow: var(--vampire-shadow-elevated);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── 标题栏 ─── */
.vampire-memory-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vampire-border-muted);
}

.vampire-memory-picker__title {
  font-family: var(--vampire-font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: var(--vampire-gold);
  margin: 0;
}

.vampire-memory-picker__close {
  background: none;
  border: none;
  color: var(--vampire-text-muted);
  font-size: 1.125rem;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.vampire-memory-picker__close:hover {
  color: var(--vampire-text-secondary);
}

/* ─── 预览区 ─── */
.vampire-memory-picker__preview {
  padding: 12px 20px;
  background-color: var(--vampire-bg-elevated);
  border-bottom: 1px solid var(--vampire-border-subtle);
}

.vampire-memory-picker__preview-item {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.vampire-memory-picker__preview-item:last-child {
  margin-bottom: 0;
}

.vampire-memory-picker__preview-label {
  font-size: 0.6875rem;
  color: var(--vampire-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
  min-width: 28px;
}

.vampire-memory-picker__preview-text {
  font-size: 0.8125rem;
  color: var(--vampire-text-secondary);
  line-height: 1.4;
}

/* ─── 主体 ─── */
.vampire-memory-picker__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

/* ─── 空态 ─── */
.vampire-memory-picker__empty {
  text-align: center;
  padding: 32px 16px;
  color: var(--vampire-text-secondary);
}

.vampire-memory-picker__empty-hint {
  color: var(--vampire-text-muted);
  font-size: 0.875rem;
  margin-top: 8px;
}

/* ─── 满载提示 ─── */
.vampire-memory-picker__full-notice {
  text-align: center;
  padding: 24px 16px;
}

.vampire-memory-picker__full-text {
  color: var(--vampire-state-warning);
  font-size: 0.9375rem;
  font-weight: 500;
}

.vampire-memory-picker__full-hint {
  color: var(--vampire-text-muted);
  font-size: 0.8125rem;
  margin-top: 8px;
}

.vampire-memory-picker__full-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
}

/* ─── 回忆列表 ─── */
.vampire-memory-picker__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vampire-memory-picker__card {
  display: block;
  width: 100%;
  text-align: left;
  padding: 12px 16px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-md);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-memory-picker__card:hover:not(:disabled) {
  border-color: var(--vampire-gold-dim);
  box-shadow: var(--vampire-shadow-card);
}

.vampire-memory-picker__card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vampire-memory-picker__card--full {
  border-color: var(--vampire-border-subtle);
  background-color: var(--vampire-bg-deep);
}

.vampire-memory-picker__card--danger {
  border-color: rgba(139, 0, 0, 0.3);
}

.vampire-memory-picker__card--danger:hover {
  border-color: var(--vampire-blood);
  background-color: rgba(139, 0, 0, 0.1);
}

.vampire-memory-picker__card-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.vampire-memory-picker__card-name {
  font-size: 0.9375rem;
  color: var(--vampire-text-primary);
  font-weight: 500;
}

.vampire-memory-picker__card-count {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
}

/* ─── 进度条 ─── */
.vampire-memory-picker__progress {
  height: 4px;
  background-color: var(--vampire-bg-deep);
  border-radius: 2px;
  overflow: hidden;
}

.vampire-memory-picker__progress-fill {
  height: 100%;
  background-color: var(--vampire-gold);
  border-radius: 2px;
  transition: width var(--vampire-transition-normal);
}

.vampire-memory-picker__card--full .vampire-memory-picker__progress-fill {
  background-color: var(--vampire-blood);
}

/* ─── 底部操作区 ─── */
.vampire-memory-picker__footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* ─── 新建回忆表单 ─── */
.vampire-memory-picker__create-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vampire-memory-picker__label {
  font-size: 0.8125rem;
  color: var(--vampire-text-secondary);
}

.vampire-memory-picker__input {
  width: 100%;
  padding: 10px 14px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-sm);
  color: var(--vampire-text-primary);
  font-size: 0.9375rem;
  font-family: var(--vampire-font-body);
  transition: border-color var(--vampire-transition-fast);
  box-sizing: border-box;
}

.vampire-memory-picker__input:focus {
  outline: none;
  border-color: var(--vampire-gold);
}

.vampire-memory-picker__form-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

/* ─── 二级选择提示 ─── */
.vampire-memory-picker__pick-hint {
  font-size: 0.875rem;
  color: var(--vampire-text-secondary);
  margin-bottom: 16px;
}

/* ─── 按钮样式 ─── */
.vampire-memory-picker__action-btn {
  width: 100%;
  padding: 12px 16px;
  border-radius: var(--vampire-radius-md);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
  border: 1px solid transparent;
}

.vampire-memory-picker__action-btn--archive {
  background-color: var(--vampire-ink-dim);
  color: var(--vampire-text-primary);
  border-color: var(--vampire-ink);
}

.vampire-memory-picker__action-btn--archive:hover {
  background-color: rgba(45, 27, 105, 0.5);
}

.vampire-memory-picker__action-btn--forget {
  background-color: var(--vampire-blood-dim);
  color: var(--vampire-text-primary);
  border-color: var(--vampire-blood);
}

.vampire-memory-picker__action-btn--forget:hover {
  background-color: rgba(139, 0, 0, 0.5);
}

.vampire-memory-picker__new-btn {
  padding: 8px 16px;
  background: none;
  border: 1px dashed var(--vampire-border-muted);
  border-radius: var(--vampire-radius-sm);
  color: var(--vampire-text-muted);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-memory-picker__new-btn:hover {
  border-color: var(--vampire-gold-dim);
  color: var(--vampire-gold);
}

.vampire-memory-picker__back-btn {
  padding: 8px 16px;
  background: none;
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-sm);
  color: var(--vampire-text-muted);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-memory-picker__back-btn:hover {
  color: var(--vampire-text-secondary);
  border-color: var(--vampire-border-subtle);
}

.vampire-memory-picker__confirm-btn {
  padding: 8px 20px;
  background-color: var(--vampire-blood);
  border: none;
  border-radius: var(--vampire-radius-sm);
  color: var(--vampire-parchment);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-memory-picker__confirm-btn:hover:not(:disabled) {
  background-color: #a00000;
}

.vampire-memory-picker__confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ─── 取消区 ─── */
.vampire-memory-picker__cancel-area {
  padding: 12px 20px;
  border-top: 1px solid var(--vampire-border-subtle);
  display: flex;
  justify-content: center;
}

.vampire-memory-picker__cancel-btn {
  padding: 8px 24px;
  background: none;
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-sm);
  color: var(--vampire-text-muted);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-memory-picker__cancel-btn:hover {
  color: var(--vampire-text-secondary);
  border-color: var(--vampire-border-subtle);
}

/* ─── 过渡动画 ─── */
.vampire-modal-enter-active {
  transition: opacity var(--vampire-transition-normal);
}

.vampire-modal-leave-active {
  transition: opacity var(--vampire-transition-fast);
}

.vampire-modal-enter-from,
.vampire-modal-leave-to {
  opacity: 0;
}

.vampire-modal-enter-active .vampire-memory-picker__panel {
  transition: transform var(--vampire-transition-normal);
}

.vampire-modal-leave-active .vampire-memory-picker__panel {
  transition: transform var(--vampire-transition-fast);
}

.vampire-modal-enter-from .vampire-memory-picker__panel {
  transform: translateY(20px) scale(0.97);
}

.vampire-modal-leave-to .vampire-memory-picker__panel {
  transform: translateY(10px) scale(0.98);
}

/* ─── 移动端适配：底部弹出 ─── */
@media (max-width: 767px) {
  .vampire-memory-picker {
    align-items: flex-end;
    padding: 0;
  }

  .vampire-memory-picker__panel {
    max-height: 90vh;
    border-radius: var(--vampire-radius-lg) var(--vampire-radius-lg) 0 0;
    border-bottom: none;
  }

  .vampire-modal-enter-from .vampire-memory-picker__panel {
    transform: translateY(100%);
  }

  .vampire-modal-leave-to .vampire-memory-picker__panel {
    transform: translateY(100%);
  }
}
</style>
