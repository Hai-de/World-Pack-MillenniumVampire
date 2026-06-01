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

// 在根组件中确认 ShellContext 已注入
const shellContext = inject(SHELL_CONTEXT_KEY)
if (!shellContext) {
  throw new Error('ShellContext not provided. Ensure mount() is called with a valid context.')
}

const httpClient = new VampireHttpClient(shellContext)
const characterStore = useCharacterStore()
const gameStore = useGameStore()

onMounted(async () => {
  if (gameStore.gamePhase !== 'playing') return

  try {
    const state = await httpClient.getCharacterState()
    if (state) {
      characterStore.loadFromState(state as Record<string, unknown>)
    }
  } catch {
    // Server state may not be available yet — store will use defaults
  }
})
</script>

<style>
/* 全局根容器 */
.vampire-app {
  min-height: 100vh;
  background-color: var(--vampire-bg-base);
  color: var(--vampire-text-primary);
  font-family: var(--vampire-font-body);
}
</style>