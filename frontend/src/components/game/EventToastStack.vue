<template>
  <Teleport to="body">
    <div class="vampire-toast-stack" aria-live="polite">
      <TransitionGroup name="vampire-toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="vampire-toast"
          :class="`vampire-toast--${toast.type}`"
          role="alert"
        >
          <div class="vampire-toast__icon">
            {{ toastIcons[toast.type] }}
          </div>
          <div class="vampire-toast__content">
            <p class="vampire-toast__message" v-html="toast.message" />
          </div>
          <button
            v-if="toast.dismissible"
            type="button"
            class="vampire-toast__close"
            @click="dismiss(toast.id)"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Toast {
  id: string
  type: 'skill_substitution' | 'resource_substitution' | 'demise' | 'new_skill' | 'character_death'
  message: string
  dismissible: boolean
  createdAt: number
}

const toastIcons: Record<Toast['type'], string> = {
  skill_substitution: '⚠️',
  resource_substitution: '⚠️',
  demise: '💀',
  new_skill: '✨',
  character_death: '🕯️'
}

const toasts = ref<Toast[]>([])
const AUTO_DISMISS_MS = 5000

let toastCounter = 0

function addToast(params: Omit<Toast, 'id' | 'createdAt'>) {
  const id = `toast-${++toastCounter}`
  const toast: Toast = {
    ...params,
    id,
    createdAt: Date.now()
  }

  toasts.value.push(toast)

  // 自动关闭（消亡通知除外）
  if (toast.dismissible) {
    setTimeout(() => {
      dismiss(id)
    }, AUTO_DISMISS_MS)
  }
}

function dismiss(id: string) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

// 预定义通知快捷方法
function notifySkillSubstitution(skillName: string, resourceName: string) {
  addToast({
    type: 'skill_substitution',
    message: `你没有掌握"<strong>${skillName}</strong>"，不得不付出代价：失去了<strong>${resourceName}</strong>。`,
    dismissible: true
  })
}

function notifyResourceSubstitution(skillName: string) {
  addToast({
    type: 'resource_substitution',
    message: `你没有任何可失去的资源，只好强行检验：<strong>${skillName}</strong>（未检验 → 已检验）。`,
    dismissible: true
  })
}

function notifyDemise() {
  addToast({
    type: 'demise',
    message: '技艺与资源双双枯竭……你的吸血鬼生涯走到了尽头。<a href="#/demise">点击此处描述你的消亡</a>。',
    dismissible: false
  })
}

function notifyNewSkill(skillName: string) {
  addToast({
    type: 'new_skill',
    message: `新技艺习得：<strong>${skillName}</strong>`,
    dismissible: true
  })
}

function notifyCharacterDeath(characterName: string, type: string) {
  addToast({
    type: 'character_death',
    message: `<strong>${characterName}</strong>（${type === 'mortal' ? '凡俗' : '不朽'}）已不在人世。`,
    dismissible: true
  })
}

// 暴露方法供外部调用
defineExpose({
  addToast,
  dismiss,
  notifySkillSubstitution,
  notifyResourceSubstitution,
  notifyDemise,
  notifyNewSkill,
  notifyCharacterDeath
})
</script>

<style scoped>
.vampire-toast-stack {
  position: fixed;
  top: calc(var(--vampire-topbar-height) + 16px);
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 400px;
  pointer-events: none;
}

.vampire-toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-md);
  box-shadow: var(--vampire-shadow-elevated);
  pointer-events: auto;
}

.vampire-toast--skill_substitution {
  border-left: 3px solid var(--vampire-state-warning);
}

.vampire-toast--resource_substitution {
  border-left: 3px solid #e69500;
}

.vampire-toast--demise {
  border-left: 3px solid var(--vampire-blood);
  background-color: rgba(139, 0, 0, 0.15);
}

.vampire-toast--new_skill {
  border-left: 3px solid var(--vampire-state-success);
}

.vampire-toast--character_death {
  border-left: 3px solid var(--vampire-text-muted);
}

.vampire-toast__icon {
  font-size: 1.125rem;
  flex-shrink: 0;
  margin-top: 1px;
}

.vampire-toast__content {
  flex: 1;
  min-width: 0;
}

.vampire-toast__message {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--vampire-text-primary);
}

.vampire-toast__message :deep(a) {
  color: var(--vampire-gold);
  text-decoration: underline;
  cursor: pointer;
}

.vampire-toast__close {
  flex-shrink: 0;
  padding: 4px;
  background: none;
  border: none;
  color: var(--vampire-text-muted);
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
}

.vampire-toast__close:hover {
  color: var(--vampire-text-primary);
}

/* 过渡动画 */
.vampire-toast-enter-active {
  transition: all 300ms ease-out;
}

.vampire-toast-leave-active {
  transition: all 200ms ease-in;
}

.vampire-toast-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.vampire-toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

@media (max-width: 767px) {
  .vampire-toast-stack {
    left: 16px;
    right: 16px;
    max-width: none;
  }
}
</style>
