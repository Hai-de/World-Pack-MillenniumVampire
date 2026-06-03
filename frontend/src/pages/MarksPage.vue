<template>
  <div class="vampire-marks-page">
    <AppShell>
      <div class="vampire-marks-page__content vampire-app-page-content">
        <div class="vampire-marks-page__header">
          <h1 class="vampire-heading">印记</h1>
          <button
            type="button"
            class="vampire-marks-page__edit-toggle"
            :class="{ 'vampire-marks-page__edit-toggle--active': isEditing }"
            @click="toggleEditing"
          >
            {{ isEditing ? '完成' : '编辑' }}
          </button>
        </div>

        <!-- 非编辑态：只读列表 -->
        <template v-if="!isEditing">
          <div v-if="marks.length === 0" class="vampire-marks-page__empty">
            <p>暂无印记</p>
            <p class="vampire-marks-page__empty-hint">点击右上角「编辑」添加印记</p>
          </div>

          <div v-else class="vampire-marks-page__list">
            <div
              v-for="mark in marks"
              :key="mark.id"
              class="vampire-marks-page__item vampire-card"
            >
              <span class="vampire-marks-page__name">{{ mark.name }}</span>
              <p v-if="mark.description" class="vampire-marks-page__desc">
                {{ mark.description }}
              </p>
            </div>
          </div>
        </template>

        <!-- 编辑态 -->
        <template v-else>
          <!-- 已有印记列表（可编辑/删除） -->
          <div v-if="marks.length > 0" class="vampire-marks-page__list vampire-marks-page__list--editing">
            <div
              v-for="mark in marks"
              :key="mark.id"
              class="vampire-marks-page__edit-item"
            >
              <div class="vampire-marks-page__edit-fields">
                <input
                  v-model="editDrafts[mark.id].name"
                  type="text"
                  class="vampire-marks-page__input"
                  placeholder="印记名称"
                  maxlength="30"
                />
                <textarea
                  v-model="editDrafts[mark.id].description"
                  class="vampire-marks-page__textarea"
                  placeholder="描述（可选）"
                  rows="2"
                  maxlength="200"
                />
              </div>
              <div class="vampire-marks-page__edit-actions">
                <button
                  type="button"
                  class="vampire-marks-page__btn vampire-marks-page__btn--save"
                  :disabled="!isDraftValid(mark.id)"
                  @click="saveEdit(mark.id)"
                >
                  保存
                </button>
                <button
                  type="button"
                  class="vampire-marks-page__btn vampire-marks-page__btn--delete"
                  @click="handleDelete(mark)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>

          <div v-else class="vampire-marks-page__empty vampire-marks-page__empty--editing">
            还没有任何印记
          </div>

          <!-- 添加新印记 -->
          <div class="vampire-marks-page__add-section">
            <div v-if="!showAddForm" class="vampire-marks-page__add-trigger">
              <button
                type="button"
                class="vampire-marks-page__btn vampire-marks-page__btn--add"
                @click="showAddForm = true"
              >
                + 添加印记
              </button>
            </div>

            <div v-else class="vampire-marks-page__add-form">
              <div class="vampire-marks-page__edit-fields">
                <input
                  ref="addNameInputRef"
                  v-model="newMark.name"
                  type="text"
                  class="vampire-marks-page__input"
                  placeholder="印记名称"
                  maxlength="30"
                  @keydown.enter="focusAddDesc"
                  @keydown.escape="cancelAdd"
                />
                <textarea
                  ref="addDescInputRef"
                  v-model="newMark.description"
                  class="vampire-marks-page__textarea"
                  placeholder="描述（可选）"
                  rows="2"
                  maxlength="200"
                  @keydown.escape="cancelAdd"
                />
              </div>
              <div class="vampire-marks-page__edit-actions">
                <button
                  type="button"
                  class="vampire-marks-page__btn vampire-marks-page__btn--save"
                  :disabled="!isNewMarkValid"
                  @click="handleAdd"
                >
                  添加
                </button>
                <button
                  type="button"
                  class="vampire-marks-page__btn vampire-marks-page__btn--cancel"
                  @click="cancelAdd"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </AppShell>

    <!-- 删除确认 -->
    <Teleport to="body">
      <Transition name="vampire-confirm-fade">
        <div v-if="deleteTarget" class="vampire-confirm-overlay" @click.self="cancelDelete">
          <div class="vampire-confirm-dialog">
            <p class="vampire-confirm-dialog__text">
              确定删除印记「{{ deleteTarget.name }}」吗？
            </p>
            <div class="vampire-confirm-dialog__actions">
              <button class="vampire-confirm-dialog__btn vampire-confirm-dialog__btn--cancel" @click="cancelDelete">
                取消
              </button>
              <button class="vampire-confirm-dialog__btn vampire-confirm-dialog__btn--confirm" @click="confirmDelete">
                删除
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, computed, watch } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import { useCharacterStore, type Mark } from '../stores/characterStore'

