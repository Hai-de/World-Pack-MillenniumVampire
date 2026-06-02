<template>
  <div class="vampire-home-page">
    <AppShell>
      <div class="vampire-home-page__content">

        <!-- 顶部：当前提示 -->
        <div class="vampire-home-page__prompt-section">
          <PromptDisplay />
        </div>

        <!-- 中间：回应编辑器（常驻） -->
        <div class="vampire-home-page__response-section">
          <VampireResponse @submitted="handleResponseSubmitted" />
        </div>

        <!-- 底部：骰子 -->
        <div class="vampire-home-page__dice-section">
          <DiceRoller />
        </div>
      </div>
    </AppShell>
  </div>
</template>

<script setup lang="ts">
import AppShell from '../components/layout/AppShell.vue'
import DiceRoller from '../components/game/DiceRoller.vue'
import PromptDisplay from '../components/game/PromptDisplay.vue'
import VampireResponse from '../components/game/VampireResponse.vue'

function handleResponseSubmitted(response: string) {
  console.log('Response submitted:', response.substring(0, 100) + '...')
}
</script>

<style scoped>
.vampire-home-page__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  min-width: 0;
  padding: var(--vampire-page-padding);
  padding-bottom: 48px;
  max-width: var(--vampire-content-max-width-main);
  margin: 0 auto;
}

/* ─── 提示区：顶部，占主要视觉焦点 ─── */
.vampire-home-page__prompt-section {
  width: 100%;
  max-width: 720px;
  min-height: 120px;
  min-width: 0;
}

/* ─── 骰子区：居中，始终可见 ─── */
.vampire-home-page__dice-section {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

/* ─── 回应区：底部，展开时占主要编辑空间 ─── */
.vampire-home-page__response-section {
  width: 100%;
  max-width: 720px;
  min-height: 300px;
  min-width: 0;
}

/* ─── 响应式 ─── */
@media (max-width: 767px) {
  .vampire-home-page__content {
    padding: var(--vampire-page-padding-mobile);
    padding-bottom: calc(var(--vampire-bottombar-height) + var(--vampire-page-padding-mobile) + env(safe-area-inset-bottom, 0px));
    gap: 16px;
  }
}
</style>
