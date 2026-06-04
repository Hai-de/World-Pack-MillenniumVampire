<template>
  <div class="vampire-diary-reader">
    <!-- 日记已丢失 -->
    <div v-if="diaryState.lost" class="vampire-diary-reader__lost">
      <div class="vampire-diary-reader__lost-icon">✦</div>
      <h2 class="vampire-diary-reader__lost-title">日记已失落</h2>
      <p class="vampire-diary-reader__lost-text">
        你的日记已经遗失在漫长的岁月中，其中记载的回忆也随之消散，除非你后续可以拿回来。
      </p>
    </div>

    <!-- 日记尚未创建 -->
    <div v-else-if="!hasDiary" class="vampire-diary-reader__uncreated">
      <div class="vampire-diary-reader__uncreated-header">
        <div class="vampire-diary-reader__uncreated-icon">📓</div>
        <h2 class="vampire-diary-reader__uncreated-title">吸血鬼日记</h2>
      </div>
      <div class="vampire-diary-reader__uncreated-body">
        <p class="vampire-diary-reader__uncreated-desc">
          日记是一种特殊的遗物资源。将回忆归档于日记中可以安全保存——
          但日记本身也存在丢失的风险。一旦失落，其中封存的一切将随之消散。
        </p>
        <ul class="vampire-diary-reader__uncreated-rules">
          <li>最多可容纳 <strong>{{ diaryState.maxCapacity }} 段回忆</strong></li>
          <li>日记本身存在丢失风险</li>
        </ul>
        <button
          type="button"
          class="vampire-diary-reader__uncreated-btn"
          @click="handleCreate"
        >
          创建日记
        </button>
      </div>
    </div>

    <!-- 日记正常 -->
    <div v-else class="vampire-diary-reader__book">
      <!-- 封面 / 状态栏 -->
      <div class="vampire-diary-reader__cover">
        <h2 class="vampire-diary-reader__cover-title">吸血鬼日记</h2>
        <div class="vampire-diary-reader__cover-info">
          <span>{{ holderDisplay }}</span>
          <span>·</span>
          <span>{{ archivedMemories.length }} / {{ diaryState.maxCapacity }} 段回忆</span>
        </div>
        <!-- 容量条 -->
        <div class="vampire-diary-reader__capacity-bar">
          <div
            class="vampire-diary-reader__capacity-fill"
            :style="{ width: capacityPercent + '%' }"
            :class="{
              'vampire-diary-reader__capacity-fill--warn': capacityPercent >= 75,
              'vampire-diary-reader__capacity-fill--full': capacityPercent >= 100
            }"
          />
        </div>
      </div>

      <!-- 容量警告 -->
      <div v-if="isFull" class="vampire-diary-reader__notice vampire-diary-reader__notice--warn">
        日记已满，无法容纳更多回忆。
      </div>
      <div v-else-if="capacityPercent >= 75" class="vampire-diary-reader__notice">
        日记接近满载，还可容纳 {{ diaryState.maxCapacity - archivedMemories.length }} 段回忆。
      </div>

      <!-- 日记说明 -->
      <div class="vampire-diary-reader__description">
        <p>
          日记是珍贵的遗物，将回忆归档于其中可以永久保存。
          但日记本身存在丢失的风险——一旦失落，其中的一切将随之消失。
        </p>
      </div>

      <!-- 归档回忆列表 -->
      <div v-if="archivedMemories.length > 0" class="vampire-diary-reader__entries">
        <div
          v-for="(memory, index) in archivedMemories"
          :key="memory.id"
          class="vampire-diary-reader__entry"
          :class="{ 'vampire-diary-reader__entry--expanded': expandedId === memory.id }"
          @click="toggleEntry(memory.id)"
        >
          <div class="vampire-diary-reader__entry-header">
            <span class="vampire-diary-reader__entry-number">{{ index + 1 }}</span>
            <span class="vampire-diary-reader__entry-name">{{ memory.name }}</span>
            <span class="vampire-diary-reader__entry-meta">
              {{ memory.experiences.length }} 段经历
            </span>
            <span class="vampire-diary-reader__entry-chevron">
              {{ expandedId === memory.id ? '▾' : '▸' }}
            </span>
          </div>

          <div v-if="expandedId === memory.id" class="vampire-diary-reader__entry-details">
            <div
              v-for="experience in memory.experiences"
              :key="experience.id"
              class="vampire-diary-reader__experience"
            >
              <p class="vampire-diary-reader__experience-content">
                {{ experience.content }}
              </p>
              <span class="vampire-diary-reader__experience-date">
                {{ experience.createdAt }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空态 -->
      <div v-else class="vampire-diary-reader__empty">
        <p class="vampire-diary-reader__empty-text">日记中尚未收录任何回忆</p>
        <p class="vampire-diary-reader__empty-hint">
          前往回忆页面，将回忆归档到日记中保存
        </p>
        <router-link
          :to="{ name: 'memories' }"
          class="vampire-diary-reader__empty-link"
        >
          查看回忆
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCharacterStore } from '../../stores/characterStore'
import { useShellAuth } from '../../composables/useShellAuth'

