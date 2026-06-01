<template>
  <div class="vampire-diary-reader">
    <!-- 加载态 -->
    <VampireSkeleton v-if="status === 'loading'" variant="diary" />

    <!-- 错误态 -->
    <VampireErrorBanner
      v-else-if="status === 'error'"
      :error="error"
      :retry="retry"
    />

    <!-- 空态 -->
    <div v-else-if="status === 'empty'" class="vampire-diary-reader__empty">
      <p class="vampire-diary-reader__empty-text">日记空空如也，开始写第一则吧</p>
      <button
        type="button"
        class="vampire-diary-reader__write-btn"
        @click="$emit('write-first')"
      >
        写第一则日记
      </button>
    </div>

    <!-- 正常态：日记阅读器 -->
    <div v-else class="vampire-diary-reader__book">
      <!-- 书籍封面 -->
      <div class="vampire-diary-reader__cover">
        <h2 class="vampire-diary-reader__cover-title">吸血鬼日记</h2>
        <div class="vampire-diary-reader__cover-info">
          <span>{{ entries?.length ?? 0 }} 则日记</span>
          <span>·</span>
          <span>最后更新：{{ lastUpdated }}</span>
        </div>
      </div>

      <!-- 翻页区域 -->
      <div class="vampire-diary-reader__pages">
        <!-- 上一页按钮 -->
        <button
          v-if="currentPage > 0"
          type="button"
          class="vampire-diary-reader__page-btn vampire-diary-reader__page-btn--prev"
          @click="prevPage"
        >
          ←
        </button>

        <!-- 当前页内容 -->
        <div class="vampire-diary-reader__page" :class="pageClass">
          <div class="vampire-diary-reader__page-header">
            <span class="vampire-diary-reader__page-date">
              {{ currentPageEntry?.createdAt || '未知日期' }}
            </span>
            <span class="vampire-diary-reader__page-number">
              {{ currentPage + 1 }} / {{ entries?.length ?? 0 }}
            </span>
          </div>

          <div class="vampire-diary-reader__page-content vampire-handwritten">
            {{ currentPageEntry?.content || '此页为空' }}
          </div>

          <!-- 记忆衰退效果（旧条目） -->
          <div
            v-if="isOldEntry"
            class="vampire-diary-reader__faded-overlay"
          />
        </div>

        <!-- 下一页按钮 -->
        <button
          v-if="entries && currentPage < entries.length - 1"
          type="button"
          class="vampire-diary-reader__page-btn vampire-diary-reader__page-btn--next"
          @click="nextPage"
        >
          →
        </button>
      </div>

      <!-- 底部操作栏 -->
      <div class="vampire-diary-reader__footer">
        <button
          type="button"
          class="vampire-diary-reader__write-btn"
          @click="$emit('write-new')"
        >
          写新日记
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVampireAsync } from '../../composables/useVampireAsync'
import { useShellAuth } from '../../composables/useShellAuth'
import { useGameStore } from '../../stores/gameStore'
import VampireSkeleton from '../shared/VampireSkeleton.vue'
import VampireErrorBanner from '../shared/VampireErrorBanner.vue'

const { httpClient } = useShellAuth()
const gameStore = useGameStore()

const { data: entries, status, error, retry } = useVampireAsync(
  async () => {
    const result = await httpClient.getDiaryEntries()
    return result.entries
  },
  { isEmpty: (d) => d.length === 0 }
)

const currentPage = ref(0)

const currentPageEntry = computed(() => {
  if (!entries.value || entries.value.length === 0) return null
  return entries.value[currentPage.value]
})

const lastUpdated = computed(() => {
  if (!entries.value || entries.value.length === 0) return '无'
  return entries.value[entries.value.length - 1].createdAt
})

const isOldEntry = computed(() => {
  if (!currentPageEntry.value) return false
  const entryDate = new Date(currentPageEntry.value.createdAt)
  const now = new Date()
  const diffYears = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
  return diffYears > 50 // 超过50年的日记显示衰退效果
})

const pageClass = computed(() => ({
  'vampire-diary-reader__page--faded': isOldEntry.value
}))

function prevPage() {
  if (currentPage.value > 0) {
    currentPage.value--
  }
}

function nextPage() {
  if (entries.value != null && currentPage.value < entries.value.length - 1) {
    currentPage.value++
  }
}

defineEmits<{
  'write-first': []
  'write-new': []
}>()
</script>

<style scoped>
.vampire-diary-reader {
  max-width: 600px;
  margin: 0 auto;
}

.vampire-diary-reader__empty {
  text-align: center;
  padding: 48px 24px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
}

.vampire-diary-reader__empty-text {
  color: var(--vampire-text-secondary);
  font-size: 1rem;
  margin-bottom: 20px;
}

.vampire-diary-reader__book {
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  overflow: hidden;
  box-shadow: var(--vampire-shadow-elevated);
}

.vampire-diary-reader__cover {
  padding: 24px;
  background: linear-gradient(135deg, var(--vampire-bg-deep), var(--vampire-ink-dim));
  text-align: center;
  border-bottom: 1px solid var(--vampire-border-muted);
}

.vampire-diary-reader__cover-title {
  font-family: var(--vampire-font-heading);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--vampire-gold);
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}

.vampire-diary-reader__cover-info {
  display: flex;
  justify-content: center;
  gap: 8px;
  font-size: 0.8125rem;
  color: var(--vampire-text-muted);
}

.vampire-diary-reader__pages {
  position: relative;
  min-height: 300px;
  padding: 24px;
}

.vampire-diary-reader__page-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--vampire-bg-deep);
  border: 1px solid var(--vampire-border-muted);
  border-radius: 50%;
  color: var(--vampire-text-secondary);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
  font-size: 1rem;
}

.vampire-diary-reader__page-btn:hover {
  background-color: var(--vampire-blood-dim);
  color: var(--vampire-text-primary);
}

.vampire-diary-reader__page-btn--prev {
  left: 8px;
}

.vampire-diary-reader__page-btn--next {
  right: 8px;
}

.vampire-diary-reader__page {
  position: relative;
  background-color: var(--vampire-parchment-dim);
  border-radius: var(--vampire-radius-md);
  padding: 24px;
  min-height: 250px;
  overflow: hidden;
}

.vampire-diary-reader__page--faded {
  opacity: 0.7;
}

.vampire-diary-reader__page-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
}

.vampire-diary-reader__page-content {
  font-size: 1.125rem;
  line-height: 1.8;
  color: var(--vampire-text-primary);
}

.vampire-diary-reader__faded-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(245, 230, 200, 0.1) 0%,
    rgba(245, 230, 200, 0.05) 50%,
    rgba(245, 230, 200, 0.1) 100%
  );
  pointer-events: none;
}

.vampire-diary-reader__footer {
  padding: 16px 24px;
  border-top: 1px solid var(--vampire-border-muted);
  text-align: center;
}

.vampire-diary-reader__write-btn {
  padding: 10px 24px;
  font-family: var(--vampire-font-body);
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--vampire-parchment);
  background-color: var(--vampire-blood);
  border: none;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-diary-reader__write-btn:hover {
  background-color: #a00000;
}
</style>
