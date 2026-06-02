<template>
  <div class="vampire-memories-page">
    <AppShell>
      <div class="vampire-memories-page__content">
        <div class="vampire-memories-page__header">
          <h1 class="vampire-heading">回忆</h1>
          <div class="vampire-memories-page__filters">
            <button
              v-for="filter in filters"
              :key="filter.value"
              :class="['vampire-memories-page__filter-btn', { 'vampire-memories-page__filter-btn--active': activeFilter === filter.value }]"
              @click="activeFilter = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>
        <MemoryBrowser :filter="activeFilter" />
      </div>
    </AppShell>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import MemoryBrowser from '../components/memory/MemoryBrowser.vue'

const filters = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '活跃' },
  { value: 'archived', label: '已归档' }
]

const activeFilter = ref('all')
</script>

<style scoped>
.vampire-memories-page {
  height: 100%;
}

.vampire-memories-page__content {
  padding: var(--vampire-page-padding);
  max-width: var(--vampire-content-max-width-reader);
  margin: 0 auto;
}

.vampire-memories-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.vampire-memories-page__filters {
  display: flex;
  gap: 8px;
}

.vampire-memories-page__filter-btn {
  padding: 6px 12px;
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-sm);
  background: var(--vampire-bg-elevated);
  color: var(--vampire-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-memories-page__filter-btn:hover {
  border-color: var(--vampire-gold-dim);
  color: var(--vampire-gold);
}

.vampire-memories-page__filter-btn--active {
  background: var(--vampire-gold);
  border-color: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

@media (max-width: 767px) {
  .vampire-memories-page__content {
    padding: var(--vampire-page-padding-mobile);
    padding-bottom: calc(var(--vampire-bottombar-height) + var(--vampire-page-padding-mobile) + env(safe-area-inset-bottom, 0px));
  }
}
</style>
