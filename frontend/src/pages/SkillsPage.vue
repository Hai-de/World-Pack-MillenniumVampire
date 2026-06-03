<template>
  <div class="vampire-skills-page">
    <AppShell>
      <div class="vampire-skills-page__content vampire-app-page-content">
        <div class="vampire-skills-page__header">
          <h1 class="vampire-heading">技艺</h1>
          <button
            type="button"
            class="vampire-skills-page__edit-toggle"
            :class="{ 'vampire-skills-page__edit-toggle--active': isEditing }"
            @click="toggleEditing"
          >
            {{ isEditing ? '完成' : '编辑' }}
          </button>
        </div>

        <!-- 非编辑态：只读列表 -->
        <template v-if="!isEditing">
          <div v-if="skills.length === 0" class="vampire-skills-page__empty">
            <p>暂无技艺</p>
            <p class="vampire-skills-page__empty-hint">点击右上角「编辑」添加技艺</p>
          </div>

          <div v-else class="vampire-skills-page__list">
            <div
              v-for="skill in skills"
              :key="skill.id"
              class="vampire-skills-page__item vampire-card"
            >
              <div class="vampire-skills-page__item-main">
                <div class="vampire-skills-page__item-header">
                  <span
                    class="vampire-skills-page__check"
                    :class="{ 'vampire-skills-page__check--tested': skill.tested }"
                  >
                    {{ skill.tested ? '✓' : '○' }}
                  </span>
                  <span class="vampire-skills-page__name">{{ skill.name }}</span>
                </div>
                <p v-if="skill.description" class="vampire-skills-page__desc">
                  {{ skill.description }}
                </p>
              </div>
              <span class="vampire-skills-page__status">
                {{ skill.tested ? '已检验' : '未检验' }}
              </span>
            </div>
          </div>
        </template>

        <!-- 编辑态 -->
        <template v-else>
          <!-- 已有技艺列表（可编辑/删除） -->
          <div v-if="skills.length > 0" class="vampire-skills-page__list vampire-skills-page__list--editing">
            <div
              v-for="skill in skills"
              :key="skill.id"
              class="vampire-skills-page__edit-item"
            >
              <div class="vampire-skills-page__edit-fields">
                <input
                  v-model="editDrafts[skill.id].name"
                  type="text"
                  class="vampire-skills-page__input"
                  placeholder="技艺名称"
                  maxlength="30"
                />
                <textarea
                  v-model="editDrafts[skill.id].description"
                  class="vampire-skills-page__textarea"
                  placeholder="描述（可选）"
                  rows="2"
                  maxlength="200"
                />
              </div>
              <div class="vampire-skills-page__edit-actions">
                <button
                  type="button"
                  class="vampire-skills-page__btn vampire-skills-page__btn--save"
                  :disabled="!isDraftValid(skill.id)"
                  @click="saveEdit(skill.id)"
                >
                  保存
                </button>
                <button
                  type="button"
                  class="vampire-skills-page__btn vampire-skills-page__btn--delete"
                  @click="handleDelete(skill)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>

          <div v-else class="vampire-skills-page__empty vampire-skills-page__empty--editing">
            还没有任何技艺
          </div>

          <!-- 添加新技艺 -->
          <div class="vampire-skills-page__add-section">
            <div v-if="!showAddForm" class="vampire-skills-page__add-trigger">
              <button
                type="button"
                class="vampire-skills-page__btn vampire-skills-page__btn--add"
                @click="showAddForm = true"
              >
                + 添加技艺
              </button>
            </div>

            <div v-else class="vampire-skills-page__add-form">
              <div class="vampire-skills-page__edit-fields">
                <input
                  ref="addNameInputRef"
                  v-model="newSkill.name"
                  type="text"
                  class="vampire-skills-page__input"
                  placeholder="技艺名称"
                  maxlength="30"
                  @keydown.enter="focusAddDesc"
                  @keydown.escape="cancelAdd"
                />
                <textarea
                  ref="addDescInputRef"
                  v-model="newSkill.description"
                  class="vampire-skills-page__textarea"
                  placeholder="描述（可选）"
                  rows="2"
                  maxlength="200"
                  @keydown.escape="cancelAdd"
                />
              </div>
              <div class="vampire-skills-page__edit-actions">
                <button
                  type="button"
                  class="vampire-skills-page__btn vampire-skills-page__btn--save"
                  :disabled="!isNewSkillValid"
                  @click="handleAdd"
                >
                  添加
                </button>
                <button
                  type="button"
                  class="vampire-skills-page__btn vampire-skills-page__btn--cancel"
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
              确定删除技艺「{{ deleteTarget.name }}」吗？
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
import { useCharacterStore, type Skill } from '../stores/characterStore'

const characterStore = useCharacterStore()
const skills = computed(() => characterStore.skills)

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

// ─── 已有技艺的编辑草稿 ───

interface Draft {
  name: string
  description: string
}

const editDrafts = reactive<Record<string, Draft>>({})

function initDrafts() {
  for (const key of Object.keys(editDrafts)) {
    delete editDrafts[key]
  }
  for (const skill of skills.value) {
    editDrafts[skill.id] = {
      name: skill.name,
      description: skill.description
    }
  }
}

watch(skills, () => {
  if (!isEditing.value) return
  const currentIds = new Set(skills.value.map(s => s.id))
  for (const key of Object.keys(editDrafts)) {
    if (!currentIds.has(key)) delete editDrafts[key]
  }
  for (const skill of skills.value) {
    if (!editDrafts[skill.id]) {
      editDrafts[skill.id] = {
        name: skill.name,
        description: skill.description
      }
    }
  }
}, { deep: true })