const characterStore = useCharacterStore()
const marks = computed(() => characterStore.marks)

// ─── 编辑模式开关 ───

const isEditing = ref(false)

function toggleEditing() {
  if (isEditing.value) {
    // 退出编辑时，丢弃未保存的修改
    cancelAdd()
  } else {
    // 进入编辑时，为每条印记初始化草稿
    initDrafts()
  }
  isEditing.value = !isEditing.value
}

// ─── 已有印记的编辑草稿 ───

interface Draft {
  name: string
  description: string
}

const editDrafts = reactive<Record<string, Draft>>({})

function initDrafts() {
  // 清空旧草稿
  for (const key of Object.keys(editDrafts)) {
    delete editDrafts[key]
  }
  // 从当前 marks 初始化
  for (const mark of marks.value) {
    editDrafts[mark.id] = { name: mark.name, description: mark.description }
  }
}

// marks 变化时同步草稿（比如删除后）
watch(marks, () => {
  if (!isEditing.value) return
  // 移除已删除印记的草稿
  const currentIds = new Set(marks.value.map(m => m.id))
  for (const key of Object.keys(editDrafts)) {
    if (!currentIds.has(key)) delete editDrafts[key]
  }
  // 补充新增印记的草稿
  for (const mark of marks.value) {
    if (!editDrafts[mark.id]) {
      editDrafts[mark.id] = { name: mark.name, description: mark.description }
    }
  }
}, { deep: true })

function isDraftValid(markId: string): boolean {
  const draft = editDrafts[markId]
  if (!draft) return false
  const trimmed = draft.name.trim()
  if (!trimmed) return false
  const original = marks.value.find(m => m.id === markId)
  if (!original) return false
  return trimmed !== original.name || draft.description !== original.description
}

function saveEdit(markId: string) {
  const draft = editDrafts[markId]
  if (!draft) return
  const name = draft.name.trim()
  if (!name) return
  characterStore.updateMark(markId, { name, description: draft.description })
}

// ─── 添加新印记 ───

const showAddForm = ref(false)
const newMark = reactive<Draft>({ name: '', description: '' })
const addNameInputRef = ref<HTMLInputElement | null>(null)
const addDescInputRef = ref<HTMLTextAreaElement | null>(null)

const isNewMarkValid = computed(() => newMark.name.trim().length > 0)

function focusAddDesc() {
  addDescInputRef.value?.focus()
}

function cancelAdd() {
  showAddForm.value = false
  newMark.name = ''
  newMark.description = ''
}

