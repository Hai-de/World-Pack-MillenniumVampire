<template>
  <div class="vampire-characters-page">
    <AppShell>
      <div class="vampire-characters-page__content">
        <h1 class="vampire-heading">角色</h1>

        <!-- 统计条 -->
        <div v-if="characters.length > 0" class="vampire-characters-page__stats">
          <span class="vampire-characters-page__stat">
            {{ mortalCharacters.length }} 位凡俗
          </span>
          <span class="vampire-characters-page__stat-sep">·</span>
          <span class="vampire-characters-page__stat">
            {{ immortalCharacters.length }} 位不朽
          </span>
          <span v-if="deadCount > 0" class="vampire-characters-page__stat-sep">·</span>
          <span v-if="deadCount > 0" class="vampire-characters-page__stat vampire-characters-page__stat--dead">
            {{ deadCount }} 位已故
          </span>
        </div>

        <!-- 空态 -->
        <div v-if="characters.length === 0" class="vampire-characters-page__empty">
          <p class="vampire-characters-page__empty-text">尚未结识任何角色</p>
          <p class="vampire-characters-page__empty-hint">
            在旅途中，你将遇到凡俗与不朽者，他们的故事会在此记录。
          </p>
        </div>

        <!-- 凡俗角色 -->
        <section v-if="mortalCharacters.length > 0" class="vampire-characters-page__section">
          <h2 class="vampire-characters-page__section-title">凡俗</h2>
          <div class="vampire-characters-page__list">
            <div
              v-for="character in mortalCharacters"
              :key="character.id"
              class="vampire-characters-page__card"
              :class="{ 'vampire-characters-page__card--dead': !character.alive }"
            >
              <!-- 卡片头部 -->
              <div class="vampire-characters-page__card-header" @click="toggleExpand(character.id)">
                <div class="vampire-characters-page__card-name-row">
                  <!-- 可编辑名字 -->
                  <template v-if="editingField?.id === character.id && editingField.field === 'name'">
                    <input
                      :ref="nameRefFn"
                      v-model="editingValue"
                      class="vampire-characters-page__inline-input"
                      maxlength="30"
                      placeholder="角色名称"
                      @keydown.enter="confirmEdit()"
                      @keydown.escape="cancelEdit()"
                      @blur="confirmEdit()"
                      @click.stop
                    />
                  </template>
                  <h3 v-else class="vampire-characters-page__card-name" @click.stop="startEdit(character, 'name')">
                    {{ character.name }}
                  </h3>
                  <span v-if="!character.alive" class="vampire-characters-page__death-badge">已故</span>
                </div>
                <span class="vampire-characters-page__card-chevron">
                  {{ expandedId === character.id ? '▾' : '▸' }}
                </span>
              </div>

              <!-- 展开区 -->
              <div v-if="expandedId === character.id" class="vampire-characters-page__card-body">
                <!-- 可编辑描述 -->
                <template v-if="editingField?.id === character.id && editingField.field === 'description'">
                  <textarea
                    :ref="descRefFn"
                    v-model="editingValue"
                    class="vampire-characters-page__desc-input"
                    rows="3"
                    maxlength="300"
                    placeholder="描述这个角色..."
                    @keydown.escape="cancelEdit()"
                    @blur="confirmEdit()"
                  />
                </template>
                <div v-else class="vampire-characters-page__desc-wrapper" @click.stop="startEdit(character, 'description')">
                  <p v-if="character.description" class="vampire-characters-page__card-desc">
                    {{ character.description }}
                  </p>
                  <p v-else class="vampire-characters-page__card-desc-placeholder">
                    点击添加描述...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 不朽角色 -->
        <section v-if="immortalCharacters.length > 0" class="vampire-characters-page__section">
          <h2 class="vampire-characters-page__section-title">不朽</h2>
          <div class="vampire-characters-page__list">
            <div
              v-for="character in immortalCharacters"
              :key="character.id"
              class="vampire-characters-page__card"
              :class="{ 'vampire-characters-page__card--dead': !character.alive }"
            >
              <!-- 卡片头部 -->
              <div class="vampire-characters-page__card-header" @click="toggleExpand(character.id)">
                <div class="vampire-characters-page__card-name-row">
                  <!-- 可编辑名字 -->
                  <template v-if="editingField?.id === character.id && editingField.field === 'name'">
                    <input
                      :ref="nameRefFn"
                      v-model="editingValue"
                      class="vampire-characters-page__inline-input"
                      maxlength="30"
                      placeholder="角色名称"
                      @keydown.enter="confirmEdit()"
                      @keydown.escape="cancelEdit()"
                      @blur="confirmEdit()"
                      @click.stop
                    />
                  </template>
                  <h3 v-else class="vampire-characters-page__card-name" @click.stop="startEdit(character, 'name')">
                    {{ character.name }}
                  </h3>
                  <span v-if="!character.alive" class="vampire-characters-page__death-badge">已故</span>
                </div>
                <span class="vampire-characters-page__card-chevron">
                  {{ expandedId === character.id ? '▾' : '▸' }}
                </span>
              </div>

              <!-- 展开区 -->
              <div v-if="expandedId === character.id" class="vampire-characters-page__card-body">
                <!-- 可编辑描述 -->
                <template v-if="editingField?.id === character.id && editingField.field === 'description'">
                  <textarea
                    :ref="descRefFn"
                    v-model="editingValue"
                    class="vampire-characters-page__desc-input"
                    rows="3"
                    maxlength="300"
                    placeholder="描述这个角色..."
                    @keydown.escape="cancelEdit()"
                    @blur="confirmEdit()"
                  />
                </template>
                <div v-else class="vampire-characters-page__desc-wrapper" @click.stop="startEdit(character, 'description')">
                  <p v-if="character.description" class="vampire-characters-page__card-desc">
                    {{ character.description }}
                  </p>
                  <p v-else class="vampire-characters-page__card-desc-placeholder">
                    点击添加描述...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import { useCharacterStore, type Character } from '../stores/characterStore'

