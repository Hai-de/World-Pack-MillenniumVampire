<template>
  <div class="vampire-skills-page">
    <AppShell>
      <div class="vampire-skills-page__content vampire-app-page-content">
        <h1 class="vampire-heading">技艺</h1>

        <div v-if="skills.length === 0" class="vampire-skills-page__empty">
          暂无技艺
        </div>

        <div v-else class="vampire-skills-page__list">
          <div
            v-for="skill in skills"
            :key="skill.id"
            class="vampire-skills-page__item vampire-card"
          >
            <div class="vampire-skills-page__item-header">
              <span
                class="vampire-skills-page__check"
                :class="{ 'vampire-skills-page__check--tested': skill.tested }"
              >
                {{ skill.tested ? '✓' : '○' }}
              </span>
              <span class="vampire-skills-page__name">{{ skill.name }}</span>
            </div>
            <span class="vampire-skills-page__status">
              {{ skill.tested ? '已检验' : '未检验' }}
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
const skills = computed(() => characterStore.skills)
</script>

<style scoped>
.vampire-skills-page {
  height: 100%;
}

.vampire-skills-page__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.vampire-skills-page__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vampire-skills-page__item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
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
}

.vampire-skills-page__status {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
  flex-shrink: 0;
}

.vampire-skills-page__empty {
  color: var(--vampire-text-muted);
  font-style: italic;
  font-size: 0.875rem;
  margin-top: 16px;
}
</style>
