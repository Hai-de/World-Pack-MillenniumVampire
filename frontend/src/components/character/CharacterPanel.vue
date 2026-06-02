<template>
  <div class="vampire-character-panel" :class="{ 'vampire-character-panel--compact': compact }">
    <!-- 回忆 (Memories) -->
    <div class="vampire-character-panel__section">
      <button
        type="button"
        class="vampire-character-panel__section-toggle"
        @click="toggleSection('memories')"
      >
        <span class="vampire-character-panel__section-chevron" :class="{ 'vampire-character-panel__section-chevron--open': !isCollapsed('memories') }">▸</span>
        <h4 class="vampire-character-panel__section-title">
          回忆 {{ activeMemories.length }}/5
        </h4>
      </button>
      <div v-if="!isCollapsed('memories')" class="vampire-character-panel__section-body">
        <div class="vampire-character-panel__progress">
          <div
            class="vampire-character-panel__progress-bar"
            :style="{ width: `${Math.min((activeMemories.length / 5) * 100, 100)}%` }"
          />
        </div>
      </div>
    </div>

    <!-- 角色 (Characters) -->
    <div class="vampire-character-panel__section">
      <button
        type="button"
        class="vampire-character-panel__section-toggle"
        @click="toggleSection('characters')"
      >
        <span class="vampire-character-panel__section-chevron" :class="{ 'vampire-character-panel__section-chevron--open': !isCollapsed('characters') }">▸</span>
        <h4 class="vampire-character-panel__section-title">角色 {{ characters.length > 0 ? `(${characters.length})` : '' }}</h4>
      </button>
      <div v-if="!isCollapsed('characters')" class="vampire-character-panel__section-body">
        <div v-if="characters.length === 0" class="vampire-character-panel__empty">暂无角色</div>
        <div v-else class="vampire-character-panel__list">
          <div
            v-for="character in characters"
            :key="character.id"
            class="vampire-character-panel__item"
            :class="{ 'vampire-character-panel__item--dead': !character.alive }"
          >
            <span class="vampire-character-panel__name">
              {{ character.name }}
              <span class="vampire-character-panel__type">
                {{ character.type === 'mortal' ? '凡俗' : '不朽' }}
              </span>
            </span>
            <span v-if="!character.alive" class="vampire-character-panel__death">💀</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCharacterStore } from '../../stores/characterStore'

interface Props {
  compact?: boolean
}

withDefaults(defineProps<Props>(), {
  compact: false
})

const characterStore = useCharacterStore()

const activeMemories = computed(() => characterStore.activeMemories)
const characters = computed(() => characterStore.characters)

// ── 折叠状态 ──
type SectionKey = 'memories' | 'characters'

const collapsedSections = ref<Set<SectionKey>>(new Set())

function isCollapsed(key: SectionKey): boolean {
  return collapsedSections.value.has(key)
}

function toggleSection(key: SectionKey) {
  if (collapsedSections.value.has(key)) {
    collapsedSections.value.delete(key)
  } else {
    collapsedSections.value.add(key)
  }
  collapsedSections.value = new Set(collapsedSections.value)
}
</script>

<style scoped>
.vampire-character-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.875rem;
}

.vampire-character-panel--compact {
  font-size: 0.8125rem;
}

.vampire-character-panel__section {
  border-bottom: 1px solid var(--vampire-border-subtle);
}

.vampire-character-panel__section:last-child {
  border-bottom: none;
}

/* ─── 折叠按钮 ─── */
.vampire-character-panel__section-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 8px 0;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: opacity var(--vampire-transition-fast);
}

.vampire-character-panel__section-toggle:hover {
  opacity: 0.8;
}

.vampire-character-panel__section-chevron {
  display: inline-block;
  font-size: 0.625rem;
  width: 12px;
  color: var(--vampire-text-muted);
  transition: transform var(--vampire-transition-fast);
  flex-shrink: 0;
}

.vampire-character-panel__section-chevron--open {
  transform: rotate(90deg);
}

.vampire-character-panel__section-title {
  font-family: var(--vampire-font-heading);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vampire-gold);
  margin: 0;
}

/* ─── 折叠体 ─── */
.vampire-character-panel__section-body {
  padding-bottom: 10px;
}

.vampire-character-panel__empty {
  color: var(--vampire-text-muted);
  font-style: italic;
  font-size: 0.75rem;
  padding: 4px 0 4px 16px;
}

.vampire-character-panel__list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-left: 16px;
}

.vampire-character-panel__item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--vampire-text-secondary);
  font-size: 0.75rem;
  line-height: 1.5;
}

.vampire-character-panel__item--dead {
  color: var(--vampire-text-muted);
  opacity: 0.6;
}

.vampire-character-panel__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vampire-character-panel__type {
  font-size: 0.625rem;
  color: var(--vampire-text-muted);
  margin-left: 2px;
}

.vampire-character-panel__death {
  font-size: 0.75rem;
  flex-shrink: 0;
}

.vampire-character-panel__progress {
  height: 4px;
  background-color: var(--vampire-bg-deep);
  border-radius: 2px;
  overflow: hidden;
  margin-left: 16px;
  margin-top: 4px;
}

.vampire-character-panel__progress-bar {
  height: 100%;
  background-color: var(--vampire-gold);
  transition: width var(--vampire-transition-normal);
}
</style>