const characterStore = useCharacterStore()

const characters = computed(() => characterStore.characters)
const mortalCharacters = computed(() => characterStore.mortalCharacters)
const immortalCharacters = computed(() => characterStore.immortalCharacters)

const deadCount = computed(() =>
  characters.value.filter(c => !c.alive).length
)

// ─── 展开/折叠 ───
const expandedId = ref<string | null>(null)

function toggleExpand(id: string) {
  // 如果正在编辑此角色，不折叠
  if (editingField.value?.id === id) return
  expandedId.value = expandedId.value === id ? null : id
}

// ─── 内联编辑（name / description） ───
const editingField = ref<{ id: string; field: 'name' | 'description' } | null>(null)
const editingValue = ref('')
// 函数 ref：只有当前编辑中的元素会被赋值
let activeEl: HTMLInputElement | HTMLTextAreaElement | null = null

function nameRefFn(el: HTMLInputElement | null) {
  if (el) activeEl = el
}

function descRefFn(el: HTMLTextAreaElement | null) {
  if (el) activeEl = el
}

function startEdit(character: Character, field: 'name' | 'description') {
  if (field === 'description' && expandedId.value !== character.id) return
  editingField.value = { id: character.id, field }
  editingValue.value = field === 'name' ? character.name : character.description
  activeEl = null
  nextTick(() => {
    if (activeEl) {
      activeEl.focus()
      if ('select' in activeEl) activeEl.select()
    }
  })
}

function confirmEdit() {
  if (!editingField.value) return
  const { id, field } = editingField.value
  const trimmed = editingValue.value.trim()
  if (trimmed) {
    characterStore.updateCharacter(id, { [field]: trimmed })
  }
  editingField.value = null
  editingValue.value = ''
}

function cancelEdit() {
  editingField.value = null
  editingValue.value = ''
}
</script>

<style scoped>
.vampire-characters-page {
  height: 100%;
}

.vampire-characters-page__content {
  padding: var(--vampire-page-padding);
  max-width: var(--vampire-content-max-width-reader);
  margin: 0 auto;
}

/* ─── 统计条 ─── */

.vampire-characters-page__stats {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  font-size: 0.8125rem;
  color: var(--vampire-text-muted);
}

.vampire-characters-page__stat--dead {
  color: var(--vampire-blood-dim);
}