function handleAdd() {
  const name = newMark.name.trim()
  if (!name) return
  const mark: Mark = {
    id: `mark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: newMark.description
  }
  characterStore.addMark(mark)
  // 同步草稿
  editDrafts[mark.id] = { name: mark.name, description: mark.description }
  cancelAdd()
}

// showAddForm 变为 true 时聚焦名称输入框
watch(showAddForm, (val) => {
  if (val) {
    nextTick(() => addNameInputRef.value?.focus())
  }
})

// ─── 删除印记 ───

const deleteTarget = ref<Mark | null>(null)

function handleDelete(mark: Mark) {
  deleteTarget.value = mark
}

function confirmDelete() {
  if (deleteTarget.value) {
    characterStore.removeMark(deleteTarget.value.id)
    deleteTarget.value = null
  }
}

function cancelDelete() {
  deleteTarget.value = null
}
</script>

<style scoped>
.vampire-marks-page {
  height: 100%;
}

/* ─── 头部 ─── */

.vampire-marks-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.vampire-marks-page__edit-toggle {
  padding: 6px 14px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--vampire-gold);
  background: transparent;
  border: 1px solid var(--vampire-gold-dim);
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-marks-page__edit-toggle:hover {
  background: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

.vampire-marks-page__edit-toggle--active {
  background: var(--vampire-gold);
  border-color: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

/* ─── 只读列表 ─── */

.vampire-marks-page__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.vampire-marks-page__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vampire-marks-page__name {
  font-size: 0.875rem;
  color: var(--vampire-text-primary);
  font-weight: 500;
}

.vampire-marks-page__desc {
  font-size: 0.8125rem;
  color: var(--vampire-text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* ─── 编辑列表 ─── */

.vampire-marks-page__list--editing {
  gap: 12px;
}

.vampire-marks-page__edit-item {
  background: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-md);
  padding: 14px;
}

.vampire-marks-page__edit-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.vampire-marks-page__input {
  width: 100%;
  padding: 8px 12px;
  background: var(--vampire-bg-deep);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-sm);
  color: var(--vampire-text-primary);
  font-size: 0.875rem;
  transition: border-color var(--vampire-transition-fast);
  box-sizing: border-box;
}

.vampire-marks-page__input:focus {
  outline: none;
  border-color: var(--vampire-gold);
}

.vampire-marks-page__textarea {
  width: 100%;
  padding: 8px 12px;
  background: var(--vampire-bg-deep);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-sm);
  color: var(--vampire-text-secondary);
  font-size: 0.8125rem;
  line-height: 1.5;
  resize: vertical;
  transition: border-color var(--vampire-transition-fast);
  box-sizing: border-box;
  font-family: inherit;
}

.vampire-marks-page__textarea:focus {
  outline: none;
  border-color: var(--vampire-gold);
}

.vampire-marks-page__edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ─── 按钮 ─── */

.vampire-marks-page__btn {
  padding: 6px 14px;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
  border: 1px solid;
}

.vampire-marks-page__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vampire-marks-page__btn--save {
  color: var(--vampire-gold);
  border-color: var(--vampire-gold-dim);
  background: transparent;
}

.vampire-marks-page__btn--save:hover:not(:disabled) {
  background: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

.vampire-marks-page__btn--delete {
  color: var(--vampire-text-muted);
  border-color: var(--vampire-border-muted);
  background: transparent;
}

.vampire-marks-page__btn--delete:hover {
  color: var(--vampire-blood);
  border-color: var(--vampire-blood-dim);
  background: rgba(139, 0, 0, 0.08);
}

.vampire-marks-page__btn--cancel {
  color: var(--vampire-text-muted);
  border-color: var(--vampire-border-muted);
  background: transparent;
}

.vampire-marks-page__btn--cancel:hover {
  background: var(--vampire-bg-deep);
}

.vampire-marks-page__btn--add {
  color: var(--vampire-gold);
  border-color: var(--vampire-gold-dim);
  background: transparent;
  width: 100%;
  padding: 10px 14px;
  font-size: 0.8125rem;
}

.vampire-marks-page__btn--add:hover {
  background: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

/* ─── 添加区 ─── */

.vampire-marks-page__add-section {
  margin-top: 16px;
}

.vampire-marks-page__add-form {
  background: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-gold-dim);
  border-radius: var(--vampire-radius-md);
  padding: 14px;
}

/* ─── 空态 ─── */

.vampire-marks-page__empty {
  color: var(--vampire-text-muted);
  font-style: italic;
  font-size: 0.875rem;
  margin-top: 16px;
  text-align: center;
  padding: 32px 16px;
}

.vampire-marks-page__empty p {
  margin: 0;
}

.vampire-marks-page__empty-hint {
  font-size: 0.8125rem;
  margin-top: 8px !important;
  font-style: normal;
  opacity: 0.7;
}

.vampire-marks-page__empty--editing {
  font-style: normal;
  padding: 20px 16px;
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

/* ─── 动画 ─── */

.vampire-confirm-fade-enter-active,
.vampire-confirm-fade-leave-active {
  transition: opacity var(--vampire-transition-fast);
}

.vampire-confirm-fade-enter-from,
.vampire-confirm-fade-leave-to {
  opacity: 0;
}
</style>