const characterStore = useCharacterStore()
const { httpClient } = useShellAuth()

const diaryState = computed(() => characterStore.diaryState)
const archivedMemories = computed(() => characterStore.archivedMemories)
const hasDiary = computed(() => characterStore.hasDiary)

// 将 holder 内部 ID 映射为显示名称
const HOLDER_NAMES: Record<string, string> = {
  actor_vampire: '吸血鬼',
  actor_dhampir: '半吸血鬼',
}

const holderDisplay = computed(() => {
  const id = diaryState.value.holder
  return HOLDER_NAMES[id] ?? id
})

const capacityPercent = computed(() => {
  const max = diaryState.value.maxCapacity
  if (max <= 0) return 100
  return Math.min(100, (archivedMemories.value.length / max) * 100)
})

const isFull = computed(() => characterStore.isDiaryFull)

const expandedId = ref<string | null>(null)

function toggleEntry(memoryId: string) {
  expandedId.value = expandedId.value === memoryId ? null : memoryId
}

async function handleCreate() {
  characterStore.createDiary()
  try {
    await httpClient.updateStateFields({ fields: { diary_id: 'artifact_diary' } })
  } catch (e) {
    console.warn('Failed to sync diary creation to backend:', e)
  }
}
</script>

<style scoped>
.vampire-diary-reader {
  max-width: 600px;
  margin: 0 auto;
}

/* ─── 丢失态 ─── */

.vampire-diary-reader__lost {
  text-align: center;
  padding: 56px 24px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
}

.vampire-diary-reader__lost-icon {
  font-size: 2rem;
  color: var(--vampire-text-muted);
  margin-bottom: 16px;
  opacity: 0.5;
}

.vampire-diary-reader__lost-title {
  font-family: var(--vampire-font-heading);
  font-size: 1.25rem;
  color: var(--vampire-text-secondary);
  margin: 0 0 12px 0;
}

.vampire-diary-reader__lost-text {
  color: var(--vampire-text-muted);
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0;
  max-width: 360px;
  margin-inline: auto;
}

/* ─── 未创建态 ─── */

.vampire-diary-reader__uncreated {
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  overflow: hidden;
}

.vampire-diary-reader__uncreated-header {
  padding: 32px 24px 20px;
  text-align: center;
  background: linear-gradient(135deg, var(--vampire-bg-deep), var(--vampire-ink-dim));
  border-bottom: 1px solid var(--vampire-border-muted);
}

.vampire-diary-reader__uncreated-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
  filter: grayscale(0.3);
}

.vampire-diary-reader__uncreated-title {
  font-family: var(--vampire-font-heading);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--vampire-gold);
  letter-spacing: 0.1em;
  margin: 0;
}

.vampire-diary-reader__uncreated-body {
  padding: 24px;
}

.vampire-diary-reader__uncreated-desc {
  color: var(--vampire-text-secondary);
  font-size: 0.875rem;
  line-height: 1.7;
  margin: 0 0 16px 0;
}

.vampire-diary-reader__uncreated-rules {
  margin: 0 0 24px 0;
  padding: 0 0 0 20px;
  list-style: none;
}

.vampire-diary-reader__uncreated-rules li {
  position: relative;
  font-size: 0.8125rem;
  color: var(--vampire-text-muted);
  line-height: 1.6;
  padding-left: 4px;
  margin-bottom: 8px;
}

.vampire-diary-reader__uncreated-rules li::before {
  content: '·';
  position: absolute;
  left: -16px;
  color: var(--vampire-gold-dim);
  font-weight: 600;
}

.vampire-diary-reader__uncreated-rules li strong {
  color: var(--vampire-text-secondary);
  font-weight: 600;
}

.vampire-diary-reader__uncreated-btn {
  display: block;
  width: 100%;
  padding: 12px 24px;
  font-family: var(--vampire-font-heading);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--vampire-bg-deep);
  background: var(--vampire-gold);
  border: none;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: background var(--vampire-transition-fast),
              box-shadow var(--vampire-transition-fast);
}

