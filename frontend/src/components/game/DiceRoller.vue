<template>
  <div class="vampire-dice-roller">
    <!-- 骰子动画区域 -->
    <div v-if="phase !== 'idle'" class="vampire-dice-roller__animation">
      <div class="vampire-dice-roller__dice vampire-dice-roller__dice--d10">
        <div
          class="vampire-dice-roller__face"
          :class="{ 'vampire-dice-roller__face--rolling': phase === 'rolling' }"
        >
          {{ displayD10 ?? '?' }}
        </div>
      </div>
      <div class="vampire-dice-roller__dice vampire-dice-roller__dice--d6">
        <div
          class="vampire-dice-roller__face"
          :class="{ 'vampire-dice-roller__face--rolling': phase === 'rolling' }"
        >
          {{ displayD6 ?? '?' }}
        </div>
      </div>
    </div>

    <!-- 结果展示 -->
    <div v-if="phase === 'success' && diceResult" class="vampire-dice-roller__result">
      <span class="vampire-dice-roller__result-formula">
        {{ diceResult.d10 }} - {{ diceResult.d6 }} =
      </span>
      <span
        class="vampire-dice-roller__result-total"
        :class="resultClass"
      >
        {{ diceResult.total > 0 ? '+' : '' }}{{ diceResult.total }}
      </span>
    </div>

    <!-- 错误提示 -->
    <div v-if="phase === 'error'" class="vampire-dice-roller__error">
      {{ errorMessage }}
    </div>

    <!-- 操作按钮 -->
    <button
      type="button"
      class="vampire-dice-roller__button"
      :disabled="isButtonDisabled"
      @click="handleRoll"
    >
      {{ buttonText }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useShellAuth } from '../../composables/useShellAuth'
import { previewDiceRoll, DICE_ANIMATION_DURATION } from '../../lib/dice'

const gameStore = useGameStore()
const { httpClient } = useShellAuth()

const phase = ref<'idle' | 'rolling' | 'resolving' | 'success' | 'error'>('idle')
const displayD10 = ref<number | null>(null)
const displayD6 = ref<number | null>(null)
const diceResult = ref<{ d10: number; d6: number; total: number } | null>(null)
const errorMessage = ref<string | null>(null)
const animationTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const isButtonDisabled = computed(() => 
  phase.value === 'rolling' || phase.value === 'resolving'
)

const buttonText = computed(() => {
  switch (phase.value) {
    case 'idle':
      return '投掷骰子'
    case 'rolling':
      return '投掷中...'
    case 'resolving':
      return '结算中...'
    case 'success':
      return '再次投掷'
    case 'error':
      return '重试'
    default:
      return '投掷骰子'
  }
})

const resultClass = computed(() => {
  if (!diceResult.value) return ''
  return diceResult.value.total > 0
    ? 'vampire-dice-roller__result--positive'
    : diceResult.value.total < 0
    ? 'vampire-dice-roller__result--negative'
    : 'vampire-dice-roller__result--neutral'
})

async function handleRoll() {
  if (isButtonDisabled.value) return

  // 重置状态
  phase.value = 'rolling'
  errorMessage.value = null
  
  // 客户端预览骰子结果（用于动画）
  const preview = previewDiceRoll()
  displayD10.value = preview.d10
  displayD6.value = preview.d6

  // 等待动画完成
  animationTimer.value = setTimeout(async () => {
    phase.value = 'resolving'

    try {
      // 调用服务端获取实际结果
      const result = await httpClient.rollDice()
      diceResult.value = {
        d10: result.d10,
        d6: result.d6,
        total: result.total
      }
      displayD10.value = result.d10
      displayD6.value = result.d6

      // 更新游戏状态
      gameStore.setDiceResult({
        d10: result.d10,
        d6: result.d6,
        total: result.total
      })

      phase.value = 'success'
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : '投掷失败'
      phase.value = 'error'
    }
  }, DICE_ANIMATION_DURATION)
}

onUnmounted(() => {
  if (animationTimer.value) {
    clearTimeout(animationTimer.value)
  }
})
</script>

<style scoped>
.vampire-dice-roller {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  box-shadow: var(--vampire-shadow-card);
}

.vampire-dice-roller__animation {
  display: flex;
  gap: 24px;
}

.vampire-dice-roller__dice {
  width: 64px;
  height: 64px;
  perspective: 200px;
}

.vampire-dice-roller__face {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--vampire-font-heading);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vampire-parchment);
  background-color: var(--vampire-bg-deep);
  border: 2px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-md);
  transition: transform 0.3s ease;
}

.vampire-dice-roller__dice--d10 .vampire-dice-roller__face {
  background-color: var(--vampire-blood-dim);
  border-color: var(--vampire-blood);
}

.vampire-dice-roller__dice--d6 .vampire-dice-roller__face {
  background-color: var(--vampire-ink-dim);
  border-color: var(--vampire-ink);
}

.vampire-dice-roller__face--rolling {
  animation: vampire-dice-roll 0.5s ease-in-out infinite;
}

@keyframes vampire-dice-roll {
  0% { transform: rotateX(0deg) rotateY(0deg); }
  25% { transform: rotateX(90deg) rotateY(45deg); }
  50% { transform: rotateX(180deg) rotateY(90deg); }
  75% { transform: rotateX(270deg) rotateY(135deg); }
  100% { transform: rotateX(360deg) rotateY(180deg); }
}

.vampire-dice-roller__result {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 1.25rem;
}

.vampire-dice-roller__result-formula {
  color: var(--vampire-text-secondary);
}

.vampire-dice-roller__result-total {
  font-family: var(--vampire-font-heading);
  font-weight: 700;
  font-size: 1.5rem;
}

.vampire-dice-roller__result--positive {
  color: var(--vampire-gold);
}

.vampire-dice-roller__result--negative {
  color: var(--vampire-blood);
}

.vampire-dice-roller__result--neutral {
  color: var(--vampire-text-muted);
}

.vampire-dice-roller__error {
  color: var(--vampire-blood);
  font-size: 0.875rem;
  text-align: center;
}

.vampire-dice-roller__button {
  padding: 10px 24px;
  font-family: var(--vampire-font-body);
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vampire-parchment);
  background-color: var(--vampire-blood);
  border: none;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
  min-width: 120px;
}

.vampire-dice-roller__button:hover:not(:disabled) {
  background-color: #a00000;
  box-shadow: 0 0 8px rgba(139, 0, 0, 0.5);
}

.vampire-dice-roller__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
