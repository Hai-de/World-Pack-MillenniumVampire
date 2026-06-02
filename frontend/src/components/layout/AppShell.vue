<template>
  <div class="vampire-app-shell" :class="{ 'vampire-app-shell--sidebar-open': uiStore.sidebarOpen }">
    <!-- 顶部状态栏 -->
    <TopStatusBar class="vampire-app-shell__topbar" />

    <!-- 主体区域 -->
    <div class="vampire-app-shell__body">
      <!-- 宽屏桌面端侧边栏 (≥1280px) -->
      <Sidebar
        v-if="isWideDesktop"
        class="vampire-app-shell__sidebar"
      />

      <!-- 平板/窄桌面端图标栏 (768px-1279px) -->
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
        <slot />
        <router-view />
      </main>
    </div>

    <!-- 移动端底部导航 (<768px) -->
    <BottomTabBar v-if="isMobile" class="vampire-app-shell__bottombar" @open-drawer="drawerOpen = true" />

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
import { ref, computed, provide, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '../../stores/uiStore'
import TopStatusBar from './TopStatusBar.vue'
import Sidebar from './Sidebar.vue'
import BottomTabBar from './BottomTabBar.vue'
import DrawerMenu from './DrawerMenu.vue'
import EventToastStack from '../game/EventToastStack.vue'

const router = useRouter()
const uiStore = useUiStore()
const drawerOpen = ref(false)
const windowWidth = ref(window.innerWidth)

// 响应式断点
const isWideDesktop = computed(() => windowWidth.value >= 1280)
const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value < 1280)
const isMobile = computed(() => windowWidth.value < 768)

// 向子页面暴露断点状态
provide('vampire-layout-is-mobile', isMobile)
provide('vampire-layout-is-tablet', isTablet)
provide('vampire-layout-is-desktop', isWideDesktop)

// 侧边栏/图标栏项目
const sidebarItems = [
  { id: 'vampire', icon: '🧛', label: '吸血鬼状态', route: '/' },
  { id: 'skills', icon: '⚔️', label: '技艺', route: '/skills' },
  { id: 'resources', icon: '📦', label: '资源', route: '/resources' },
  { id: 'diary', icon: '📖', label: '日记', route: '/diary' },
  { id: 'characters', icon: '👥', label: '角色', route: '/characters' },
  { id: 'marks', icon: '👁️', label: '印记', route: '/marks' },
  { id: 'memories', icon: '🧠', label: '回忆', route: '/memories' },
  { id: 'settings', icon: '⚙️', label: '设置', route: '/settings' }
]

function handleRailItemClick(itemId: string) {
  uiStore.setActivePanel(itemId)
  const item = sidebarItems.find(i => i.id === itemId)
  if (item?.route) {
    router.push(item.route)
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
  height: 100vh;
  height: 100dvh;
  max-width: 100vw;
  overflow: hidden;
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
  min-width: 0;
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
  min-width: 0;
  overflow-y: auto;
  padding: var(--vampire-page-padding);
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
    padding: var(--vampire-page-padding-mobile);
    padding-bottom: calc(var(--vampire-bottombar-height) + var(--vampire-page-padding-mobile) + env(safe-area-inset-bottom, 0px));
  }
}

@media (min-width: 768px) and (max-width: 1279px) {
  .vampire-app-shell__sidebar {
    display: none;
  }
}

@media (min-width: 1280px) {
  .vampire-app-shell__tablet-rail {
    display: none;
  }
}
</style>
