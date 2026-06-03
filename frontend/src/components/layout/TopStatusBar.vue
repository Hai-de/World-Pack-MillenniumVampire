<template>
  <header class="vampire-topbar">
    <div class="vampire-topbar__left">
      <span class="vampire-topbar__era">硬编码：没想好放什么</span>
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

      <!-- 游戏模式切换（Agent 模式尚未开发） -->
      <button
        type="button"
        class="vampire-topbar__mode-toggle vampire-topbar__mode-toggle--disabled"
        disabled
        title="Agent 模式尚未开发完成"
      >
        🎮 玩家
        <span class="vampire-topbar__mode-coming-soon">Agent 开发中</span>
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
  min-width: 0;
}

.vampire-topbar__left {
  flex-shrink: 1;
  overflow: hidden;
}

.vampire-topbar__center {
  flex-shrink: 2;
  overflow: hidden;
}

.vampire-topbar__right {
  flex-shrink: 0;
}

.vampire-topbar__era {
  color: var(--vampire-gold);
  font-family: var(--vampire-font-heading);
  font-weight: 600;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vampire-topbar__dice-result {
  color: var(--vampire-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.vampire-topbar__mode-toggle--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  display: flex;
  align-items: center;
  gap: 6px;
}

.vampire-topbar__mode-coming-soon {
  font-size: 0.625rem;
  color: var(--vampire-text-muted);
}

/* ─── 窄屏适配 ─── */
@media (max-width: 480px) {
  .vampire-topbar {
    padding: 0 8px;
    gap: 4px;
  }

  .vampire-topbar__left,
  .vampire-topbar__center,
  .vampire-topbar__right {
    gap: 4px;
  }

  .vampire-topbar__era {
    font-size: 0.75rem;
  }

  .vampire-topbar__mode-toggle {
    padding: 4px 8px;
    font-size: 0.6875rem;
  }
}
</style>
