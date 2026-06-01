<template>
  <div class="vampire-drawer-overlay" @click.self="$emit('close')">
    <div class="vampire-drawer">
      <div class="vampire-drawer__header">
        <h3 class="vampire-drawer__title">更多功能</h3>
        <button type="button" class="vampire-drawer__close" @click="$emit('close')">✕</button>
      </div>

      <div class="vampire-drawer__grid">
        <router-link
          v-for="item in drawerItems"
          :key="item.route"
          :to="item.route"
          class="vampire-drawer__item"
          @click="$emit('close')"
        >
          <span class="vampire-drawer__item-icon">{{ item.icon }}</span>
          <span class="vampire-drawer__item-label">{{ item.label }}</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const drawerItems = [
  { route: '/characters', icon: '👥', label: '角色' },
  { route: '/chronicle', icon: '📜', label: '编年史' },
  { route: '/settings', icon: '⚙️', label: '设置' }
]

defineEmits<{
  close: []
}>()
</script>

<style scoped>
.vampire-drawer-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(10, 10, 15, 0.6);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.vampire-drawer {
  width: 100%;
  background-color: var(--vampire-bg-elevated);
  border-top-left-radius: var(--vampire-radius-lg);
  border-top-right-radius: var(--vampire-radius-lg);
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0));
  max-height: 60vh;
  overflow-y: auto;
}

.vampire-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.vampire-drawer__title {
  font-family: var(--vampire-font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: var(--vampire-gold);
}

.vampire-drawer__close {
  padding: 8px;
  background: none;
  border: none;
  color: var(--vampire-text-muted);
  cursor: pointer;
  font-size: 1rem;
}

.vampire-drawer__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.vampire-drawer__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 12px;
  background-color: var(--vampire-bg-deep);
  border: 1px solid var(--vampire-border-subtle);
  border-radius: var(--vampire-radius-md);
  text-decoration: none;
  color: var(--vampire-text-secondary);
  transition: all var(--vampire-transition-fast);
}

.vampire-drawer__item:hover {
  background-color: var(--vampire-blood-dim);
  color: var(--vampire-text-primary);
}

.vampire-drawer__item-icon {
  font-size: 1.5rem;
}

.vampire-drawer__item-label {
  font-size: 0.875rem;
}
</style>
