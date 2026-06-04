<template>
  <div class="vampire-chronicle-page">
    <AppShell>
      <div class="vampire-chronicle-page__content vampire-app-page-content">
        <h1 class="vampire-heading">编年史</h1>
        <p class="vampire-chronicle-page__subtitle">你的旅程，每一步都被记录</p>

        <Chronicle
          class="vampire-chronicle-page__chronicle"
          @view-memory="handleViewMemory"
          @view-diary="handleViewDiary"
        />
      </div>
    </AppShell>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppShell from '../components/layout/AppShell.vue'
import Chronicle from '../components/chronicle/Chronicle.vue'

const router = useRouter()

function handleViewMemory(memoryId: string) {
  // 导航到回忆页面（暂时跳到回忆页面，memoryId 可用于后续高亮）
  router.push({ path: '/memories', query: { highlight: memoryId } })
}

function handleViewDiary(diaryEntryId: string) {
  // 导航到日记页面（暂时跳到日记页面，diaryEntryId 可用于后续高亮）
  router.push({ path: '/diary', query: { highlight: diaryEntryId } })
}
</script>

<style scoped>
.vampire-chronicle-page {
  height: 100%;
}

.vampire-chronicle-page__subtitle {
  color: var(--vampire-text-muted);
  font-size: 0.9375rem;
  margin-top: 8px;
  margin-bottom: 24px;
}

.vampire-chronicle-page__chronicle {
  max-width: 800px;
}
</style>
