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
          :class="{ 'vampire-chronicle__entry--expanded': expandedId === record.id }"
          @click="toggleEntry(record.id)"
        >
          <!-- 时间线节点 -->
          <div class="vampire-chronicle__node">
            <div class="vampire-chronicle__node-dot" />
            <div class="vampire-chronicle__node-line" />
          </div>

          <!-- 记录内容 -->
          <div class="vampire-chronicle__content">
            <!-- 元信息 -->
            <div class="vampire-chronicle__meta">
              <span class="vampire-chronicle__dice">
                🎲 {{ record.diceResult }}
              </span>
              <span v-if="record.consumedAt" class="vampire-chronicle__time">
                {{ formatTime(record.consumedAt) }}
              </span>
            </div>

            <!-- 提示 -->
            <div class="vampire-chronicle__prompt">
              <span class="vampire-chronicle__prompt-label">提示</span>
              <span class="vampire-chronicle__prompt-text">{{ record.prompt }}</span>
            </div>

            <!-- 回应（可折叠） -->
            <div
              v-if="record.response"
              class="vampire-chronicle__response"
            >
              <span class="vampire-chronicle__response-label">回应</span>
              <div
                class="vampire-chronicle__response-text"
                :class="{ 'vampire-chronicle__response-text--truncated': expandedId !== record.id }"
                v-html="expandedId === record.id ? record.response : truncateHtml(record.response, 150)"
              />
            </div>

            <!-- 无回应提示 -->
            <div v-else class="vampire-chronicle__no-response">
              <span class="vampire-chronicle__no-response-text">尚未回应此提示</span>
            </div>

            <!-- 关联链接 -->
            <div class="vampire-chronicle__links">
              <button
                v-if="record.memoryId"
                type="button"
                class="vampire-chronicle__link"
                @click.stop="$emit('view-memory', record.memoryId!)"
              >
                🧠 关联回忆
              </button>
              <button
                v-if="record.diaryEntryId"
                type="button"
                class="vampire-chronicle__link"
                @click.stop="$emit('view-diary', record.diaryEntryId!)"
              >
                📖 关联日记
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useVampireAsync } from '../../composables/useVampireAsync'
import { useShellAuth } from '../../composables/useShellAuth'
import { useGameStore } from '../../stores/gameStore'
import VampireSkeleton from '../shared/VampireSkeleton.vue'
import VampireErrorBanner from '../shared/VampireErrorBanner.vue'

interface ChronicleRecord {
  id: string
  diceResult: string
  prompt: string
  response?: string | null
  experienceId?: string | null
  memoryId?: string
  diaryEntryId?: string
  consumedAt?: string
}

const { httpClient } = useShellAuth()
const gameStore = useGameStore()

const { data: records, status, error, retry } = useVampireAsync<ChronicleRecord[]>(
  async () => {
    const result = await httpClient.getChronicle()
    return (result.records ?? []) as unknown as ChronicleRecord[]
  },
  { isEmpty: (d) => d.length === 0 }
)

const route = useRoute()
const expandedId = ref<string | null>(null)

// 游戏重置时立即清空本地编年史数据，不依赖服务端异步清除
watch(() => gameStore.gamePhase, (phase) => {
  if (phase === 'uninitialized') {
    records.value = []
    status.value = 'empty'
    error.value = null
  }
})

// 每次导航到编年史页面时重新拉取，确保获取服务端最新数据
watch(() => route.path, (path) => {
  if (path === '/chronicle') {
    retry()
  }
})

function toggleEntry(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso)
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

function truncateHtml(html: string, maxLen: number): string {
  const div = document.createElement('div')
  div.innerHTML = html
  const text = div.textContent || div.innerText || ''
  if (text.length <= maxLen) return html
  return `<p>${text.slice(0, maxLen)}…</p>`
}

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
  cursor: pointer;
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
  transition: all var(--vampire-transition-fast);
}

.vampire-chronicle__entry--expanded .vampire-chronicle__node-dot {
  background-color: var(--vampire-gold);
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.4);
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
  margin-bottom: 12px;
  font-size: 0.75rem;
}

.vampire-chronicle__dice {
  color: var(--vampire-gold);
}

.vampire-chronicle__time {
  color: var(--vampire-text-muted);
  margin-left: auto;
}

/* ─── 提示样式 ─── */
.vampire-chronicle__prompt {
  margin-bottom: 12px;
}

.vampire-chronicle__prompt-label {
  display: block;
  font-size: 0.6875rem;
  color: var(--vampire-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
}

.vampire-chronicle__prompt-text {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--vampire-parchment);
  font-family: var(--vampire-font-handwritten);
}

/* ─── 回应样式 ─── */
.vampire-chronicle__response {
  padding: 12px;
  background-color: var(--vampire-bg-deep);
  border-left: 3px solid var(--vampire-blood-dim);
  border-radius: 0 var(--vampire-radius-sm) var(--vampire-radius-sm) 0;
  margin-bottom: 12px;
}

.vampire-chronicle__response-label {
  display: block;
  font-size: 0.6875rem;
  color: var(--vampire-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 6px;
}

.vampire-chronicle__response-text {
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--vampire-text-secondary);
}

.vampire-chronicle__response-text--truncated {
  max-height: 100px;
  overflow: hidden;
  position: relative;
}

.vampire-chronicle__response-text--truncated::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(transparent, var(--vampire-bg-deep));
}

.vampire-chronicle__no-response {
  padding: 8px 12px;
  background-color: var(--vampire-bg-deep);
  border-left: 3px solid var(--vampire-border-subtle);
  border-radius: 0 var(--vampire-radius-sm) var(--vampire-radius-sm) 0;
  margin-bottom: 12px;
}

.vampire-chronicle__no-response-text {
  font-size: 0.8125rem;
  color: var(--vampire-text-muted);
  font-style: italic;
}

/* ─── 关联链接 ─── */
.vampire-chronicle__links {
  display: flex;
  gap: 8px;
}

.vampire-chronicle__link {
  font-size: 0.75rem;
  padding: 4px 10px;
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
