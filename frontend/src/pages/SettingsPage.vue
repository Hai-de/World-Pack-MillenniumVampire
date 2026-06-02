<template>
  <div class="vampire-settings-page">
    <AppShell>
      <div class="vampire-settings-page__content">
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
            <div v-if="stateLoading" class="vampire-settings__hint">
              加载中…
            </div>
            <div v-else-if="stateLoadError" class="vampire-settings__hint vampire-settings__hint--error">
              {{ stateLoadError }}
            </div>
            <div v-else class="vampire-settings__status-grid">
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
                <span class="vampire-settings__status-label">回忆数量</span>
                <span class="vampire-settings__status-value">{{ characterStore.memories.length }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="vampire-settings__section">
          <h2 class="vampire-settings__section-title">插件状态</h2>
          <div class="vampire-settings__card">
            <div v-if="pluginsLoading" class="vampire-settings__hint">
              加载中…
            </div>
            <div v-else-if="pluginsError" class="vampire-settings__hint vampire-settings__hint--error">
              {{ pluginsError }}
              <button
                type="button"
                class="vampire-settings__retry-btn"
                @click="loadPlugins"
              >
                重试
              </button>
            </div>
            <div v-else-if="plugins.length === 0" class="vampire-settings__hint">
              当前没有已安装的插件。
            </div>
            <div v-else class="vampire-settings__plugins-list">
              <div
                v-for="plugin in plugins"
                :key="plugin.installation_id"
                class="vampire-settings__plugin-item"
              >
                <div class="vampire-settings__plugin-header">
                  <div class="vampire-settings__plugin-info">
                    <div class="vampire-settings__plugin-name-row">
                      <span
                        class="vampire-settings__plugin-dot"
                        :class="stateDotClass(plugin.lifecycle_state)"
                      />
                      <span class="vampire-settings__plugin-name">{{ plugin.plugin_id }}-v{{ plugin.version }}</span>
                    </div>
                    <span v-if="plugin.description" class="vampire-settings__plugin-desc">{{ plugin.description }}</span>
                    <span v-else class="vampire-settings__plugin-desc">{{ plugin.name }}</span>
                  </div>
                  <span
                    class="vampire-settings__plugin-state-badge"
                    :class="stateBadgeClass(plugin.lifecycle_state)"
                  >
                    {{ stateLabel(plugin.lifecycle_state) }}
                  </span>
                </div>
                <div
                  v-if="plugin.last_error"
                  class="vampire-settings__plugin-error"
                >
                  {{ plugin.last_error }}
                </div>
              </div>
            </div>
          </div>
        </section>

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
    </AppShell>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { PluginSummary } from '../lib/httpClient'
import { useGameStore } from '../stores/gameStore'
import { useCharacterStore } from '../stores/characterStore'
import { usePromptStore } from '../stores/promptStore'
import { useShellAuth } from '../composables/useShellAuth'
import AppShell from '../components/layout/AppShell.vue'

const router = useRouter()
const gameStore = useGameStore()
const characterStore = useCharacterStore()
const promptStore = usePromptStore()
const { shellContext, httpClient } = useShellAuth()

const showResetConfirm = ref(false)
const stateLoading = ref(false)
const stateLoadError = ref<string | null>(null)

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

// ── 从后端加载当前状态 ──

function unwrapStateResponse(raw: Record<string, unknown>): Record<string, unknown> {
  let state: Record<string, unknown> = raw
  if (state.data && typeof state.data === 'object' && !Array.isArray(state.data)) {
    const inner = state.data as Record<string, unknown>
    if (inner.data && typeof inner.data === 'object' && !Array.isArray(inner.data)) {
      state = inner.data as Record<string, unknown>
    } else {
      state = inner
    }
  }
  return state
}

async function loadCurrentState() {
  stateLoading.value = true
  stateLoadError.value = null

  try {
    const rawState = await httpClient.getCharacterState()
    const state = unwrapStateResponse(rawState as Record<string, unknown>)

    characterStore.loadFromState(rawState as Record<string, unknown>)

    if (typeof state.game_phase === 'string') {
      gameStore.setGamePhase(state.game_phase as 'uninitialized' | 'character_creation' | 'playing' | 'paused' | 'ended')
    }
  } catch (err) {
    stateLoadError.value = err instanceof Error ? err.message : '加载状态失败'
    console.error('[Settings] Failed to load character state:', err)
  } finally {
    stateLoading.value = false
  }
}

onMounted(() => {
  void loadCurrentState()
  void loadPlugins()
})

// ── 插件状态 ──

const plugins = ref<PluginSummary[]>([])
const pluginsLoading = ref(false)
const pluginsError = ref<string | null>(null)

async function loadPlugins() {
  pluginsLoading.value = true
  pluginsError.value = null
  try {
    const result = await httpClient.getPlugins()
    plugins.value = result.items ?? []
  } catch (err) {
    pluginsError.value = err instanceof Error ? err.message : '加载插件状态失败'
    console.error('[Settings] Failed to load plugins:', err)
  } finally {
    pluginsLoading.value = false
  }
}

const PLUGIN_STATE_LABELS: Record<string, string> = {
  active: '运行中',
  enabled: '已启用',
  disabled: '已禁用',
  pending_confirm: '待确认',
  importing: '导入中',
  error: '出错',
  unknown: '未知',
}

function stateLabel(lifecycleState: string): string {
  return PLUGIN_STATE_LABELS[lifecycleState] ?? lifecycleState
}

function stateDotClass(lifecycleState: string): string {
  if (lifecycleState === 'active') return 'vampire-settings__plugin-dot--active'
  if (lifecycleState === 'enabled') return 'vampire-settings__plugin-dot--enabled'
  if (lifecycleState === 'error') return 'vampire-settings__plugin-dot--error'
  if (lifecycleState === 'disabled') return 'vampire-settings__plugin-dot--disabled'
  return 'vampire-settings__plugin-dot--idle'
}

function stateBadgeClass(lifecycleState: string): string {
  if (lifecycleState === 'active') return 'vampire-settings__plugin-state-badge--active'
  if (lifecycleState === 'enabled') return 'vampire-settings__plugin-state-badge--enabled'
  if (lifecycleState === 'error') return 'vampire-settings__plugin-state-badge--error'
  if (lifecycleState === 'disabled') return 'vampire-settings__plugin-state-badge--disabled'
  return ''
}

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

async function confirmReset() {
  showResetConfirm.value = false

  // 1. 调用服务端重置 API
  try {
    await httpClient.resetGame()
  } catch (err) {
    console.error('[Settings] Server reset failed:', err)
    // 即使服务端重置失败，仍然执行本地清理
  }

  // 2. 重置所有 store
  gameStore.resetGame()
  characterStore.resetCharacter()
  promptStore.resetPromptPool()

  // 3. 清除 localStorage 数据
  clearLocalStorageDrafts()

  // 4. 跳转回欢迎页
  router.push('/welcome')
}
</script>

<style scoped>
.vampire-settings-page {
  height: 100%;
}

.vampire-settings-page__content {
  padding: var(--vampire-page-padding);
  max-width: var(--vampire-content-max-width-settings);
  margin: 0 auto;
  min-width: 0;
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

.vampire-settings__hint--error {
  color: var(--vampire-blood);
  font-style: normal;
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

/* ─── 插件列表 ─── */
.vampire-settings__plugins-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.vampire-settings__plugin-item {
  padding: 14px 0;
  border-bottom: 1px solid var(--vampire-border-subtle);
}

.vampire-settings__plugin-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.vampire-settings__plugin-item:first-child {
  padding-top: 0;
}

.vampire-settings__plugin-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.vampire-settings__plugin-info {
  flex: 1;
  min-width: 0;
}

.vampire-settings__plugin-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.vampire-settings__plugin-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
  background: var(--vampire-text-muted);
}

.vampire-settings__plugin-dot--active {
  background: #4caf50;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.5);
}

.vampire-settings__plugin-dot--enabled {
  background: var(--vampire-gold);
}

.vampire-settings__plugin-dot--error {
  background: var(--vampire-blood);
}

.vampire-settings__plugin-dot--disabled {
  background: var(--vampire-text-muted);
  opacity: 0.4;
}

.vampire-settings__plugin-dot--idle {
  background: var(--vampire-text-muted);
  opacity: 0.6;
}

.vampire-settings__plugin-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vampire-text-primary);
}

