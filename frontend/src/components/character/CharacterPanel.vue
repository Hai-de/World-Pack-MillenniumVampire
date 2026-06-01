<template>
  <div class="vampire-character-panel" :class="{ 'vampire-character-panel--compact': compact }">
    <!-- 技艺 (Skills) -->
    <div class="vampire-character-panel__section">
      <h4 class="vampire-character-panel__section-title">技艺</h4>
      <div v-if="skills.length === 0" class="vampire-character-panel__empty">
        暂无技艺
      </div>
      <div v-else class="vampire-character-panel__list">
        <div
          v-for="skill in skills"
          :key="skill.id"
          class="vampire-character-panel__item"
        >
          <span class="vampire-character-panel__check">
            {{ skill.tested ? '✓' : '○' }}
          </span>
          <span class="vampire-character-panel__name">{{ skill.name }}</span>
        </div>
      </div>
    </div>

    <!-- 资源 (Resources) -->
    <div class="vampire-character-panel__section">
      <h4 class="vampire-character-panel__section-title">资源</h4>
      <div v-if="resources.length === 0" class="vampire-character-panel__empty">
        暂无资源
      </div>
      <div v-else class="vampire-character-panel__list">
        <div
          v-for="resource in resources"
          :key="resource.id"
          class="vampire-character-panel__item"
          :class="{ 'vampire-character-panel__item--lost': resource.lost }"
        >
          <span class="vampire-character-panel__name">{{ resource.name }}</span>
          <span v-if="resource.kind === 'diary'" class="vampire-character-panel__badge">日记</span>
        </div>
      </div>
    </div>

    <!-- 印记 (Marks) -->
    <div class="vampire-character-panel__section">
      <h4 class="vampire-character-panel__section-title">印记</h4>
      <div v-if="marks.length === 0" class="vampire-character-panel__empty">
        暂无印记
      </div>
      <div v-else class="vampire-character-panel__list">
        <div
          v-for="mark in marks"
          :key="mark.id"
          class="vampire-character-panel__item"
        >
          <span class="vampire-character-panel__name">{{ mark.name }}</span>
        </div>
      </div>
    </div>

    <!-- 回忆 (Memories) -->
    <div class="vampire-character-panel__section">
      <h4 class="vampire-character-panel__section-title">
        回忆 {{ activeMemories.length }}/5
      </h4>
      <div class="vampire-character-panel__progress">
        <div
          class="vampire-character-panel__progress-bar"
          :style="{ width: `${(activeMemories.length / 5) * 100}%` }"
        />
      </div>
    </div>

    <!-- 角色 (Characters) -->
    <div class="vampire-character-panel__section">
      <h4 class="vampire-character-panel__section-title">角色</h4>
      <div v-if="characters.length === 0" class="vampire-character-panel__empty">
        暂无角色
      </div>
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCharacterStore } from '../../stores/characterStore'

interface Props {
  compact?: boolean
}

withDefaults(defineProps<Props>(), {
  compact: false
})

const characterStore = useCharacterStore()

const skills = computed(() => characterStore.skills)
const resources = computed(() => characterStore.availableResources)
const marks = computed(() => characterStore.marks)
const activeMemories = computed(() => characterStore.activeMemories)
const characters = computed(() => characterStore.characters)
</script>

<style scoped>
.vampire-character-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-size: 0.875rem;
}

.vampire-character-panel--compact {
  gap: 12px;
  font-size: 0.8125rem;
}

.vampire-character-panel__section {
  border-bottom: 1px solid var(--vampire-border-subtle);
  padding-bottom: 12px;
}

.vampire-character-panel__section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.vampire-character-panel__section-title {
  font-family: var(--vampire-font-heading);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vampire-gold);
  margin-bottom: 8px;
}

.vampire-character-panel__empty {
  color: var(--vampire-text-muted);
  font-style: italic;
  font-size: 0.8125rem;
}

.vampire-character-panel__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vampire-character-panel__item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--vampire-text-secondary);
}

.vampire-character-panel__item--lost {
  text-decoration: line-through;
  color: var(--vampire-text-muted);
}

.vampire-character-panel__item--dead {
  color: var(--vampire-text-muted);
  opacity: 0.6;
}

.vampire-character-panel__check {
  color: var(--vampire-gold);
  font-size: 0.875rem;
}

.vampire-character-panel__name {
  flex: 1;
}

.vampire-character-panel__type {
  font-size: 0.6875rem;
  color: var(--vampire-text-muted);
  margin-left: 4px;
}

.vampire-character-panel__badge {
  font-size: 0.625rem;
  padding: 1px 6px;
  background-color: var(--vampire-ink-dim);
  color: var(--vampire-text-secondary);
  border-radius: 999px;
}

.vampire-character-panel__death {
  font-size: 0.875rem;
}

.vampire-character-panel__progress {
  height: 4px;
  background-color: var(--vampire-bg-deep);
  border-radius: 2px;
  overflow: hidden;
}

.vampire-character-panel__progress-bar {
  height: 100%;
  background-color: var(--vampire-gold);
  transition: width var(--vampire-transition-normal);
}
</style>
