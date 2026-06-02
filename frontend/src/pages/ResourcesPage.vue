<template>
  <div class="vampire-resources-page">
    <AppShell>
      <div class="vampire-resources-page__content vampire-app-page-content">
        <h1 class="vampire-heading">资源</h1>

        <div v-if="resources.length === 0" class="vampire-resources-page__empty">
          暂无资源
        </div>

        <div v-else class="vampire-resources-page__list">
          <div
            v-for="resource in resources"
            :key="resource.id"
            class="vampire-resources-page__item vampire-card"
            :class="{ 'vampire-resources-page__item--lost': resource.lost }"
          >
            <div class="vampire-resources-page__item-main">
              <span class="vampire-resources-page__name">{{ resource.name }}</span>
              <span v-if="resource.kind === 'diary'" class="vampire-resources-page__badge">日记</span>
            </div>
            <span class="vampire-resources-page__status">
              {{ resource.lost ? '已失去' : '持有中' }}
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import { useCharacterStore } from '../stores/characterStore'

const characterStore = useCharacterStore()
const resources = computed(() => characterStore.resources)
</script>

<style scoped>
.vampire-resources-page {
  height: 100%;
}

.vampire-resources-page__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.vampire-resources-page__item {
  display: flex;
  align-items: center;
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
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.vampire-resources-page__name {
  font-size: 0.875rem;
  color: var(--vampire-text-primary);
}

.vampire-resources-page__badge {
  font-size: 0.625rem;
  padding: 1px 6px;
  background-color: var(--vampire-ink-dim);
  color: var(--vampire-text-secondary);
  border-radius: 999px;
  flex-shrink: 0;
}

.vampire-resources-page__status {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
  flex-shrink: 0;
}

.vampire-resources-page__empty {
  color: var(--vampire-text-muted);
  font-style: italic;
  font-size: 0.875rem;
  margin-top: 16px;
}
</style>
