<template>
  <div class="vampire-chronicle">
    <!-- 加载态 -->
    <VampireSkeleton v-if="status === 'loading'" variant="default" />

    <!-- 错误态 -->
    <VampireErrorBanner
      v-else-if="status === 'error'"
      :error="error"
      :retry="retry"
    />

    <!-- 空态 -->
    <div v-else-if="status === 'empty'" class="vampire-chronicle__empty">
      <p class="vampire-chronicle__empty-text">编年史为空</p>
      <p class="vampire-chronicle__empty-hint">投掷骰子并回应提示以记录你的旅程</p>
    </div>

    <!-- 正常态：时间线 -->
    <div v-else class="vampire-chronicle__timeline">
      <div class="vampire-chronicle__header">
        <h2 class="vampire-chronicle__title">📜 编年史</h2>
        <span class="vampire-chronicle__count">{{ records?.length ?? 0 }} 条记录</span>
      </div>

      <div class="vampire-chronicle__entries">
        <div
          v-for="record in records"
          :key="record.id"
          class="vampire-chronicle__entry"
        >
          <!-- 时间线节点 -->
          <div class="vampire-chronicle__node">
            <div class="vampire-chronicle__node-dot" />
            <div class="vampire-chronicle__node-line" />
          </div>

          <!-- 记录内容 -->
          <div class="vampire-chronicle__content">
            <div class="vampire-chronicle__meta">
              <span class="vampire-chronicle__tick">Tick {{ record.tick }}</span>
              <span class="vampire-chronicle__dice">
                🎲 {{ record.diceResult }}
              </span>
            </div>

            <div class="vampire-chronicle__prompt">
              {{ record.prompt }}
            </div>

            <div class="vampire-chronicle__links">
              <button
                v-if="record.memoryId"
                type="button"
                class="vampire-chronicle__link"
                @click="$emit('view-memory', record.memoryId)"
              >
                → 关联回忆
              </button>
              <button
                v-if="record.diaryEntryId"
                type="button"
                class="vampire-chronicle__link"
                @click="$emit('view-diary', record.diaryEntryId)"
              >
                → 关联日记
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVampireAsync } from '../../composables/useVampireAsync'
import { useShellAuth } from '../../composables/useShellAuth'
import VampireSkeleton from '../shared/VampireSkeleton.vue'
import VampireErrorBanner from '../shared/VampireErrorBanner.vue'

interface ChronicleRecord {
  id: string
  tick: number
  diceResult: string
  prompt: string
  memoryId?: string
  diaryEntryId?: string
}

const { httpClient } = useShellAuth()

const { data: records, status, error, retry } = useVampireAsync<ChronicleRecord[]>(
  async () => {
    const result = await httpClient.getChronicle()
    return (result.records ?? []) as unknown as ChronicleRecord[]
  },
  { isEmpty: (d) => d.length === 0 }
)

defineEmits<{
  'view-memory': [memoryId: string]
  'view-diary': [diaryEntryId: string]
}>()
</script>

<style scoped>
.vampire-chronicle__empty {
  text-align: center;
  padding: 48px 24px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
}

.vampire-chronicle__empty-text {
  color: var(--vampire-text-secondary);
  font-size: 1rem;
  margin-bottom: 8px;
}

.vampire-chronicle__empty-hint {
  color: var(--vampire-text-muted);
  font-size: 0.875rem;
}

.vampire-chronicle__timeline {
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  overflow: hidden;
}

.vampire-chronicle__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--vampire-border-muted);
}

.vampire-chronicle__title {
  font-family: var(--vampire-font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vampire-gold);
}

.vampire-chronicle__count {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
}

.vampire-chronicle__entries {
  padding: 24px;
}

.vampire-chronicle__entry {
  display: flex;
  gap: 16px;
  padding-bottom: 24px;
  position: relative;
}

.vampire-chronicle__entry:last-child {
  padding-bottom: 0;
}

.vampire-chronicle__node {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.vampire-chronicle__node-dot {
  width: 12px;
  height: 12px;
  background-color: var(--vampire-blood);
  border-radius: 50%;
  flex-shrink: 0;
}

.vampire-chronicle__node-line {
  width: 2px;
  flex: 1;
  background-color: var(--vampire-border-muted);
  margin-top: 8px;
}

.vampire-chronicle__entry:last-child .vampire-chronicle__node-line {
  display: none;
}

.vampire-chronicle__content {
  flex: 1;
  min-width: 0;
}

.vampire-chronicle__meta {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 0.75rem;
}

.vampire-chronicle__tick {
  color: var(--vampire-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.vampire-chronicle__dice {
  color: var(--vampire-gold);
}

.vampire-chronicle__prompt {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--vampire-text-secondary);
  margin-bottom: 12px;
}

.vampire-chronicle__links {
  display: flex;
  gap: 8px;
}

.vampire-chronicle__link {
  font-size: 0.75rem;
  padding: 4px 8px;
  background: none;
  border: 1px solid var(--vampire-border-subtle);
  color: var(--vampire-text-muted);
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-chronicle__link:hover {
  background-color: var(--vampire-ink-dim);
  color: var(--vampire-text-secondary);
}
</style>
