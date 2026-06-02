<template>
  <div class="vampire-diary-page">
    <AppShell>
      <div class="vampire-diary-page__content">
        <DiaryReader />
      </div>
    </AppShell>
  </div>
</template>

<script setup lang="ts">
import AppShell from '../components/layout/AppShell.vue'
import DiaryReader from '../components/diary/DiaryReader.vue'
</script>

<style scoped>
.vampire-diary-page {
  height: 100%;
}

.vampire-diary-page__content {
  padding: var(--vampire-page-padding);
  max-width: var(--vampire-content-max-width-reader);
  margin: 0 auto;
}

@media (max-width: 767px) {
  .vampire-diary-page__content {
    padding: var(--vampire-page-padding-mobile);
    padding-bottom: calc(var(--vampire-bottombar-height) + var(--vampire-page-padding-mobile) + env(safe-area-inset-bottom, 0px));
  }
}
</style>
