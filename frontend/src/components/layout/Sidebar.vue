<template>
  <aside class="vampire-sidebar">


    <nav class="vampire-sidebar__nav">
      <router-link
        v-for="item in navItems"
        :key="item.route"
        :to="item.route"
        class="vampire-sidebar__nav-item"
        :class="{ 'vampire-sidebar__nav-item--active': $route.path === item.route }"
      >
        <span class="vampire-sidebar__nav-icon">{{ item.icon }}</span>
        <span class="vampire-sidebar__nav-label">{{ item.label }}</span>
      </router-link>
    </nav>

    <!-- 角色面板快速预览 -->
    <div class="vampire-sidebar__preview">
      <CharacterPanel :compact="true" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import CharacterPanel from '../character/CharacterPanel.vue'

const navItems = [
  { route: '/', icon: '🎲', label: '游戏' },
  { route: '/diary', icon: '📖', label: '日记' },
  { route: '/memories', icon: '🧠', label: '回忆' },
  { route: '/chronicle', icon: '📜', label: '编年史' },
  { route: '/characters', icon: '👥', label: '角色' },
  { route: '/settings', icon: '⚙️', label: '设置' }
]
</script>

<style scoped>
.vampire-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.vampire-sidebar__header {
  padding: 16px;
  border-bottom: 1px solid var(--vampire-border-muted);
}

.vampire-sidebar__title {
  font-family: var(--vampire-font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: var(--vampire-gold);
  letter-spacing: 0.05em;
}

.vampire-sidebar__nav {
  flex-shrink: 0;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vampire-sidebar__nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--vampire-radius-sm);
  color: var(--vampire-text-secondary);
  text-decoration: none;
  transition: all var(--vampire-transition-fast);
  font-size: 0.875rem;
}

.vampire-sidebar__nav-item:hover {
  background-color: var(--vampire-bg-elevated);
  color: var(--vampire-text-primary);
}

.vampire-sidebar__nav-item--active {
  background-color: var(--vampire-blood-dim);
  color: var(--vampire-text-primary);
}

.vampire-sidebar__nav-icon {
  font-size: 1rem;
  width: 24px;
  text-align: center;
}

.vampire-sidebar__preview {
  flex: 1;
  min-height: 0;
  padding: 12px;
  border-top: 1px solid var(--vampire-border-muted);
  overflow-y: auto;
}
</style>
