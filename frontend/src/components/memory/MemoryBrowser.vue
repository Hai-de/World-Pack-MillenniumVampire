<template>
  <div class="vampire-memory-browser">
    <!-- 搜索和排序控件 -->
    <div class="vampire-memory-browser__controls">
      <div class="vampire-memory-browser__search">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索回忆..."
          class="vampire-memory-browser__search-input"
        />
        <button
          v-if="searchQuery"
          class="vampire-memory-browser__search-clear"
          @click="clearSearch"
        >
          ×
        </button>
      </div>

      <div class="vampire-memory-browser__sort">
        <select v-model="sortBy" class="vampire-memory-browser__sort-select">
          <option value="date">按时间排序</option>
          <option value="name">按名称排序</option>
        </select>
      </div>
    </div>

    <!-- 空态：完全没有回忆 -->
    <div v-if="filteredMemories.length === 0 && !searchQuery" class="vampire-memory-browser__empty">
      <p class="vampire-memory-browser__empty-text">尚未积累任何回忆</p>
      <p class="vampire-memory-browser__empty-hint">回应提示以创造新的经历</p>
    </div>

    <!-- 搜索结果为空 -->
    <div v-else-if="filteredMemories.length === 0 && searchQuery" class="vampire-memory-browser__empty">
      <p class="vampire-memory-browser__empty-text">未找到匹配的回忆</p>
      <p class="vampire-memory-browser__empty-hint">尝试不同的搜索词或清除搜索</p>
      <button class="vampire-memory-browser__empty-action" @click="clearSearch">清除搜索</button>
    </div>

    <!-- 正常态：回忆列表（单列） -->
    <div v-else class="vampire-memory-browser__list">
      <div
        v-for="memory in filteredMemories"
        :key="memory.id"
        class="vampire-memory-browser__card"
        :class="{
          'vampire-memory-browser__card--expanded': expandedMemoryId === memory.id,
          'vampire-memory-browser__card--archived': memory.archivedToDiary
        }"
      >
        <!-- 卡片头部：标题 + 展开箭头 -->
        <div class="vampire-memory-browser__card-header" @click="toggleMemory(memory.id)">
          <div class="vampire-memory-browser__card-title-row">
            <!-- 可编辑标题 -->
            <div v-if="editingMemoryId === memory.id" class="vampire-memory-browser__title-edit" @click.stop>
              <input
                ref="editInputRef"
                v-model="editingName"
                class="vampire-memory-browser__title-input"
                maxlength="40"
                placeholder="回忆名称"
                @keydown.enter="confirmRename(memory.id)"
                @keydown.escape="cancelRename"
                @blur="confirmRename(memory.id)"
              />
            </div>
            <h3 v-else class="vampire-memory-browser__card-title" @click.stop="startRename(memory)">
              {{ memory.name }}
            </h3>

            <span class="vampire-memory-browser__card-chevron">
              {{ expandedMemoryId === memory.id ? '▾' : '▸' }}
            </span>
          </div>
          <div class="vampire-memory-browser__card-meta">
            <span class="vampire-memory-browser__card-count">
              {{ memory.experiences.length }} 段经历
            </span>
            <span v-if="memory.archivedToDiary" class="vampire-memory-browser__card-badge">
              已归档
            </span>
          </div>
        </div>

        <!-- 展开区：经历列表 + 操作栏 -->
        <div v-if="expandedMemoryId === memory.id" class="vampire-memory-browser__card-details">
          <div
            v-for="(experience, index) in memory.experiences"
            :key="experience.id"
            class="vampire-memory-browser__experience"
          >
            <span class="vampire-memory-browser__experience-index">{{ index + 1 }}</span>
            <div class="vampire-memory-browser__experience-body">
              <p class="vampire-memory-browser__experience-content">
                {{ experience.content }}
              </p>
              <span class="vampire-memory-browser__experience-date">
                {{ experience.createdAt }}
              </span>
            </div>
          </div>

          <!-- 操作栏 -->
          <div class="vampire-memory-browser__actions" @click.stop>
            <button
              v-if="!memory.archivedToDiary"
              class="vampire-memory-browser__action-btn vampire-memory-browser__action-btn--archive"
              :disabled="actionLoadingId !== null"
              @click="handleArchive(memory)"
            >
              <span v-if="actionLoadingId === memory.id" class="vampire-memory-browser__action-spinner" />
              归档到日记
            </button>
            <button
              class="vampire-memory-browser__action-btn vampire-memory-browser__action-btn--delete"
              :disabled="actionLoadingId !== null"
              @click="handleDelete(memory)"
            >
              <span v-if="actionLoadingId === memory.id" class="vampire-memory-browser__action-spinner" />
              删除
            </button>
          </div>

          <!-- 操作错误提示 -->
          <div v-if="actionError && actionErrorMemoryId === memory.id" class="vampire-memory-browser__action-error">
            {{ actionError }}
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <Teleport to="body">
      <Transition name="vampire-confirm-fade">
        <div v-if="confirmDialog.visible" class="vampire-confirm-overlay" @click.self="cancelConfirm">
          <div class="vampire-confirm-dialog">
            <p class="vampire-confirm-dialog__text">{{ confirmDialog.text }}</p>
            <div class="vampire-confirm-dialog__actions">
              <button class="vampire-confirm-dialog__btn vampire-confirm-dialog__btn--cancel" @click="cancelConfirm">
                取消
              </button>
              <button class="vampire-confirm-dialog__btn vampire-confirm-dialog__btn--confirm" @click="executeConfirm">
                确认
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { useCharacterStore } from '../../stores/characterStore'
import { useShellAuth } from '../../composables/useShellAuth'