.vampire-characters-page__stat-sep {
  opacity: 0.4;
}

/* ─── 空态 ─── */

.vampire-characters-page__empty {
  text-align: center;
  padding: 48px 24px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
}

.vampire-characters-page__empty-text {
  color: var(--vampire-text-secondary);
  font-size: 1rem;
  margin: 0 0 8px 0;
}

.vampire-characters-page__empty-hint {
  color: var(--vampire-text-muted);
  font-size: 0.875rem;
  margin: 0;
  max-width: 340px;
  margin-inline: auto;
}

/* ─── 分组 ─── */

.vampire-characters-page__section {
  margin-bottom: 28px;
}

.vampire-characters-page__section:last-child {
  margin-bottom: 0;
}

.vampire-characters-page__section-title {
  font-family: var(--vampire-font-heading);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vampire-gold);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--vampire-border-subtle);
}

/* ─── 卡片列表 ─── */

.vampire-characters-page__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vampire-characters-page__card {
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  padding: 14px 18px;
  transition: border-color var(--vampire-transition-fast),
              box-shadow var(--vampire-transition-fast);
}

.vampire-characters-page__card:hover {
  border-color: var(--vampire-gold-dim);
  box-shadow: var(--vampire-shadow-card);
}

.vampire-characters-page__card--dead {
  opacity: 0.6;
  background-color: var(--vampire-bg-deep);
}

.vampire-characters-page__card--dead:hover {
  opacity: 0.75;
}

/* ─── 卡片头部 ─── */

.vampire-characters-page__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}

.vampire-characters-page__card-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.vampire-characters-page__card-name {
  font-family: var(--vampire-font-heading);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--vampire-gold);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: text;
  border-bottom: 1px dashed transparent;
  transition: border-color var(--vampire-transition-fast);
}

.vampire-characters-page__card-name:hover {
  border-bottom-color: var(--vampire-gold-dim);
}

.vampire-characters-page__card--dead .vampire-characters-page__card-name {
  color: var(--vampire-text-secondary);
  text-decoration: line-through;
  text-decoration-color: var(--vampire-text-muted);
}

.vampire-characters-page__death-badge {
  flex-shrink: 0;
  font-size: 0.625rem;
  padding: 2px 6px;
  background: var(--vampire-ink-dim);
  color: var(--vampire-text-muted);
  border-radius: 999px;
}

.vampire-characters-page__card-chevron {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
  flex-shrink: 0;
}

/* ─── 内联编辑输入框 ─── */

.vampire-characters-page__inline-input {
  flex: 1;
  min-width: 0;
  font-family: var(--vampire-font-heading);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--vampire-gold);
  background: var(--vampire-bg-deep);
  border: 1px solid var(--vampire-gold);
  border-radius: var(--vampire-radius-sm);
  padding: 2px 8px;
  outline: none;
}

/* ─── 展开区 ─── */

.vampire-characters-page__card-body {
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid var(--vampire-border-subtle);
}

.vampire-characters-page__desc-wrapper {
  cursor: text;
  padding: 4px 0;
  border-radius: var(--vampire-radius-sm);
  transition: background var(--vampire-transition-fast);
}

.vampire-characters-page__desc-wrapper:hover {
  background: rgba(255, 255, 255, 0.02);
}

.vampire-characters-page__card-desc {
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--vampire-text-secondary);
  margin: 0;
}

.vampire-characters-page__card-desc-placeholder {
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--vampire-text-muted);
  font-style: italic;
  margin: 0;
}

.vampire-characters-page__desc-input {
  width: 100%;
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--vampire-text-secondary);
  background: var(--vampire-bg-deep);
  border: 1px solid var(--vampire-gold);
  border-radius: var(--vampire-radius-sm);
  padding: 8px 10px;
  outline: none;
  resize: vertical;
  font-family: inherit;
}

/* ─── 移动端 ─── */

@media (max-width: 767px) {
  .vampire-characters-page__content {
    padding: var(--vampire-page-padding-mobile);
    padding-bottom: calc(var(--vampire-bottombar-height) + var(--vampire-page-padding-mobile) + env(safe-area-inset-bottom, 0px));
  }
}
</style>