.vampire-settings__plugin-version {
  font-size: 0.6875rem;
  color: var(--vampire-text-muted);
}

.vampire-settings__plugin-desc {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
  line-height: 1.5;
}

.vampire-settings__plugin-state-badge {
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--vampire-bg-deep);
  color: var(--vampire-text-muted);
  border: 1px solid var(--vampire-border-subtle);
}

.vampire-settings__plugin-state-badge--active {
  color: #4caf50;
  border-color: rgba(76, 175, 80, 0.3);
  background: rgba(76, 175, 80, 0.08);
}

.vampire-settings__plugin-state-badge--enabled {
  color: var(--vampire-gold);
  border-color: var(--vampire-gold-dim);
  background: rgba(255, 215, 0, 0.05);
}

.vampire-settings__plugin-state-badge--error {
  color: var(--vampire-blood);
  border-color: var(--vampire-blood-dim);
  background: rgba(139, 0, 0, 0.08);
}

.vampire-settings__plugin-state-badge--disabled {
  color: var(--vampire-text-muted);
  opacity: 0.6;
}

.vampire-settings__plugin-error {
  margin-top: 8px;
  font-size: 0.75rem;
  color: var(--vampire-blood);
  line-height: 1.5;
  padding: 8px 10px;
  background: rgba(139, 0, 0, 0.06);
  border-radius: var(--vampire-radius-sm);
}

.vampire-settings__retry-btn {
  display: inline;
  margin-left: 8px;
  padding: 0;
  background: none;
  border: none;
  font-size: inherit;
  color: var(--vampire-gold);
  cursor: pointer;
  text-decoration: underline;
}

.vampire-settings__retry-btn:hover {
  color: var(--vampire-gold-bright);
}

/* ─── 响应式 ─── */
@media (max-width: 767px) {
  .vampire-settings-page__content {
    padding: var(--vampire-page-padding-mobile);
    padding-bottom: calc(var(--vampire-bottombar-height) + var(--vampire-page-padding-mobile) + env(safe-area-inset-bottom, 0px));
  }

  .vampire-settings__row {
    flex-direction: column;
    gap: 16px;
  }

  .vampire-settings__btn {
    width: 100%;
  }

  .vampire-settings__dialog-actions {
    flex-direction: column;
  }

  .vampire-settings__status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
