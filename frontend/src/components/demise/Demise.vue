<template>
  <div class="vampire-demise">
    <div class="vampire-demise__header">
      <h1 class="vampire-demise__title">🩸 吸血鬼的终章 🩸</h1>
      <p class="vampire-demise__subtitle">
        技艺与资源双双枯竭……你的吸血鬼生涯走到了尽头。
      </p>
    </div>

    <!-- 回顾区 -->
    <div class="vampire-demise__review">
      <h2 class="vampire-demise__review-title">旅程回顾</h2>
      
      <div class="vampire-demise__stats">
        <div class="vampire-demise__stat">
          <span class="vampire-demise__stat-value">{{ stats.survivalYears }}</span>
          <span class="vampire-demise__stat-label">存活时长</span>
        </div>
        <div class="vampire-demise__stat">
          <span class="vampire-demise__stat-value">{{ stats.experienceCount }}</span>
          <span class="vampire-demise__stat-label">经历回忆数</span>
        </div>
        <div class="vampire-demise__stat">
          <span class="vampire-demise__stat-value">{{ stats.diaryEntries }}</span>
          <span class="vampire-demise__stat-label">日记条目数</span>
        </div>
        <div class="vampire-demise__stat">
          <span class="vampire-demise__stat-value">{{ stats.characterCount }}</span>
          <span class="vampire-demise__stat-label">遇见角色数</span>
        </div>
      </div>

      <!-- 时间轴 -->
      <div class="vampire-demise__timeline">
        <h3 class="vampire-demise__timeline-title">主要事件</h3>
        <div class="vampire-demise__timeline-entries">
          <div
            v-for="event in stats.majorEvents"
            :key="event.tick"
            class="vampire-demise__timeline-entry"
          >
            <span class="vampire-demise__timeline-tick">Tick {{ event.tick }}</span>
            <span class="vampire-demise__timeline-desc">{{ event.description }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 消亡叙事区 -->
    <div class="vampire-demise__narrative">
      <h2 class="vampire-demise__narrative-title">描述你的消亡</h2>
      <p class="vampire-demise__narrative-prompt">
        请描述你的吸血鬼如何迎来终结。这是最后的篇章。
      </p>

      <div class="vampire-demise__editor-container">
        <div ref="editorRef" class="vampire-demise__editor vampire-parchment-bg" />
      </div>

      <div class="vampire-demise__editor-footer">
        <span class="vampire-demise__char-count">{{ characterCount }} 字</span>
        <button
          type="button"
          class="vampire-demise__submit-btn"
          :disabled="isSubmitting || characterCount === 0"
          @click="handleSubmit"
        >
          {{ isSubmitting ? '提交中...' : '记录终章' }}
        </button>
      </div>
    </div>

    <!-- 提交后展示 -->
    <div v-if="submitted" class="vampire-demise__final">
      <div class="vampire-demise__final-content vampire-handwritten">
        {{ demiseNarrative }}
      </div>
      
      <div class="vampire-demise__final-actions">
        <button
          type="button"
          class="vampire-demise__restart-btn"
          @click="handleRestart"
        >
          开始新的千年
        </button>
        <button
          type="button"
          class="vampire-demise__home-btn"
          @click="handleGoHome"
        >
          返回主页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import CharacterCount from '@tiptap/extension-character-count'
import { useShellAuth } from '../../composables/useShellAuth'
import { useGameStore } from '../../stores/gameStore'
import { useCharacterStore } from '../../stores/characterStore'

const router = useRouter()
const { httpClient } = useShellAuth()
const gameStore = useGameStore()
const characterStore = useCharacterStore()

const editorRef = ref<HTMLElement | null>(null)
const isSubmitting = ref(false)
const submitted = ref(false)
const demiseNarrative = ref('')
const characterCount = ref(0)

const editor = useEditor({
  extensions: [
    StarterKit,
    CharacterCount.configure({
      limit: 5000
    })
  ],
  content: '',
  onUpdate: ({ editor }: { editor: import('@tiptap/core').Editor }) => {
    characterCount.value = editor.storage.characterCount.characters()
  },
  editorProps: {
    attributes: {
      class: 'vampire-demise__editor-content'
    }
  }
})

// 计算统计数据
const stats = computed(() => {
  const memories = characterStore.memories
  const experiences = memories.flatMap(m => m.experiences)
  
  return {
    survivalYears: gameStore.currentTick, // 简化：用 tick 代替年份
    experienceCount: experiences.length,
    diaryEntries: characterStore.diaryState.entryCount,
    characterCount: characterStore.characters.length,
    majorEvents: [] as Array<{ tick: number; description: string }> // 需要从编年史获取
  }
})

async function handleSubmit() {
  if (!editor.value || isSubmitting.value) return

  const content = editor.value.getHTML()
  if (!content || content === '<p></p>') return

  isSubmitting.value = true
  demiseNarrative.value = content

  try {
    // 调用消亡能力
    // await httpClient.invoke('invoke.narrate_demise', { narrative: content })
    
    // 更新游戏状态
    gameStore.setGamePhase('ended')
    submitted.value = true
  } catch (err) {
    console.error('Failed to submit demise:', err)
  } finally {
    isSubmitting.value = false
  }
}

function handleRestart() {
  // 重置所有状态
  gameStore.resetGame()
  characterStore.resetCharacter()
  
  // 导航到车卡页面
  router.push('/character-creation')
}

function handleGoHome() {
  // 返回主应用
  window.location.href = `/packs/${gameStore.lastPromptId || ''}`
}

onUnmounted(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.vampire-demise {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.vampire-demise__header {
  text-align: center;
  margin-bottom: 32px;
}

.vampire-demise__title {
  font-family: var(--vampire-font-heading);
  font-size: 2rem;
  font-weight: 600;
  color: var(--vampire-blood);
  margin-bottom: 12px;
}

.vampire-demise__subtitle {
  font-size: 1rem;
  color: var(--vampire-text-secondary);
  line-height: 1.6;
}

.vampire-demise__review {
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  padding: 24px;
  margin-bottom: 32px;
}

.vampire-demise__review-title {
  font-family: var(--vampire-font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vampire-gold);
  margin-bottom: 20px;
}

.vampire-demise__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.vampire-demise__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background-color: var(--vampire-bg-deep);
  border-radius: var(--vampire-radius-md);
}

.vampire-demise__stat-value {
  font-family: var(--vampire-font-heading);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vampire-gold);
  margin-bottom: 4px;
}

.vampire-demise__stat-label {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.vampire-demise__timeline-title {
  font-family: var(--vampire-font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: var(--vampire-text-primary);
  margin-bottom: 12px;
}

.vampire-demise__timeline-entries {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vampire-demise__timeline-entry {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  background-color: var(--vampire-bg-deep);
  border-radius: var(--vampire-radius-sm);
}

.vampire-demise__timeline-tick {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
  white-space: nowrap;
}

.vampire-demise__timeline-desc {
  font-size: 0.875rem;
  color: var(--vampire-text-secondary);
}

.vampire-demise__narrative {
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  padding: 24px;
  margin-bottom: 32px;
}

.vampire-demise__narrative-title {
  font-family: var(--vampire-font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vampire-gold);
  margin-bottom: 8px;
}

.vampire-demise__narrative-prompt {
  font-size: 0.875rem;
  color: var(--vampire-text-secondary);
  margin-bottom: 20px;
}

.vampire-demise__editor-container {
  margin-bottom: 16px;
}

.vampire-demise__editor {
  min-height: 200px;
}

.vampire-demise__editor-content {
  min-height: 200px;
  outline: none;
}

.vampire-demise__editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vampire-demise__char-count {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
}

.vampire-demise__submit-btn {
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

.vampire-demise__submit-btn:hover:not(:disabled) {
  background-color: #a00000;
}

.vampire-demise__submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vampire-demise__final {
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  padding: 24px;
  text-align: center;
}

.vampire-demise__final-content {
  font-size: 1.125rem;
  line-height: 1.8;
  color: var(--vampire-parchment);
  margin-bottom: 24px;
  text-align: left;
}

.vampire-demise__final-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.vampire-demise__restart-btn,
.vampire-demise__home-btn {
  padding: 12px 24px;
  font-family: var(--vampire-font-body);
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: none;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-demise__restart-btn {
  background-color: var(--vampire-gold);
  color: var(--vampire-bg-deep);
}

.vampire-demise__restart-btn:hover {
  background-color: #e6c34a;
}

.vampire-demise__home-btn {
  background-color: var(--vampire-bg-deep);
  color: var(--vampire-text-secondary);
  border: 1px solid var(--vampire-border-muted);
}

.vampire-demise__home-btn:hover {
  background-color: var(--vampire-bg-elevated);
}
</style>