.vampire-diary-reader__uncreated-btn:hover {
  background: var(--vampire-gold-bright);
  box-shadow: 0 2px 12px rgba(255, 215, 0, 0.2);
}

/* ─── 书籍 ─── */

.vampire-diary-reader__book {
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  overflow: hidden;
  box-shadow: var(--vampire-shadow-elevated);
}

/* ─── 封面 ─── */

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
  margin: 0 0 8px 0;
}

.vampire-diary-reader__cover-info {
  display: flex;
  justify-content: center;
  gap: 8px;
  font-size: 0.8125rem;
  color: var(--vampire-text-muted);
  margin-bottom: 14px;
}

.vampire-diary-reader__capacity-bar {
  height: 4px;
  background: var(--vampire-bg-elevated);
  border-radius: 2px;
  overflow: hidden;
  max-width: 200px;
  margin-inline: auto;
}

.vampire-diary-reader__capacity-fill {
  height: 100%;
  background: var(--vampire-gold);
  border-radius: 2px;
  transition: width var(--vampire-transition-normal);
}

.vampire-diary-reader__capacity-fill--warn {
  background: var(--vampire-gold-dim);
}

.vampire-diary-reader__capacity-fill--full {
  background: var(--vampire-blood);
}

/* ─── 通知条 ─── */

.vampire-diary-reader__notice {
  padding: 10px 20px;
  font-size: 0.8125rem;
  color: var(--vampire-text-secondary);
  background: var(--vampire-bg-deep);
  border-bottom: 1px solid var(--vampire-border-subtle);
  text-align: center;
}

.vampire-diary-reader__notice--warn {
  color: var(--vampire-gold);
  background: rgba(255, 215, 0, 0.05);
}

/* ─── 说明区 ─── */

.vampire-diary-reader__description {
  padding: 16px 20px;
  border-bottom: 1px solid var(--vampire-border-subtle);
}

.vampire-diary-reader__description p {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--vampire-text-muted);
  font-style: italic;
}

/* ─── 归档回忆列表 ─── */

.vampire-diary-reader__entries {
  padding: 8px 0;
}

.vampire-diary-reader__entry {
  padding: 12px 20px;
  cursor: pointer;
  transition: background var(--vampire-transition-fast);
  border-bottom: 1px solid var(--vampire-border-subtle);
}

.vampire-diary-reader__entry:last-child {
  border-bottom: none;
}

.vampire-diary-reader__entry:hover {
  background: rgba(255, 255, 255, 0.02);
}

.vampire-diary-reader__entry-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vampire-diary-reader__entry-number {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--vampire-text-muted);
  background: var(--vampire-bg-deep);
  border-radius: 999px;
}

.vampire-diary-reader__entry-name {
  flex: 1;
  min-width: 0;
  font-family: var(--vampire-font-heading);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--vampire-gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vampire-diary-reader__entry-meta {
  font-size: 0.6875rem;
  color: var(--vampire-text-muted);
  flex-shrink: 0;
}

.vampire-diary-reader__entry-chevron {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
  flex-shrink: 0;
}

.vampire-diary-reader__entry-details {
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid var(--vampire-border-subtle);
}

.vampire-diary-reader__experience {
  padding: 8px 0;
  border-bottom: 1px solid var(--vampire-border-subtle);
}

.vampire-diary-reader__experience:last-child {
  border-bottom: none;
}

.vampire-diary-reader__experience-content {
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--vampire-text-secondary);
  margin: 0 0 4px 0;
}

.vampire-diary-reader__experience-date {
  font-size: 0.6875rem;
  color: var(--vampire-text-muted);
}

/* ─── 空态（已创建但无回忆） ─── */

.vampire-diary-reader__empty {
  text-align: center;
  padding: 40px 24px;
}

.vampire-diary-reader__empty-text {
  color: var(--vampire-text-secondary);
  font-size: 0.9375rem;
  margin: 0 0 8px 0;
}

.vampire-diary-reader__empty-hint {
  color: var(--vampire-text-muted);
  font-size: 0.8125rem;
  margin: 0 0 16px 0;
}

.vampire-diary-reader__empty-link {
  display: inline-block;
  padding: 8px 16px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--vampire-gold);
  text-decoration: none;
  border: 1px solid var(--vampire-gold-dim);
  border-radius: var(--vampire-radius-sm);
  transition: all var(--vampire-transition-fast);
}

.vampire-diary-reader__empty-link:hover {
  background: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}
</style>