function isDraftValid(skillId: string): boolean {
  const draft = editDrafts[skillId]
  if (!draft) return false
  const trimmed = draft.name.trim()
  if (!trimmed) return false
  const original = skills.value.find(s => s.id === skillId)
  if (!original) return false
  return trimmed !== original.name || draft.description !== original.description
}

function saveEdit(skillId: string) {
  const draft = editDrafts[skillId]
  if (!draft) return
  const name = draft.name.trim()
  if (!name) return
  characterStore.updateSkill(skillId, { name, description: draft.description })
}

// ─── 添加新技艺 ───

const showAddForm = ref(false)
const newSkill = reactive<Draft>({ name: '', description: '' })
const addNameInputRef = ref<HTMLInputElement | null>(null)
const addDescInputRef = ref<HTMLTextAreaElement | null>(null)

const isNewSkillValid = computed(() => newSkill.name.trim().length > 0)

function focusAddDesc() {
  addDescInputRef.value?.focus()
}

function cancelAdd() {
  showAddForm.value = false
  newSkill.name = ''
  newSkill.description = ''
}

function handleAdd() {
  const name = newSkill.name.trim()
  if (!name) return
  const skill: Skill = {
    id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: newSkill.description,
    tested: false
  }
  characterStore.addSkill(skill)
  editDrafts[skill.id] = { name: skill.name, description: skill.description }
  cancelAdd()
}

watch(showAddForm, (val) => {
  if (val) {
    nextTick(() => addNameInputRef.value?.focus())
  }
})

// ─── 删除技艺 ───

const deleteTarget = ref<Skill | null>(null)

function handleDelete(skill: Skill) {
  deleteTarget.value = skill
}

function confirmDelete() {
  if (deleteTarget.value) {
    characterStore.removeSkill(deleteTarget.value.id)
    deleteTarget.value = null
  }
}

function cancelDelete() {
  deleteTarget.value = null
}
</script>

<style scoped>
.vampire-skills-page {
  height: 100%;
}

/* ─── 头部 ─── */

.vampire-skills-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.vampire-skills-page__edit-toggle {
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

.vampire-skills-page__edit-toggle:hover {
  background: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

.vampire-skills-page__edit-toggle--active {
  background: var(--vampire-gold);
  border-color: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

/* ─── 只读列表 ─── */

.vampire-skills-page__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.vampire-skills-page__item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.vampire-skills-page__item-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.vampire-skills-page__item-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vampire-skills-page__check {
  font-size: 1rem;
  color: var(--vampire-text-muted);
  flex-shrink: 0;
  transition: color var(--vampire-transition-fast);
}

.vampire-skills-page__check--tested {
  color: var(--vampire-gold);
}

.vampire-skills-page__name {
  font-size: 0.875rem;
  color: var(--vampire-text-primary);
  font-weight: 500;
}

.vampire-skills-page__desc {
  font-size: 0.8125rem;
  color: var(--vampire-text-secondary);
  line-height: 1.6;
  margin: 0;
  padding-left: 28px;
}

.vampire-skills-page__status {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
  flex-shrink: 0;
  align-self: flex-end;
}

/* ─── 编辑列表 ─── */

.vampire-skills-page__list--editing {
  gap: 12px;
}

.vampire-skills-page__edit-item {
  background: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-md);
  padding: 14px;
}

.vampire-skills-page__edit-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.vampire-skills-page__input {
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

.vampire-skills-page__input:focus {
  outline: none;
  border-color: var(--vampire-gold);
}

.vampire-skills-page__textarea {
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

.vampire-skills-page__textarea:focus {
  outline: none;
  border-color: var(--vampire-gold);
}

.vampire-skills-page__edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ─── 按钮 ─── */

.vampire-skills-page__btn {
  padding: 6px 14px;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
  border: 1px solid;
}

.vampire-skills-page__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vampire-skills-page__btn--save {
  color: var(--vampire-gold);
  border-color: var(--vampire-gold-dim);
  background: transparent;
}

.vampire-skills-page__btn--save:hover:not(:disabled) {
  background: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

.vampire-skills-page__btn--delete {
  color: var(--vampire-text-muted);
  border-color: var(--vampire-border-muted);
  background: transparent;
}

.vampire-skills-page__btn--delete:hover {
  color: var(--vampire-blood);
  border-color: var(--vampire-blood-dim);
  background: rgba(139, 0, 0, 0.08);
}

.vampire-skills-page__btn--cancel {
  color: var(--vampire-text-muted);
  border-color: var(--vampire-border-muted);
  background: transparent;
}

.vampire-skills-page__btn--cancel:hover {
  background: var(--vampire-bg-deep);
}

.vampire-skills-page__btn--add {
  color: var(--vampire-gold);
  border-color: var(--vampire-gold-dim);
  background: transparent;
  width: 100%;
  padding: 10px 14px;
  font-size: 0.8125rem;
}

.vampire-skills-page__btn--add:hover {
  background: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

/* ─── 添加区 ─── */

.vampire-skills-page__add-section {
  margin-top: 16px;
}

.vampire-skills-page__add-form {
  background: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-gold-dim);
  border-radius: var(--vampire-radius-md);
  padding: 14px;
}

/* ─── 空态 ─── */

.vampire-skills-page__empty {
  color: var(--vampire-text-muted);
  font-style: italic;
  font-size: 0.875rem;
  margin-top: 16px;
  text-align: center;
  padding: 32px 16px;
}

.vampire-skills-page__empty p {
  margin: 0;
}

.vampire-skills-page__empty-hint {
  font-size: 0.8125rem;
  margin-top: 8px !important;
  font-style: normal;
  opacity: 0.7;
}

.vampire-skills-page__empty--editing {
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