<template>
  <div class="vampire-memory-browser">
    <!-- 加载态 -->
    <VampireSkeleton v-if="status === 'loading'" variant="memory-grid" />

    <!-- 错误态 -->
    <VampireErrorBanner
      v-else-if="status === 'error'"
      :error="error"
      :retry="retry"
    />

    <!-- 空态 -->
    <div v-else-if="status === 'empty'" class="vampire-memory-browser__empty">
      <p class="vampire-memory-browser__empty-text">尚未积累任何回忆</p>
      <p class="vampire-memory-browser__empty-hint">回应提示以创造新的经历</p>
    </div>

    <!-- 正常态：回忆网格 -->
    <div v-else class="vampire-memory-browser__grid">
      <div
        v-for="memory in memories"
        :key="memory.id"
        class="vampire-memory-browser__card"
        :class="{
          'vampire-memory-browser__card--expanded': expandedMemoryId === memory.id,
          'vampire-memory-browser__card--archived': memory.archivedToDiary
        }"
        @click="toggleMemory(memory.id)"
      >
        <div class="vampire-memory-browser__card-header">
          <h3 class="vampire-memory-browser__card-title">{{ memory.name }}</h3>
          <div class="vampire-memory-browser__card-meta">
            <span class="vampire-memory-browser__card-count">
              {{ memory.experiences.length }} 段经历
            </span>
            <span v-if="memory.archivedToDiary" class="vampire-memory-browser__card-badge">
              已归档
            </span>
          </div>
        </div>

        <!-- 展开显示经历列表 -->
        <div v-if="expandedMemoryId === memory.id" class="vampire-memory-browser__card-details">
          <div
            v-for="experience in memory.experiences"
            :key="experience.id"
            class="vampire-memory-browser__experience"
          >
            <p class="vampire-memory-browser__experience-content">
              {{ experience.content }}
            </p>
            <span class="vampire-memory-browser__experience-date">
              {{ experience.createdAt }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVampireAsync } from '../../composables/useVampireAsync'
import { useShellAuth } from '../../composables/useShellAuth'
import VampireSkeleton from '../shared/VampireSkeleton.vue'
import VampireErrorBanner from '../shared/VampireErrorBanner.vue'

interface Experience {
  id: string
  content: string
  createdAt: string
}

interface Memory {
  id: string
  name: string
  experiences: Experience[]
  archivedToDiary: boolean
}

const { httpClient } = useShellAuth()

const { data: memories, status, error, retry } = useVampireAsync<Memory[]>(
  async () => {
    // 使用角色状态中的回忆数据
    const state = await httpClient.getCharacterState()
    return (state as any).memories || []
  },
  { isEmpty: (d) => d.length === 0 }
)

const expandedMemoryId = ref<string | null>(null)

function toggleMemory(memoryId: string) {
  expandedMemoryId.value = expandedMemoryId.value === memoryId ? null : memoryId
}
</script>

<style scoped>
.vampire-memory-browser__empty {
  text-align: center;
  padding: 48px 24px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
}

.vampire-memory-browser__empty-text {
  color: var(--vampire-text-secondary);
  font-size: 1rem;
  margin-bottom: 8px;
}

.vampire-memory-browser__empty-hint {
  color: var(--vampire-text-muted);
  font-size: 0.875rem;
}

.vampire-memory-browser__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.vampire-memory-browser__card {
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  padding: 20px;
  cursor: pointer;
  transition: all var(--vampire-transition-normal);
}

.vampire-memory-browser__card:hover {
  border-color: var(--vampire-gold-dim);
  box-shadow: var(--vampire-shadow-card);
}

.vampire-memory-browser__card--expanded {
  border-color: var(--vampire-gold);
}

.vampire-memory-browser__card--archived {
  opacity: 0.7;
  background-color: var(--vampire-bg-deep);
}

.vampire-memory-browser__card-header {
  margin-bottom: 12px;
}

.vampire-memory-browser__card-title {
  font-family: var(--vampire-font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: var(--vampire-gold);
  margin-bottom: 8px;
}

.vampire-memory-browser__card-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.vampire-memory-browser__card-count {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
}

.vampire-memory-browser__card-badge {
  font-size: 0.625rem;
  padding: 2px 8px;
  background-color: var(--vampire-ink-dim);
  color: var(--vampire-text-secondary);
  border-radius: 999px;
}

.vampire-memory-browser__card-details {
  border-top: 1px solid var(--vampire-border-subtle);
  padding-top: 12px;
  margin-top: 12px;
}

.vampire-memory-browser__experience {
  padding: 8px 0;
  border-bottom: 1px solid var(--vampire-border-subtle);
}

.vampire-memory-browser__experience:last-child {
  border-bottom: none;
}

.vampire-memory-browser__experience-content {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--vampire-text-secondary);
  margin-bottom: 4px;
}

.vampire-memory-browser__experience-date {
  font-size: 0.6875rem;
  color: var(--vampire-text-muted);
}
</style>