interface Experience {
  id: string
  content: string
  createdAt: string
}

interface Memory {
  id: string
  name: string
  experiences: Experience[]
  archivedToDiary: boolean
}

const props = withDefaults(defineProps<{
  filter?: 'all' | 'active' | 'archived'
}>(), {
  filter: 'all'
})

const characterStore = useCharacterStore()
const { httpClient } = useShellAuth()

// ─── 展开/折叠 ───
const expandedMemoryId = ref<string | null>(null)

function toggleMemory(memoryId: string) {
  expandedMemoryId.value = expandedMemoryId.value === memoryId ? null : memoryId
}

// ─── 搜索与排序 ───
const searchQuery = ref('')
const sortBy = ref<'date' | 'name'>('date')

const filteredMemories = computed(() => {
  let result = characterStore.memories

  switch (props.filter) {
    case 'active':
      result = result.filter(m => !m.archivedToDiary)
      break
    case 'archived':
      result = result.filter(m => m.archivedToDiary)
      break
    default:
      break
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.experiences.some(e => e.content.toLowerCase().includes(query))
    )
  }

  const sorted = [...result]
  sorted.sort((a, b) => {
    if (sortBy.value === 'date') {
      const dateA = a.experiences[a.experiences.length - 1]?.createdAt || ''
      const dateB = b.experiences[b.experiences.length - 1]?.createdAt || ''
      return dateB.localeCompare(dateA)
    } else {
      return a.name.localeCompare(b.name)
    }
  })

  return sorted
})

function clearSearch() {
  searchQuery.value = ''
}

// ─── 内联重命名 ───
const editingMemoryId = ref<string | null>(null)
const editingName = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

function startRename(memory: Memory) {
  editingMemoryId.value = memory.id
  editingName.value = memory.name
  nextTick(() => {
    editInputRef.value?.focus()
    editInputRef.value?.select()
  })
}

async function confirmRename(memoryId: string) {
  const trimmed = editingName.value.trim()
  const original = characterStore.memories.find(m => m.id === memoryId)
  if (!trimmed || !original || trimmed === original.name) {
    cancelRename()
    return
  }

  try {
    await httpClient.renameMemory({ memoryId, name: trimmed })
    characterStore.renameMemory(memoryId, trimmed)
  } catch (err: any) {
    console.error('[MemoryBrowser] rename failed:', err)
    // 重命名失败不阻断 UI，回滚到原名即可
  } finally {
    cancelRename()
  }
}

function cancelRename() {
  editingMemoryId.value = null
  editingName.value = ''
}

// ─── 确认对话框 ───
const confirmDialog = ref<{
  visible: boolean
  text: string
  action: (() => Promise<void>) | null
}>({
  visible: false,
  text: '',
  action: null
})

function showConfirm(text: string, action: () => Promise<void>) {
  confirmDialog.value = { visible: true, text, action }
}

async function executeConfirm() {
  const action = confirmDialog.value.action
  confirmDialog.value = { visible: false, text: '', action: null }
  if (action) await action()
}

function cancelConfirm() {
  confirmDialog.value = { visible: false, text: '', action: null }
}

// ─── 操作反馈 ───
const actionLoadingId = ref<string | null>(null)
const actionError = ref<string | null>(null)
const actionErrorMemoryId = ref<string | null>(null)

function clearActionError() {
  actionError.value = null
  actionErrorMemoryId.value = null
}

