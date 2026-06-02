<template>
  <header class="vampire-standalone-header">
    <button
      type="button"
      class="vampire-standalone-header__back"
      :aria-label="backAriaLabel"
      @click="handleBack"
    >
      <span class="vampire-standalone-header__back-icon" aria-hidden="true">←</span>
      <span class="vampire-standalone-header__back-text">{{ backLabel }}</span>
    </button>

    <span v-if="title" class="vampire-standalone-header__title">{{ title }}</span>

    <!-- 占位元素保持 flex 居中对称 -->
    <div class="vampire-standalone-header__spacer" />
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = withDefaults(defineProps<{
  title?: string
  backLabel?: string
  backAriaLabel?: string
  fallbackRoute?: string
}>(), {
  title: '',
  backLabel: '返回',
  backAriaLabel: '返回上一页',
  fallbackRoute: '/'
})

const router = useRouter()

function handleBack() {
  // 有浏览器历史则回退，否则跳转 fallback
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push(props.fallbackRoute)
  }
}
</script>

<style scoped>
.vampire-standalone-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 100%;
  min-width: 0;
  height: var(--vampire-topbar-height);
  padding: 0 var(--vampire-page-padding);
  background-color: var(--vampire-bg-deep);
  border-bottom: 1px solid var(--vampire-border-muted);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
}

/* ─── 返回按钮 ─── */
.vampire-standalone-header__back {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px 6px 10px;
  margin-left: -6px;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: var(--vampire-radius-md);
  color: var(--vampire-text-secondary);
  cursor: pointer;
  font-family: var(--vampire-font-body);
  font-size: 0.8125rem;
  line-height: 1;
  transition: all var(--vampire-transition-fast);
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}

.vampire-standalone-header__back:hover {
  color: var(--vampire-gold);
  background-color: var(--vampire-bg-elevated);
  border-color: var(--vampire-border-subtle);
}

.vampire-standalone-header__back:active {
  background-color: var(--vampire-blood-dim);
}

.vampire-standalone-header__back:focus-visible {
  outline: 2px solid var(--vampire-gold);
  outline-offset: -2px;
}

.vampire-standalone-header__back-icon {
  font-size: 1.125rem;
  line-height: 1;
}

.vampire-standalone-header__back-text {
  font-size: 0.8125rem;
}

/* ─── 标题 ─── */
.vampire-standalone-header__title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--vampire-font-heading);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vampire-gold);
  letter-spacing: 0.05em;
  pointer-events: none;
}

.vampire-standalone-header__spacer {
  min-width: 48px;
  flex-shrink: 1;
}

/* ─── 响应式：平板竖屏 ─── */
@media (max-width: 1023px) {
  .vampire-standalone-header {
    padding: 0 calc(var(--vampire-page-padding) - 4px);
  }

  .vampire-standalone-header__back {
    padding: 6px 12px 6px 8px;
  }
}

/* ─── 响应式：移动端 ─── */
@media (max-width: 767px) {
  .vampire-standalone-header {
    padding: 0 var(--vampire-page-padding-mobile);
  }

  .vampire-standalone-header__back {
    padding: 6px 10px;
    margin-left: -4px;
  }

  .vampire-standalone-header__back-text {
    display: none;
  }
}

/* ─── 响应式：小屏手机 ─── */
@media (max-width: 479px) {
  .vampire-standalone-header__back {
    padding: 5px 8px;
  }

  .vampire-standalone-header__back-icon {
    font-size: 1rem;
  }
}

/* ─── 减少动画 ─── */
@media (prefers-reduced-motion: reduce) {
  .vampire-standalone-header__back {
    transition: none;
  }
}
</style>
