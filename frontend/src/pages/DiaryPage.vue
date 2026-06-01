<template>
  <div class="vampire-diary-page">
    <AppShell>
      <div class="vampire-diary-page__content">
        <DiaryReader @write-first="handleWriteFirst" @write-new="handleWriteNew" />
      </div>
    </AppShell>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppShell from '../components/layout/AppShell.vue'
import DiaryReader from '../components/diary/DiaryReader.vue'

const router = useRouter()

function handleWriteFirst() {
  // 导航到写日记界面（可以复用回应编辑器）
  // 这里简化为导航到首页
  router.push('/')
}

function handleWriteNew() {
  router.push('/')
}
</script>

<style scoped>
.vampire-diary-page {
  height: 100%;
}

.vampire-diary-page__content {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}
</style>
