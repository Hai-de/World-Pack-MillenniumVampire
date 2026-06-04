<template>
  <div class="vampire-prompt-display vampire-parchment-bg">
    <!-- 加载态 -->
    <VampireSkeleton v-if="status === 'loading'" variant="prompt" />

    <!-- 错误态 -->
    <VampireErrorBanner
      v-else-if="status === 'error'"
      :error="error"
      :retry="retry"
    />

    <!-- 未投骰态 -->
    <div v-else-if="!lastConsumed" class="vampire-prompt-display__empty">
      <p class="vampire-prompt-display__empty-text">投掷骰子以揭示你的命运</p>
      <p class="vampire-prompt-display__empty-hint">骰子将决定你遇见哪条提示</p>
    </div>

    <!-- 已投骰态：显示被消费的提示（玩家要回应的那个） -->
    <div v-else class="vampire-prompt-display__content">
      <div class="vampire-prompt-display__header">
        <span class="vampire-prompt-display__label">命运揭示</span>
      </div>

      <div class="vampire-prompt-display__body vampire-handwritten">
        {{ lastConsumed.content }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useVampireAsync } from '../../composables/useVampireAsync'
import { useShellAuth } from '../../composables/useShellAuth'
import VampireSkeleton from '../shared/VampireSkeleton.vue'
import VampireErrorBanner from '../shared/VampireErrorBanner.vue'

const gameStore = useGameStore()
const { httpClient } = useShellAuth()

// 维持 useVampireAsync 存活（用于 error/retry 状态显示）
const { status, error, retry } = useVampireAsync(
  async () => {
    // 初始化时拉一次 current_prompt 以确认服务可用
    await httpClient.getCurrentPrompt()
    return true
  },
  { isEmpty: (d) => !d }
)

// 被消费的提示来自 DiceRoller 投骰后写入 gameStore
const lastConsumed = computed(() => gameStore.lastConsumedPrompt)
</script>

<style scoped>
.vampire-prompt-display {
  border-radius: var(--vampire-radius-lg);
  border: 1px solid var(--vampire-border-muted);
  box-shadow: var(--vampire-shadow-card);
  overflow: hidden;
}

.vampire-prompt-display__empty {
  padding: 32px;
  text-align: center;
}

.vampire-prompt-display__empty-text {
  color: var(--vampire-text-secondary);
  font-size: 1rem;
}

.vampire-prompt-display__empty-hint {
  color: var(--vampire-text-muted);
  font-size: 0.875rem;
  margin-top: 8px;
}

.vampire-prompt-display__content {
  padding: 20px;
}

.vampire-prompt-display__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.vampire-prompt-display__label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vampire-text-muted);
}

.vampire-prompt-display__body {
  font-size: 1.125rem;
  line-height: 1.8;
  color: var(--vampire-parchment);
  margin-bottom: 16px;
}
</style>
