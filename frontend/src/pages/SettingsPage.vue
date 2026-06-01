<template>
  <div class="vampire-settings">
    <div class="vampire-settings__container">
      <header class="vampire-settings__header">
        <h1 class="vampire-settings__title">设置</h1>
      </header>

      <section class="vampire-settings__section">
        <h2 class="vampire-settings__section-title">游戏数据</h2>
        <div class="vampire-settings__card">
          <div class="vampire-settings__row">
            <div class="vampire-settings__info">
              <p class="vampire-settings__label">重置游戏</p>
              <p class="vampire-settings__desc">
                清除当前角色、游戏进度、提示池和所有本地草稿。将回到欢迎界面重新开始。
              </p>
            </div>
            <button
              type="button"
              class="vampire-settings__btn vampire-settings__btn--danger"
              :disabled="gameStore.gamePhase === 'uninitialized'"
              @click="showResetConfirm = true"
            >
              重置
            </button>
          </div>
          <div v-if="gameStore.gamePhase === 'uninitialized'" class="vampire-settings__hint">
            当前没有进行中的游戏数据。
          </div>
        </div>
      </section>

      <section class="vampire-settings__section">
        <h2 class="vampire-settings__section-title">当前状态</h2>
        <div class="vampire-settings__card">
          <div class="vampire-settings__status-grid">
            <div class="vampire-settings__status-item">
              <span class="vampire-settings__status-label">游戏阶段</span>
              <span class="vampire-settings__status-value">{{ phaseLabel }}</span>
            </div>
            <div class="vampire-settings__status-item">
              <span class="vampire-settings__status-label">当前纪元</span>
              <span class="vampire-settings__status-value">{{ characterStore.bornEra ?? '未创建' }}</span>
            </div>
            <div class="vampire-settings__status-item">
              <span class="vampire-settings__status-label">吸血鬼名称</span>
              <span class="vampire-settings__status-value">{{ characterStore.mortalName ?? '未创建' }}</span>
            </div>
            <div class="vampire-settings__status-item">
              <span class="vampire-settings__status-label">技艺数量</span>
              <span class="vampire-settings__status-value">{{ characterStore.skills.length }}</span>
            </div>
            <div class="vampire-settings__status-item">
              <span class="vampire-settings__status-label">资源数量</span>
              <span class="vampire-settings__status-value">{{ characterStore.resources.length }}</span>
            </div>
            <div class="vampire-settings__status-item">
              <span class="vampire-settings__status-label">记忆数量</span>
              <span class="vampire-settings__status-value">{{ characterStore.memories.length }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 重置确认弹窗 -->
    <Teleport to="body">
      <div v-if="showResetConfirm" class="vampire-settings__overlay" @click.self="showResetConfirm = false">
        <div class="vampire-settings__dialog">
          <h3 class="vampire-settings__dialog-title">确认重置</h3>
          <p class="vampire-settings__dialog-text">
            此操作将清除当前角色的所有数据、游戏进度和本地草稿，且<strong>不可撤销</strong>。
          </p>
          <p class="vampire-settings__dialog-text">确定要继续吗？</p>
          <div class="vampire-settings__dialog-actions">
            <button
              type="button"
              class="vampire-settings__btn vampire-settings__btn--ghost"
              @click="showResetConfirm = false"
            >
              取消
            </button>
            <button
              type="button"
              class="vampire-settings__btn vampire-settings__btn--danger"
              @click="confirmReset"
            >
              确认重置
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import { useCharacterStore } from '../stores/characterStore'
import { usePromptStore } from '../stores/promptStore'
import { SHELL_CONTEXT_KEY } from '../lib/injectionKeys'

const router = useRouter()
const gameStore = useGameStore()
const characterStore = useCharacterStore()
const promptStore = usePromptStore()
const shellContext = inject(SHELL_CONTEXT_KEY)!

const showResetConfirm = ref(false)

const phaseLabel = computed(() => {
  const map: Record<string, string> = {
    uninitialized: '未开始',
    character_creation: '创建角色中',
    playing: '进行中',
    paused: '已暂停',
    ended: '已结束'
  }
  return map[gameStore.gamePhase] ?? gameStore.gamePhase
})

function clearLocalStorageDrafts() {
  const packId = shellContext.pack_id

  // 清除角色创建草稿
  localStorage.removeItem(`vampire_cc_draft_${packId}`)

  // 清除音效设置
  localStorage.removeItem(`vampire_audio_${packId}`)

  // 清除所有回应草稿（key 格式: vampire_draft_<promptId>）
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('vampire_draft_')) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key))
}

