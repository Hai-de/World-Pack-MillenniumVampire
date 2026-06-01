import { createRouter, createWebHashHistory, type RouteRecordRaw, type NavigationGuardNext, type RouteLocationNormalized } from 'vue-router'
import { useGameStore } from './stores/gameStore'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('./pages/HomePage.vue'),
    meta: { requiresPlaying: true }
  },
  {
    path: '/welcome',
    name: 'welcome',
    component: () => import('./pages/WelcomePage.vue')
  },
  {
    path: '/character-creation',
    name: 'character-creation',
    component: () => import('./pages/CharacterCreationPage.vue')
  },
  {
    path: '/diary',
    name: 'diary',
    component: () => import('./pages/DiaryPage.vue')
  },
  {
    path: '/chronicle',
    name: 'chronicle',
    component: () => import('./pages/ChroniclePage.vue')
  },
  {
    path: '/memories',
    name: 'memories',
    component: () => import('./pages/MemoriesPage.vue')
  },
  {
    path: '/characters',
    name: 'characters',
    component: () => import('./pages/CharactersPage.vue')
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('./pages/SettingsPage.vue')
  },
  {
    path: '/demise',
    name: 'demise',
    component: () => import('./pages/DemisePage.vue')
  }
]

export function createVampireRouter() {
  const router = createRouter({
    history: createWebHashHistory(),
    routes
  })

  router.beforeEach((to, _from, next) => {
    const gameStore = useGameStore()
    const phase = gameStore.gamePhase

    // 游戏未初始化：只能访问欢迎页
    if (phase === 'uninitialized' && to.name !== 'welcome') {
      return next({ name: 'welcome' })
    }

    // 正在车卡：只能访问车卡页
    if (phase === 'character_creation' && to.name !== 'character-creation') {
      return next({ name: 'character-creation' })
    }

    // 游戏已结束或进行中：不能回到欢迎页
    if ((phase === 'playing' || phase === 'ended') && to.name === 'welcome') {
      return next({ name: 'home' })
    }

    next()
  })

  return router
}
