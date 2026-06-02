<template>
  <div class="vampire-marks-page">
    <AppShell>
      <div class="vampire-marks-page__content vampire-app-page-content">
        <h1 class="vampire-heading">印记</h1>

        <div v-if="marks.length === 0" class="vampire-marks-page__empty">
          暂无印记
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
      </div>
    </AppShell>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import { useCharacterStore } from '../stores/characterStore'

const characterStore = useCharacterStore()
const marks = computed(() => characterStore.marks)
</script>

<style scoped>
.vampire-marks-page {
  height: 100%;
}

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

.vampire-marks-page__empty {
  color: var(--vampire-text-muted);
  font-style: italic;
  font-size: 0.875rem;
  margin-top: 16px;
}
</style>