function confirmReset() {
  showResetConfirm.value = false

  // 重置所有 store
  gameStore.resetGame()
  characterStore.resetCharacter()
  promptStore.resetPromptPool()

  // 清除 localStorage 数据
  clearLocalStorageDrafts()

  // 跳转回欢迎页
  router.push('/welcome')
}
</script>

<style scoped>
.vampire-settings {
  min-height: 100vh;
  background-color: var(--vampire-bg-base);
  padding: 32px 24px;
}

.vampire-settings__container {
  max-width: 640px;
  margin: 0 auto;
}

/* ─── 标题 ─── */
.vampire-settings__header {
  margin-bottom: 32px;
}

.vampire-settings__title {
  font-family: var(--vampire-font-heading);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--vampire-gold);
  letter-spacing: 0.06em;
}

/* ─── 分区 ─── */
.vampire-settings__section {
  margin-bottom: 28px;
}

.vampire-settings__section-title {
  font-family: var(--vampire-font-heading);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vampire-text-muted);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 12px;
}

/* ─── 卡片 ─── */
.vampire-settings__card {
  padding: 20px 24px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  box-shadow: var(--vampire-shadow-card);
}

/* ─── 操作行 ─── */
.vampire-settings__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.vampire-settings__info {
  flex: 1;
}

.vampire-settings__label {
  font-family: var(--vampire-font-body);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--vampire-text-primary);
  margin-bottom: 4px;
}

.vampire-settings__desc {
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--vampire-text-secondary);
}

.vampire-settings__hint {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--vampire-border-subtle);
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
  font-style: italic;
}

/* ─── 状态网格 ─── */
.vampire-settings__status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.vampire-settings__status-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vampire-settings__status-label {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
  letter-spacing: 0.04em;
}

.vampire-settings__status-value {
  font-family: var(--vampire-font-heading);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--vampire-text-primary);
}

/* ─── 按钮 ─── */
.vampire-settings__btn {
  padding: 8px 24px;
  font-family: var(--vampire-font-heading);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  border-radius: var(--vampire-radius-md);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
}

.vampire-settings__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vampire-settings__btn--danger {
  color: var(--vampire-parchment);
  background-color: var(--vampire-blood);
  border: 1px solid var(--vampire-border-strong);
}

.vampire-settings__btn--danger:hover:not(:disabled) {
  background-color: #a00000;
  box-shadow: 0 0 16px var(--vampire-blood-glow);
}

.vampire-settings__btn--ghost {
  color: var(--vampire-text-secondary);
  background-color: transparent;
  border: 1px solid var(--vampire-border-subtle);
}

.vampire-settings__btn--ghost:hover {
  color: var(--vampire-text-primary);
  border-color: var(--vampire-border-muted);
}

/* ─── 弹窗遮罩 ─── */
.vampire-settings__overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--vampire-bg-overlay);
  backdrop-filter: blur(4px);
}

.vampire-settings__dialog {
  max-width: 400px;
  width: 100%;
  margin: 0 16px;
  padding: 28px 24px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  box-shadow: var(--vampire-shadow-elevated);
}

.vampire-settings__dialog-title {
  font-family: var(--vampire-font-heading);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--vampire-gold);
  margin-bottom: 16px;
}

.vampire-settings__dialog-text {
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--vampire-text-secondary);
  margin-bottom: 8px;
}

.vampire-settings__dialog-text strong {
  color: var(--vampire-blood);
}

.vampire-settings__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

/* ─── 响应式 ─── */
@media (max-width: 767px) {
  .vampire-settings {
    padding: 20px 16px;
    padding-bottom: calc(var(--vampire-bottombar-height) + 20px);
  }

  .vampire-settings__row {
    flex-direction: column;
    gap: 16px;
  }

  .vampire-settings__btn {
    width: 100%;
  }

  .vampire-settings__status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
