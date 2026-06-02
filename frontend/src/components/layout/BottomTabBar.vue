<template>
  <nav class="vampire-bottom-tab-bar">
    <router-link
      v-for="tab in mainTabs"
      :key="tab.route"
      :to="tab.route"
      class="vampire-bottom-tab-bar__item"
      :class="{ 'vampire-bottom-tab-bar__item--active': $route.path === tab.route }"
    >
      <span class="vampire-bottom-tab-bar__icon">{{ tab.icon }}</span>
      <span class="vampire-bottom-tab-bar__label">{{ tab.label }}</span>
    </router-link>

    <!-- "更多"按钮触发抽屉 -->
    <button
      type="button"
      class="vampire-bottom-tab-bar__item"
      @click="$emit('open-drawer')"
    >
      <span class="vampire-bottom-tab-bar__icon">⋯</span>
      <span class="vampire-bottom-tab-bar__label">更多</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
const mainTabs = [
  { route: '/', icon: '🎲', label: '骰子' },
  { route: '/diary', icon: '📖', label: '日记' },
  { route: '/memories', icon: '🧠', label: '回忆' },
  { route: '/settings', icon: '⚙️', label: '设置' }
]

defineEmits<{
  'open-drawer': []
}>()
</script>

<style scoped>
.vampire-bottom-tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: var(--vampire-bottombar-height);
  background-color: var(--vampire-bg-deep);
  border-top: 1px solid var(--vampire-border-muted);
  padding: 0 8px;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.vampire-bottom-tab-bar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 1;
  padding: 8px 4px;
  border: none;
  background: none;
  color: var(--vampire-text-muted);
  text-decoration: none;
  cursor: pointer;
  transition: color var(--vampire-transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.vampire-bottom-tab-bar__item:hover,
.vampire-bottom-tab-bar__item--active {
  color: var(--vampire-gold);
}

.vampire-bottom-tab-bar__icon {
  font-size: 1.25rem;
  line-height: 1;
}

.vampire-bottom-tab-bar__label {
  font-size: 0.6875rem;
  line-height: 1;
}
</style>
