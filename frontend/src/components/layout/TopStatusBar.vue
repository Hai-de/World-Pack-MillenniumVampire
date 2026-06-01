<template>
  <header class="vampire-topbar">
    <div class="vampire-topbar__left">
      <span class="vampire-topbar__era">{{ gameStore.currentEra }}</span>
    </div>

    <div class="vampire-topbar__center">
      <span v-if="gameStore.diceResult" class="vampire-topbar__dice-result">
        🎲 {{ gameStore.diceResult.d10 }} - {{ gameStore.diceResult.d6 }} = 
        <strong :class="diceResultClass">{{ gameStore.diceResult.total }}</strong>
      </span>
    </div>

    <div class="vampire-topbar__right">
      <!-- 连接状态指示器 -->
      <span
        v-if="connectionStatus !== 'connected'"
        class="vampire-topbar__connection"
        :class="`vampire-topbar__connection--${connectionStatus}`"
      >
        <span class="vampire-topbar__dot" :class="`vampire-topbar__dot--${connectionStatus}`" />
        {{ connectionStatus === 'reconnecting' ? '重新连接中…' : '连接已断开' }}
      </span>

      <!-- 游戏模式切换 -->
      <button
        type="button"
        class="vampire-topbar__mode-toggle"
        @click="toggleMode"
      >
        {{ gameStore.vampireMode === 'player' ? '🎮 玩家' : '🤖 Agent' }}
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'

const gameStore = useGameStore()
const uiStore = useUiStore()

const connectionStatus = computed(() => uiStore.connectionStatus)

const diceResultClass = computed(() => {
  if (!gameStore.diceResult) return ''
  return gameStore.diceResult.total > 0
    ? 'vampire-topbar__dice-positive'
    : gameStore.diceResult.total < 0
    ? 'vampire-topbar__dice-negative'
    : 'vampire-topbar__dice-neutral'
})

function toggleMode() {
  gameStore.setVampireMode(
    gameStore.vampireMode === 'player' ? 'agent' : 'player'
  )
}
</script>

<style scoped>
.vampire-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: var(--vampire-topbar-height);
  background-color: var(--vampire-bg-deep);
  border-bottom: 1px solid var(--vampire-border-muted);
  font-size: 0.8125rem;
}

.vampire-topbar__left,
.vampire-topbar__center,
.vampire-topbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vampire-topbar__era {
  color: var(--vampire-gold);
  font-family: var(--vampire-font-heading);
  font-weight: 600;
  font-size: 0.875rem;
}

.vampire-topbar__dice-result {
  color: var(--vampire-text-secondary);
}

.vampire-topbar__dice-positive {
  color: var(--vampire-gold);
}

.vampire-topbar__dice-negative {
  color: var(--vampire-blood);
}

.vampire-topbar__dice-neutral {
  color: var(--vampire-text-muted);
}

.vampire-topbar__connection {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
}

.vampire-topbar__connection--reconnecting {
  color: var(--vampire-state-warning);
}

.vampire-topbar__connection--disconnected {
  color: var(--vampire-blood);
}

.vampire-topbar__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: vampire-pulse 2s ease-in-out infinite;
}

.vampire-topbar__dot--reconnecting {
  background-color: var(--vampire-state-warning);
}

.vampire-topbar__dot--disconnected {
  background-color: var(--vampire-blood);
  animation: none;
}

@keyframes vampire-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.vampire-topbar__mode-toggle {
  padding: 4px 10px;
  font-size: 0.75rem;
  background-color: var(--vampire-bg-elevated);
  color: var(--vampire-text-secondary);
  border: 1px solid var(--vampire-border-subtle);
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-topbar__mode-toggle:hover {
  background-color: var(--vampire-ink-dim);
  color: var(--vampire-text-primary);
}
</style>
