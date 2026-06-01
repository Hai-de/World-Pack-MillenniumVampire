<template>
  <div class="vampire-skeleton" :class="`vampire-skeleton--${variant}`">
    <div v-if="variant === 'dice'" class="vampire-skeleton__dice">
      <div class="vampire-skeleton__dice-face" />
      <div class="vampire-skeleton__dice-face" />
    </div>

    <div v-else-if="variant === 'prompt'" class="vampire-skeleton__prompt">
      <div class="vampire-skeleton__line vampire-skeleton__line--title" />
      <div class="vampire-skeleton__line" />
      <div class="vampire-skeleton__line" />
      <div class="vampire-skeleton__line vampire-skeleton__line--short" />
    </div>

    <div v-else-if="variant === 'editor'" class="vampire-skeleton__editor">
      <div class="vampire-skeleton__line" />
      <div class="vampire-skeleton__line" />
      <div class="vampire-skeleton__line" />
      <div class="vampire-skeleton__line vampire-skeleton__line--medium" />
      <div class="vampire-skeleton__line vampire-skeleton__line--short" />
    </div>

    <div v-else-if="variant === 'panel'" class="vampire-skeleton__panel">
      <div v-for="i in 5" :key="i" class="vampire-skeleton__panel-row">
        <div class="vampire-skeleton__badge" />
        <div class="vampire-skeleton__line" />
      </div>
    </div>

    <div v-else-if="variant === 'diary'" class="vampire-skeleton__diary">
      <div class="vampire-skeleton__book-page">
        <div class="vampire-skeleton__line vampire-skeleton__line--title" />
        <div class="vampire-skeleton__line" />
        <div class="vampire-skeleton__line" />
        <div class="vampire-skeleton__line vampire-skeleton__line--medium" />
      </div>
    </div>

    <div v-else-if="variant === 'memory-grid'" class="vampire-skeleton__memory-grid">
      <div v-for="i in 4" :key="i" class="vampire-skeleton__memory-card">
        <div class="vampire-skeleton__line vampire-skeleton__line--title" />
        <div class="vampire-skeleton__badge" />
      </div>
    </div>

    <div v-else class="vampire-skeleton__default">
      <div class="vampire-skeleton__line" />
      <div class="vampire-skeleton__line" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'dice' | 'prompt' | 'editor' | 'panel' | 'diary' | 'memory-grid' | 'default'
}

withDefaults(defineProps<Props>(), {
  variant: 'default'
})
</script>

<style scoped>
.vampire-skeleton {
  animation: vampire-skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes vampire-skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}

.vampire-skeleton__line {
  height: 14px;
  background: var(--vampire-parchment-dim);
  border-radius: var(--vampire-radius-sm);
  margin-bottom: 8px;
}

.vampire-skeleton__line--title {
  height: 20px;
  width: 60%;
}

.vampire-skeleton__line--short {
  width: 40%;
}

.vampire-skeleton__line--medium {
  width: 70%;
}

.vampire-skeleton__dice {
  display: flex;
  gap: 16px;
}

.vampire-skeleton__dice-face {
  width: 64px;
  height: 64px;
  background: var(--vampire-parchment-dim);
  border-radius: var(--vampire-radius-md);
}

.vampire-skeleton__panel-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.vampire-skeleton__badge {
  width: 24px;
  height: 24px;
  background: var(--vampire-parchment-dim);
  border-radius: 50%;
}

.vampire-skeleton__panel-row .vampire-skeleton__line {
  flex: 1;
  margin-bottom: 0;
}

.vampire-skeleton__book-page {
  background: var(--vampire-parchment-dim);
  border-radius: var(--vampire-radius-md);
  padding: 24px;
  min-height: 200px;
}

.vampire-skeleton__book-page .vampire-skeleton__line {
  background: rgba(0, 0, 0, 0.1);
}

.vampire-skeleton__memory-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.vampire-skeleton__memory-card {
  background: var(--vampire-parchment-dim);
  border-radius: var(--vampire-radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vampire-skeleton__memory-card .vampire-skeleton__line {
  background: rgba(0, 0, 0, 0.1);
  margin-bottom: 0;
}
</style>
