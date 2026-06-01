<template>
  <div class="vampire-home-page">
    <AppShell>
      <div class="vampire-home-page__content">
        <!-- 顶部：骰子和当前提示 -->
        <div class="vampire-home-page__top">
          <div class="vampire-home-page__dice-section">
            <DiceRoller />
          </div>
          <div class="vampire-home-page__prompt-section">
            <PromptDisplay @respond="handlePromptRespond" />
          </div>
        </div>

        <!-- 中间：回应编辑器（当有提示时显示） -->
        <div v-if="activePromptId" class="vampire-home-page__response-section">
          <VampireResponse :prompt-id="activePromptId" @submitted="handleResponseSubmitted" />
        </div>

        <!-- 底部：角色状态预览 -->
        <div class="vampire-home-page__sidebar-preview">
          <CharacterPanel />
        </div>
      </div>
    </AppShell>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import DiceRoller from '../components/game/DiceRoller.vue'
import PromptDisplay from '../components/game/PromptDisplay.vue'
import VampireResponse from '../components/game/VampireResponse.vue'
import CharacterPanel from '../components/character/CharacterPanel.vue'
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()
const activePromptId = ref<string | null>(null)

function handlePromptRespond(promptId: string) {
  activePromptId.value = promptId
}

function handleResponseSubmitted(response: string) {
  // 提交成功后清除活跃提示
  activePromptId.value = null
  
  // 这里可以添加提交后的逻辑，如更新状态等
  console.log('Response submitted:', response.substring(0, 100) + '...')
}
</script>

<style scoped>
.vampire-home-page {
  height: 100%;
}

.vampire-home-page__content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.vampire-home-page__top {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 24px;
}

.vampire-home-page__dice-section {
  position: sticky;
  top: 24px;
  align-self: start;
}

.vampire-home-page__prompt-section {
  min-height: 200px;
}

.vampire-home-page__response-section {
  min-height: 300px;
}

.vampire-home-page__sidebar-preview {
  display: none; /* 在桌面端侧边栏显示，移动端隐藏 */
}

/* 响应式调整 */
@media (max-width: 1023px) {
  .vampire-home-page__top {
    grid-template-columns: 1fr;
  }
  
  .vampire-home-page__dice-section {
    position: static;
  }
}

@media (max-width: 767px) {
  .vampire-home-page__content {
    padding: 16px;
    padding-bottom: calc(var(--vampire-bottombar-height) + 16px);
  }
  
  .vampire-home-page__top {
    gap: 16px;
  }
}
</style>
