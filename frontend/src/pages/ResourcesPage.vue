<template>
  <div class="vampire-resources-page">
    <AppShell>
      <div class="vampire-resources-page__content vampire-app-page-content">
        <div class="vampire-resources-page__header">
          <h1 class="vampire-heading">资源</h1>
          <button
            type="button"
            class="vampire-resources-page__edit-toggle"
            :class="{ 'vampire-resources-page__edit-toggle--active': isEditing }"
            @click="toggleEditing"
          >
            {{ isEditing ? '完成' : '编辑' }}
          </button>
        </div>

        <!-- 非编辑态：只读列表 -->
        <template v-if="!isEditing">
          <div v-if="resources.length === 0" class="vampire-resources-page__empty">
            <p>暂无资源</p>
            <p class="vampire-resources-page__empty-hint">点击右上角「编辑」添加资源</p>
          </div>

          <div v-else class="vampire-resources-page__list">
            <div
              v-for="resource in resources"
              :key="resource.id"
              class="vampire-resources-page__item vampire-card"
              :class="{ 'vampire-resources-page__item--lost': resource.lost }"
            >
              <div class="vampire-resources-page__item-main">
                <div class="vampire-resources-page__item-header">
                  <span class="vampire-resources-page__name">{{ resource.name }}</span>
                  <span v-if="resource.kind === 'diary'" class="vampire-resources-page__badge">日记</span>
                </div>
                <p v-if="resource.description" class="vampire-resources-page__desc">
                  {{ resource.description }}
                </p>
              </div>
              <span class="vampire-resources-page__status">
                {{ resource.lost ? '已失去' : '持有中' }}
              </span>
            </div>
          </div>
        </template>

        <!-- 编辑态 -->
        <template v-else>
          <!-- 已有资源列表（可编辑/删除） -->
          <div v-if="resources.length > 0" class="vampire-resources-page__list vampire-resources-page__list--editing">
            <div
              v-for="resource in resources"
              :key="resource.id"
              class="vampire-resources-page__edit-item"
            >
              <div class="vampire-resources-page__edit-fields">
                <input
                  v-model="editDrafts[resource.id].name"
                  type="text"
                  class="vampire-resources-page__input"
                  placeholder="资源名称"
                  maxlength="30"
                />
                <textarea
                  v-model="editDrafts[resource.id].description"
                  class="vampire-resources-page__textarea"
                  placeholder="描述（可选）"
                  rows="2"
                  maxlength="200"
                />
                <div class="vampire-resources-page__edit-options">
                  <label class="vampire-resources-page__checkbox-label">
                    <input
                      v-model="editDrafts[resource.id].kind"
                      type="radio"
                      value="generic"
                      class="vampire-resources-page__radio"
                    />
                    普通资源
                  </label>
                  <label class="vampire-resources-page__checkbox-label">
                    <input
                      v-model="editDrafts[resource.id].kind"
                      type="radio"
                      value="diary"
                      class="vampire-resources-page__radio"
                    />
                    日记
                  </label>
                  <label class="vampire-resources-page__checkbox-label">
                    <input
                      v-model="editDrafts[resource.id].lost"
                      type="checkbox"
                      class="vampire-resources-page__checkbox"
                    />
                    已失去
                  </label>
                </div>
              </div>
              <div class="vampire-resources-page__edit-actions">
                <button
                  type="button"
                  class="vampire-resources-page__btn vampire-resources-page__btn--save"
                  :disabled="!isDraftValid(resource.id)"
                  @click="saveEdit(resource.id)"
                >
                  保存
                </button>
                <button
                  type="button"
                  class="vampire-resources-page__btn vampire-resources-page__btn--delete"
                  @click="handleDelete(resource)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>

          <div v-else class="vampire-resources-page__empty vampire-resources-page__empty--editing">
            还没有任何资源
          </div>

          <!-- 添加新资源 -->
          <div class="vampire-resources-page__add-section">
            <div v-if="!showAddForm" class="vampire-resources-page__add-trigger">
              <button
                type="button"
                class="vampire-resources-page__btn vampire-resources-page__btn--add"
                @click="showAddForm = true"
              >
                + 添加资源
              </button>
            </div>

            <div v-else class="vampire-resources-page__add-form">
              <div class="vampire-resources-page__edit-fields">
                <input
                  ref="addNameInputRef"
                  v-model="newResource.name"
                  type="text"
                  class="vampire-resources-page__input"
                  placeholder="资源名称"
                  maxlength="30"
                  @keydown.enter="focusAddDesc"
                  @keydown.escape="cancelAdd"
                />
                <textarea
                  ref="addDescInputRef"
                  v-model="newResource.description"
                  class="vampire-resources-page__textarea"
                  placeholder="描述（可选）"
                  rows="2"
                  maxlength="200"
                  @keydown.escape="cancelAdd"
                />
                <div class="vampire-resources-page__edit-options">
                  <label class="vampire-resources-page__checkbox-label">
                    <input
                      v-model="newResource.kind"
                      type="radio"
                      value="generic"
                      class="vampire-resources-page__radio"
                    />
                    普通资源
                  </label>
                  <label class="vampire-resources-page__checkbox-label">
                    <input
                      v-model="newResource.kind"
                      type="radio"
                      value="diary"
                      class="vampire-resources-page__radio"
                    />
                    日记
                  </label>
                </div>
              </div>
              <div class="vampire-resources-page__edit-actions">
                <button
                  type="button"
                  class="vampire-resources-page__btn vampire-resources-page__btn--save"
                  :disabled="!isNewResourceValid"
                  @click="handleAdd"
                >
                  添加
                </button>
                <button
                  type="button"
                  class="vampire-resources-page__btn vampire-resources-page__btn--cancel"
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
              确定删除资源「{{ deleteTarget.name }}」吗？
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
import { useCharacterStore, type Resource } from '../stores/characterStore'

