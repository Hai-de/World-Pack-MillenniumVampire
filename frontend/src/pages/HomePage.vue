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
          <VampireResponse
            ref="responseRef"
            @submitted="handleResponseSubmitted"
            @submit-requested="handleSubmitRequested"
          />
        </div>

        <!-- 底部：骰子 -->
        <div class="vampire-home-page__dice-section">
          <DiceRoller />
        </div>
      </div>
    </AppShell>

    <!-- 回忆选择器模态框 -->
    <MemoryPickerModal
      :visible="showPicker"
      :prompt-preview="gameStore.pendingSubmission?.promptContent ?? ''"
      :response-preview="gameStore.pendingSubmission?.responseContent ?? ''"
      @select-memory="handleSelectMemory"
      @create-memory="handleCreateMemory"
      @archive-then-select="handleArchiveThenSelect"
      @forget-then-select="handleForgetThenSelect"
      @close="handlePickerClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import DiceRoller from '../components/game/DiceRoller.vue'
import PromptDisplay from '../components/game/PromptDisplay.vue'
import VampireResponse from '../components/game/VampireResponse.vue'
import MemoryPickerModal from '../components/game/MemoryPickerModal.vue'
import { useGameStore, type PendingSubmission } from '../stores/gameStore'
import { useCharacterStore } from '../stores/characterStore'
import { useShellAuth } from '../composables/useShellAuth'

const gameStore = useGameStore()
const characterStore = useCharacterStore()
const { httpClient } = useShellAuth()

const responseRef = ref<InstanceType<typeof VampireResponse> | null>(null)
const showPicker = ref(false)

// ─── 提交回应 → 打开选择器 ───
function handleSubmitRequested(submission: PendingSubmission) {
  gameStore.setPendingSubmission(submission)
  showPicker.value = true
}

// ─── 正常选择：存入指定回忆 ───
async function handleSelectMemory(memoryId: string) {
  showPicker.value = false
  try {
    const result = await responseRef.value?.confirmSubmit(memoryId)
    if (result && gameStore.pendingSubmission) {
      characterStore.addExperience(memoryId, {
        id: result.experienceId,
        content: gameStore.pendingSubmission.responseContent,
        createdAt: new Date().toISOString()
      })
    }
  } catch (err) {
    console.error('Submit to memory failed:', err)
  } finally {
    gameStore.clearPendingSubmission()
  }
}

// ─── 新建回忆并存入 ───
async function handleCreateMemory(name: string) {
  showPicker.value = false
  try {
    const createResult = await httpClient.createMemory({ name })
    characterStore.addMemory({
      id: createResult.memory_id,
      name: createResult.name,
      experiences: [],
      archivedToDiary: false
    })
    const submitResult = await responseRef.value?.confirmSubmit(createResult.memory_id)
    if (submitResult && gameStore.pendingSubmission) {
      characterStore.addExperience(createResult.memory_id, {
        id: submitResult.experienceId,
        content: gameStore.pendingSubmission.responseContent,
        createdAt: new Date().toISOString()
      })
    }
  } catch (err) {
    console.error('Create memory and submit failed:', err)
  } finally {
    gameStore.clearPendingSubmission()
  }
}

// ─── 归档到日记 → 新建回忆 → 存入 ───
async function handleArchiveThenSelect(memoryId: string) {
  showPicker.value = false
  try {
    // 1. 归档到日记
    await httpClient.archiveMemoryToDiary({ memoryId })
    characterStore.archiveMemory(memoryId)

    // 2. 创建新回忆
    const createResult = await httpClient.createMemory({ name: '新的回忆' })
    characterStore.addMemory({
      id: createResult.memory_id,
      name: createResult.name,
      experiences: [],
      archivedToDiary: false
    })

    // 3. 提交到新回忆
    const submitResult = await responseRef.value?.confirmSubmit(createResult.memory_id)
    if (submitResult && gameStore.pendingSubmission) {
      characterStore.addExperience(createResult.memory_id, {
        id: submitResult.experienceId,
        content: gameStore.pendingSubmission.responseContent,
        createdAt: new Date().toISOString()
      })
    }
  } catch (err) {
    console.error('Archive then submit failed:', err)
  } finally {
    gameStore.clearPendingSubmission()
  }
}

// ─── 遗忘并新建 → 存入 ───
async function handleForgetThenSelect(memoryId: string) {
  showPicker.value = false
  try {
    // 1. 删除回忆
    await httpClient.deleteMemory({ memoryId })
    characterStore.removeMemory(memoryId)

    // 2. 创建新回忆
    const createResult = await httpClient.createMemory({ name: '新的回忆' })
    characterStore.addMemory({
      id: createResult.memory_id,
      name: createResult.name,
      experiences: [],
      archivedToDiary: false
    })

    // 3. 提交到新回忆
    const submitResult = await responseRef.value?.confirmSubmit(createResult.memory_id)
    if (submitResult && gameStore.pendingSubmission) {
      characterStore.addExperience(createResult.memory_id, {
        id: submitResult.experienceId,
        content: gameStore.pendingSubmission.responseContent,
        createdAt: new Date().toISOString()
      })
    }
  } catch (err) {
    console.error('Forget then submit failed:', err)
  } finally {
    gameStore.clearPendingSubmission()
  }
}

// ─── 关闭选择器 ───
function handlePickerClose() {
  showPicker.value = false
  gameStore.clearPendingSubmission()
}

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
