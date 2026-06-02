<template>
  <div class="vampire-app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { inject, onMounted } from 'vue'
import { SHELL_CONTEXT_KEY } from './lib/injectionKeys'
import { VampireHttpClient } from './lib/httpClient'
import { useCharacterStore } from './stores/characterStore'
import { useGameStore } from './stores/gameStore'

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

const shellContext = inject(SHELL_CONTEXT_KEY)
if (!shellContext) {
  throw new Error('ShellContext not provided. Ensure mount() is called with a valid context.')
}

const markStateLoaded = inject<() => void>('markStateLoaded')
const httpClient = new VampireHttpClient(shellContext)
const characterStore = useCharacterStore()
const gameStore = useGameStore()

onMounted(async () => {
  try {
    const rawState = await httpClient.getCharacterState()
    console.debug('[App] getCharacterState response:', JSON.stringify(rawState)?.slice(0, 500))
    if (rawState) {
      const state = unwrapStateResponse(rawState as Record<string, unknown>)
      console.debug('[App] unwrapped state:', JSON.stringify(state)?.slice(0, 300))
      characterStore.loadFromState(rawState as Record<string, unknown>)

      if (typeof state.game_phase === 'string') {
        gameStore.setGamePhase(state.game_phase as 'uninitialized' | 'character_creation' | 'playing' | 'paused' | 'ended')
      } else if (characterStore.mortalName) {
        gameStore.setGamePhase('playing')
      }
    }
  } catch (err) {
    console.error('[App] Failed to load character state:', err)
  } finally {
    markStateLoaded?.()
  }
})
</script>

<style>
/* 全局根容器：内部滚动模式
   宿主 Nuxt 对 html/body 设了 overflow:hidden，viewport 不滚动。
   因此 .vampire-app 自身成为滚动宿主：固定高度 + overflow-y:auto。
   AppShell 内页面自带滚动（__main overflow-y:auto），不会撑高此容器；
   独立页面（Welcome / CharacterCreation）用 min-height:100% 填充，
   内容超出时由本容器滚动。 */
.vampire-app {
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  max-width: 100vw;
  background-color: var(--vampire-bg-base);
  color: var(--vampire-text-primary);
  font-family: var(--vampire-font-body);
}
</style>