const characterStore = useCharacterStore()
const resources = computed(() => characterStore.resources)

// ─── 编辑模式开关 ───

const isEditing = ref(false)

function toggleEditing() {
  if (isEditing.value) {
    cancelAdd()
  } else {
    initDrafts()
  }
  isEditing.value = !isEditing.value
}

// ─── 已有资源的编辑草稿 ───

interface Draft {
  name: string
  description: string
  kind: 'generic' | 'diary'
  lost: boolean
}

const editDrafts = reactive<Record<string, Draft>>({})

function initDrafts() {
  for (const key of Object.keys(editDrafts)) {
    delete editDrafts[key]
  }
  for (const resource of resources.value) {
    editDrafts[resource.id] = {
      name: resource.name,
      description: resource.description,
      kind: resource.kind,
      lost: resource.lost
    }
  }
}

watch(resources, () => {
  if (!isEditing.value) return
  const currentIds = new Set(resources.value.map(r => r.id))
  for (const key of Object.keys(editDrafts)) {
    if (!currentIds.has(key)) delete editDrafts[key]
  }
  for (const resource of resources.value) {
    if (!editDrafts[resource.id]) {
      editDrafts[resource.id] = {
        name: resource.name,
        description: resource.description,
        kind: resource.kind,
        lost: resource.lost
      }
    }
  }
}, { deep: true })

function isDraftValid(resourceId: string): boolean {
  const draft = editDrafts[resourceId]
  if (!draft) return false
  const trimmed = draft.name.trim()
  if (!trimmed) return false
  const original = resources.value.find(r => r.id === resourceId)
  if (!original) return false
  return (
    trimmed !== original.name ||
    draft.description !== original.description ||
    draft.kind !== original.kind ||
    draft.lost !== original.lost
  )
}

function saveEdit(resourceId: string) {
  const draft = editDrafts[resourceId]
  if (!draft) return
  const name = draft.name.trim()
  if (!name) return
  characterStore.updateResource(resourceId, { name, description: draft.description, kind: draft.kind })
  // lost 状态单独处理
  const resource = resources.value.find(r => r.id === resourceId)
  if (resource && resource.lost !== draft.lost) {
    if (draft.lost) {
      characterStore.loseResource(resourceId)
    } else {
      // 恢复资源：直接修改 store 中的 lost 字段
      resource.lost = false
    }
  }
}

// ─── 添加新资源 ───

const showAddForm = ref(false)
const newResource = reactive<Omit<Draft, 'lost'> & { lost: false }>({
  name: '',
  description: '',
  kind: 'generic',
  lost: false
})
const addNameInputRef = ref<HTMLInputElement | null>(null)
const addDescInputRef = ref<HTMLTextAreaElement | null>(null)

const isNewResourceValid = computed(() => newResource.name.trim().length > 0)

function focusAddDesc() {
  addDescInputRef.value?.focus()
}

function cancelAdd() {
  showAddForm.value = false
  newResource.name = ''
  newResource.description = ''
  newResource.kind = 'generic'
}

function handleAdd() {
  const name = newResource.name.trim()
  if (!name) return
  const resource: Resource = {
    id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: newResource.description,
    kind: newResource.kind,
    lost: false
  }
  characterStore.addResource(resource)
  editDrafts[resource.id] = {
    name: resource.name,
    description: resource.description,
    kind: resource.kind,
    lost: false
  }
  cancelAdd()
}