// ─── 操作：归档 / 删除 ───
function handleArchive(memory: Memory) {
  clearActionError()
  showConfirm(
    `确定将「${memory.name}」归档到日记吗？归档后将无法撤销。`,
    async () => {
      actionLoadingId.value = memory.id
      try {
        await httpClient.archiveMemory({ memoryId: memory.id })
        characterStore.archiveMemory(memory.id)
        if (expandedMemoryId.value === memory.id) {
          expandedMemoryId.value = null
        }
      } catch (err: any) {
        const msg = translateError(err.message) || '归档失败，请重试'
        actionError.value = msg
        actionErrorMemoryId.value = memory.id
      } finally {
        actionLoadingId.value = null
      }
    }
  )
}

function handleDelete(memory: Memory) {
  clearActionError()
  showConfirm(
    `确定删除回忆「${memory.name}」吗？此操作无法撤销。`,
    async () => {
      actionLoadingId.value = memory.id
      try {
        await httpClient.deleteMemory({ memoryId: memory.id })
        characterStore.removeMemory(memory.id)
        if (expandedMemoryId.value === memory.id) {
          expandedMemoryId.value = null
        }
      } catch (err: any) {
        const msg = translateError(err.message) || '删除失败，请重试'
        actionError.value = msg
        actionErrorMemoryId.value = memory.id
      } finally {
        actionLoadingId.value = null
      }
    }
  )
}

/** 将后端错误码翻译为用户可读文案 */
function translateError(code: string): string | null {
  const map: Record<string, string> = {
    diary_full: '日记已满，无法归档更多回忆',
    already_archived: '该回忆已在日记中',
    memory_not_found: '回忆不存在或已被删除',
    memoryId_required: '缺少回忆 ID',
    memoryId_and_name_required: '缺少必要参数',
  }
  return map[code] ?? null
}
</script>

<style scoped>
/* ─── 控件栏 ─── */

.vampire-memory-browser__controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.vampire-memory-browser__search {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.vampire-memory-browser__search-input {
  width: 100%;
  padding: 10px 16px;
  padding-right: 36px;
  background: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-sm);
  color: var(--vampire-text-primary);
  font-size: 0.875rem;
  transition: all var(--vampire-transition-fast);
}

.vampire-memory-browser__search-input:focus {
  outline: none;
  border-color: var(--vampire-gold);
  box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.1);
}

.vampire-memory-browser__search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--vampire-text-muted);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vampire-memory-browser__search-clear:hover {
  color: var(--vampire-text-secondary);
}

.vampire-memory-browser__sort {
  min-width: 140px;
}

