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
    path: '/skills',
    name: 'skills',
    component: () => import('./pages/SkillsPage.vue'),
    meta: { requiresPlaying: true }
  },
  {
    path: '/resources',
    name: 'resources',
    component: () => import('./pages/ResourcesPage.vue'),
    meta: { requiresPlaying: true }
  },
  {
    path: '/marks',
    name: 'marks',
    component: () => import('./pages/MarksPage.vue'),
    meta: { requiresPlaying: true }
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
  let stateLoaded = false

  const router = createRouter({
    history: createWebHashHistory(),
    routes
  })

  router.beforeEach((to, _from, next) => {
    const gameStore = useGameStore()
    const phase = gameStore.gamePhase

    if (!stateLoaded) {
      next()
      return
    }

    if (phase === 'uninitialized' && to.name !== 'welcome') {
      return next({ name: 'welcome' })
    }

    if (phase === 'character_creation' && to.name !== 'character-creation') {
      return next({ name: 'character-creation' })
    }

    if ((phase === 'playing' || phase === 'ended') && to.name === 'welcome') {
      return next({ name: 'home' })
    }

    next()
  })

  const markStateLoaded = () => {
    stateLoaded = true
  }

  return { router, markStateLoaded }
}