watch(showAddForm, (val) => {
  if (val) {
    nextTick(() => addNameInputRef.value?.focus())
  }
})

// ─── 删除资源 ───

const deleteTarget = ref<Resource | null>(null)

function handleDelete(resource: Resource) {
  deleteTarget.value = resource
}

function confirmDelete() {
  if (deleteTarget.value) {
    characterStore.removeResource(deleteTarget.value.id)
    deleteTarget.value = null
  }
}

function cancelDelete() {
  deleteTarget.value = null
}
</script>

<style scoped>
.vampire-resources-page {
  height: 100%;
}

/* ─── 头部 ─── */

.vampire-resources-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.vampire-resources-page__edit-toggle {
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

.vampire-resources-page__edit-toggle:hover {
  background: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

.vampire-resources-page__edit-toggle--active {
  background: var(--vampire-gold);
  border-color: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

/* ─── 只读列表 ─── */

.vampire-resources-page__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.vampire-resources-page__item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.vampire-resources-page__item--lost {
  opacity: 0.5;
}

.vampire-resources-page__item--lost .vampire-resources-page__name {
  text-decoration: line-through;
  color: var(--vampire-text-muted);
}

.vampire-resources-page__item-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.vampire-resources-page__item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vampire-resources-page__name {
  font-size: 0.875rem;
  color: var(--vampire-text-primary);
  font-weight: 500;
}

.vampire-resources-page__badge {
  font-size: 0.625rem;
  padding: 1px 6px;
  background-color: var(--vampire-ink-dim);
  color: var(--vampire-text-secondary);
  border-radius: 999px;
  flex-shrink: 0;
}

.vampire-resources-page__desc {
  font-size: 0.8125rem;
  color: var(--vampire-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.vampire-resources-page__status {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
  flex-shrink: 0;
  align-self: flex-end;
}

/* ─── 编辑列表 ─── */

.vampire-resources-page__list--editing {
  gap: 12px;
}

.vampire-resources-page__edit-item {
  background: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-md);
  padding: 14px;
}

.vampire-resources-page__edit-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.vampire-resources-page__input {
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

.vampire-resources-page__input:focus {
  outline: none;
  border-color: var(--vampire-gold);
}

.vampire-resources-page__textarea {
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

.vampire-resources-page__textarea:focus {
  outline: none;
  border-color: var(--vampire-gold);
}

.vampire-resources-page__edit-options {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.vampire-resources-page__checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  color: var(--vampire-text-secondary);
  cursor: pointer;
}

.vampire-resources-page__radio,
.vampire-resources-page__checkbox {
  accent-color: var(--vampire-gold);
  cursor: pointer;
}

.vampire-resources-page__edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ─── 按钮 ─── */

.vampire-resources-page__btn {
  padding: 6px 14px;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
  border: 1px solid;
}

.vampire-resources-page__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vampire-resources-page__btn--save {
  color: var(--vampire-gold);
  border-color: var(--vampire-gold-dim);
  background: transparent;
}

.vampire-resources-page__btn--save:hover:not(:disabled) {
  background: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

.vampire-resources-page__btn--delete {
  color: var(--vampire-text-muted);
  border-color: var(--vampire-border-muted);
  background: transparent;
}

.vampire-resources-page__btn--delete:hover {
  color: var(--vampire-blood);
  border-color: var(--vampire-blood-dim);
  background: rgba(139, 0, 0, 0.08);
}

.vampire-resources-page__btn--cancel {
  color: var(--vampire-text-muted);
  border-color: var(--vampire-border-muted);
  background: transparent;
}

.vampire-resources-page__btn--cancel:hover {
  background: var(--vampire-bg-deep);
}

.vampire-resources-page__btn--add {
  color: var(--vampire-gold);
  border-color: var(--vampire-gold-dim);
  background: transparent;
  width: 100%;
  padding: 10px 14px;
  font-size: 0.8125rem;
}

.vampire-resources-page__btn--add:hover {
  background: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

/* ─── 添加区 ─── */

.vampire-resources-page__add-section {
  margin-top: 16px;
}

.vampire-resources-page__add-form {
  background: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-gold-dim);
  border-radius: var(--vampire-radius-md);
  padding: 14px;
}

/* ─── 空态 ─── */

.vampire-resources-page__empty {
  color: var(--vampire-text-muted);
  font-style: italic;
  font-size: 0.875rem;
  margin-top: 16px;
  text-align: center;
  padding: 32px 16px;
}

.vampire-resources-page__empty p {
  margin: 0;
}

.vampire-resources-page__empty-hint {
  font-size: 0.8125rem;
  margin-top: 8px !important;
  font-style: normal;
  opacity: 0.7;
}

.vampire-resources-page__empty--editing {
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