.vampire-memory-browser__sort-select {
  width: 100%;
  padding: 10px 16px;
  background: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-sm);
  color: var(--vampire-text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-memory-browser__sort-select:focus {
  outline: none;
  border-color: var(--vampire-gold);
}

/* ─── 空态 ─── */

.vampire-memory-browser__empty {
  text-align: center;
  padding: 48px 24px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
}

.vampire-memory-browser__empty-text {
  color: var(--vampire-text-secondary);
  font-size: 1rem;
  margin-bottom: 8px;
}

.vampire-memory-browser__empty-hint {
  color: var(--vampire-text-muted);
  font-size: 0.875rem;
}

.vampire-memory-browser__empty-action {
  margin-top: 12px;
  padding: 8px 16px;
  background: var(--vampire-gold);
  border: none;
  border-radius: var(--vampire-radius-sm);
  color: var(--vampire-bg-deep);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-memory-browser__empty-action:hover {
  background: var(--vampire-gold-bright);
}

/* ─── 列表（单列） ─── */

.vampire-memory-browser__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ─── 卡片 ─── */

.vampire-memory-browser__card {
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  padding: 16px 20px;
  cursor: pointer;
  transition: border-color var(--vampire-transition-fast),
              box-shadow var(--vampire-transition-fast);
}

.vampire-memory-browser__card:hover {
  border-color: var(--vampire-gold-dim);
  box-shadow: var(--vampire-shadow-card);
}

.vampire-memory-browser__card--expanded {
  border-color: var(--vampire-gold);
}

.vampire-memory-browser__card--archived {
  opacity: 0.65;
  background-color: var(--vampire-bg-deep);
}

.vampire-memory-browser__card-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vampire-memory-browser__card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.vampire-memory-browser__card-title {
  font-family: var(--vampire-font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: var(--vampire-gold);
  margin: 0;
  cursor: text;
  border-bottom: 1px dashed transparent;
  transition: border-color var(--vampire-transition-fast);
}

.vampire-memory-browser__card-title:hover {
  border-bottom-color: var(--vampire-gold-dim);
}

.vampire-memory-browser__title-edit {
  flex: 1;
  min-width: 0;
}

.vampire-memory-browser__title-input {
  width: 100%;
  font-family: var(--vampire-font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: var(--vampire-gold);
  background: var(--vampire-bg-deep);
  border: 1px solid var(--vampire-gold);
  border-radius: var(--vampire-radius-sm);
  padding: 2px 8px;
  outline: none;
}

.vampire-memory-browser__card-chevron {
  font-size: 0.875rem;
  color: var(--vampire-text-muted);
  flex-shrink: 0;
  transition: transform var(--vampire-transition-fast);
}

.vampire-memory-browser__card-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.vampire-memory-browser__card-count {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
}

.vampire-memory-browser__card-badge {
  font-size: 0.625rem;
  padding: 2px 8px;
  background-color: var(--vampire-ink-dim);
  color: var(--vampire-text-secondary);
  border-radius: 999px;
}

/* ─── 经历展开区 ─── */

.vampire-memory-browser__card-details {
  border-top: 1px solid var(--vampire-border-subtle);
  padding-top: 12px;
  margin-top: 12px;
}

.vampire-memory-browser__experience {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--vampire-border-subtle);
}

.vampire-memory-browser__experience:last-child {
  border-bottom: none;
}

.vampire-memory-browser__experience-index {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--vampire-text-muted);
  background: var(--vampire-bg-deep);
  border-radius: 999px;
  margin-top: 2px;
}

.vampire-memory-browser__experience-body {
  flex: 1;
  min-width: 0;
}

.vampire-memory-browser__experience-content {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--vampire-text-secondary);
  margin: 0 0 4px 0;
}

.vampire-memory-browser__experience-date {
  font-size: 0.6875rem;
  color: var(--vampire-text-muted);
}

/* ─── 操作栏 ─── */

.vampire-memory-browser__actions {
  display: flex;
  gap: 8px;
  padding-top: 14px;
  margin-top: 6px;
  cursor: default;
}

.vampire-memory-browser__action-btn {
  padding: 6px 14px;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
  border: 1px solid;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.vampire-memory-browser__action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vampire-memory-browser__action-btn--archive {
  color: var(--vampire-gold);
  border-color: var(--vampire-gold-dim);
  background: transparent;
}

.vampire-memory-browser__action-btn--archive:hover:not(:disabled) {
  background: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

.vampire-memory-browser__action-btn--delete {
  color: var(--vampire-text-muted);
  border-color: var(--vampire-border-muted);
  background: transparent;
}

.vampire-memory-browser__action-btn--delete:hover:not(:disabled) {
  color: var(--vampire-blood);
  border-color: var(--vampire-blood-dim);
  background: rgba(139, 0, 0, 0.08);
}

.vampire-memory-browser__action-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: vampire-spin 0.6s linear infinite;
}

@keyframes vampire-spin {
  to { transform: rotate(360deg); }
}

.vampire-memory-browser__action-error {
  margin-top: 8px;
  padding: 8px 12px;
  font-size: 0.75rem;
  color: var(--vampire-blood);
  background: rgba(139, 0, 0, 0.06);
  border: 1px solid rgba(139, 0, 0, 0.15);
  border-radius: var(--vampire-radius-sm);
}

/* ─── 确认对话框 ─── */

.vampire-confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 24px;
}

.vampire-confirm-dialog {
  background: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  padding: 28px 24px 20px;
  max-width: 360px;
  width: 100%;
  box-shadow: var(--vampire-shadow-elevated);
}

.vampire-confirm-dialog__text {
  color: var(--vampire-text-primary);
  font-size: 0.9375rem;
  line-height: 1.6;
  margin: 0 0 24px 0;
  text-align: center;
}

.vampire-confirm-dialog__actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.vampire-confirm-dialog__btn {
  padding: 8px 20px;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
  border: 1px solid;
  min-width: 72px;
}

.vampire-confirm-dialog__btn--cancel {
  color: var(--vampire-text-secondary);
  border-color: var(--vampire-border-muted);
  background: transparent;
}

.vampire-confirm-dialog__btn--cancel:hover {
  background: var(--vampire-bg-deep);
}

.vampire-confirm-dialog__btn--confirm {
  color: var(--vampire-parchment);
  border-color: var(--vampire-blood);
  background: var(--vampire-blood);
}

.vampire-confirm-dialog__btn--confirm:hover {
  background: #a00000;
}

/* ─── 对话框动画 ─── */

.vampire-confirm-fade-enter-active,
.vampire-confirm-fade-leave-active {
  transition: opacity var(--vampire-transition-fast);
}

.vampire-confirm-fade-enter-from,
.vampire-confirm-fade-leave-to {
  opacity: 0;
}
</style>
