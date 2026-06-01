<template>
  <div class="vampire-app-shell" :class="{ 'vampire-app-shell--sidebar-open': uiStore.sidebarOpen }">
    <!-- 顶部状态栏 -->
    <TopStatusBar class="vampire-app-shell__topbar" />

    <!-- 主体区域 -->
    <div class="vampire-app-shell__body">
      <!-- 桌面端侧边栏 (≥1024px) -->
      <Sidebar
        v-if="isDesktop"
        class="vampire-app-shell__sidebar"
      />

      <!-- 平板端图标栏 (768px-1023px) -->
      <div
        v-else-if="isTablet"
        class="vampire-app-shell__tablet-rail"
      >
        <div
          v-for="item in sidebarItems"
          :key="item.id"
          class="vampire-app-shell__rail-item"
          :class="{ 'vampire-app-shell__rail-item--active': uiStore.activePanel === item.id }"
          @click="handleRailItemClick(item.id)"
        >
          <span class="vampire-app-shell__rail-icon">{{ item.icon }}</span>
        </div>
      </div>

      <!-- 主内容区 -->
      <main class="vampire-app-shell__main">
        <router-view />
      </main>
    </div>

    <!-- 移动端底部导航 (<768px) -->
    <BottomTabBar v-if="isMobile" class="vampire-app-shell__bottombar" />

    <!-- 移动端抽屉菜单 -->
    <DrawerMenu
      v-if="isMobile && drawerOpen"
      @close="drawerOpen = false"
    />

    <!-- 事件通知栈 -->
    <EventToastStack />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUiStore } from '../../stores/uiStore'
import TopStatusBar from './TopStatusBar.vue'
import Sidebar from './Sidebar.vue'
import BottomTabBar from './BottomTabBar.vue'
import DrawerMenu from './DrawerMenu.vue'
import EventToastStack from '../game/EventToastStack.vue'

const uiStore = useUiStore()
const drawerOpen = ref(false)
const windowWidth = ref(window.innerWidth)

// 响应式断点
const isDesktop = computed(() => windowWidth.value >= 1024)
const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value < 1024)
const isMobile = computed(() => windowWidth.value < 768)

// 侧边栏/图标栏项目
const sidebarItems = [
  { id: 'vampire', icon: '🧛', label: '吸血鬼状态' },
  { id: 'skills', icon: '⚔️', label: '技艺' },
  { id: 'resources', icon: '📦', label: '资源' },
  { id: 'diary', icon: '📖', label: '日记' },
  { id: 'characters', icon: '👥', label: '角色' },
  { id: 'marks', icon: '👁️', label: '印记' },
  { id: 'memories', icon: '🧠', label: '回忆' },
  { id: 'settings', icon: '⚙️', label: '设置' }
]

function handleRailItemClick(itemId: string) {
  uiStore.setActivePanel(itemId)
  if (!uiStore.sidebarOpen) {
    uiStore.toggleSidebar()
  }
}

function handleResize() {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.vampire-app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--vampire-bg-base);
}

.vampire-app-shell__topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--vampire-topbar-height);
}

.vampire-app-shell__body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 桌面端侧边栏 */
.vampire-app-shell__sidebar {
  width: var(--vampire-sidebar-width);
  flex-shrink: 0;
  background-color: var(--vampire-bg-deep);
  border-right: 1px solid var(--vampire-border-muted);
  overflow-y: auto;
}

/* 平板端图标栏 */
.vampire-app-shell__tablet-rail {
  width: var(--vampire-sidebar-collapsed);
  flex-shrink: 0;
  background-color: var(--vampire-bg-deep);
  border-right: 1px solid var(--vampire-border-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 4px;
}

.vampire-app-shell__rail-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: background-color var(--vampire-transition-fast);
}

.vampire-app-shell__rail-item:hover {
  background-color: var(--vampire-bg-elevated);
}

.vampire-app-shell__rail-item--active {
  background-color: var(--vampire-blood-dim);
}

.vampire-app-shell__rail-icon {
  font-size: 1.25rem;
}

/* 主内容区 */
.vampire-app-shell__main {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 移动端底部导航 */
.vampire-app-shell__bottombar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: var(--vampire-bottombar-height);
}

/* 响应式调整 */
@media (max-width: 767px) {
  .vampire-app-shell__main {
    padding-bottom: calc(var(--vampire-bottombar-height) + 16px);
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .vampire-app-shell__sidebar {
    display: none;
  }
}

@media (min-width: 1024px) {
  .vampire-app-shell__tablet-rail {
    display: none;
  }
}
</style>
