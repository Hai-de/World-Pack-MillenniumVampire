<template>
  <div v-if="error" class="vampire-error-banner" role="alert">
    <div class="vampire-error-banner__icon">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1L15 14H1L8 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M8 6V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="8" cy="11.5" r="0.75" fill="currentColor"/>
      </svg>
    </div>
    <div class="vampire-error-banner__content">
      <p class="vampire-error-banner__message">{{ error.message }}</p>
    </div>
    <div class="vampire-error-banner__actions">
      <button
        v-if="retry"
        type="button"
        class="vampire-error-banner__retry"
        @click="retry"
      >
        重试
      </button>
      <button
        v-if="dismissible"
        type="button"
        class="vampire-error-banner__dismiss"
        @click="$emit('dismiss')"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  error: Error | null
  retry?: () => void
  dismissible?: boolean
}

withDefaults(defineProps<Props>(), {
  dismissible: false
})

defineEmits<{
  dismiss: []
}>()
</script>

<style scoped>
.vampire-error-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(139, 0, 0, 0.1);
  border: 1px solid var(--vampire-blood-dim);
  border-left: 3px solid var(--vampire-blood);
  border-radius: var(--vampire-radius-sm);
  color: var(--vampire-text-primary);
}

.vampire-error-banner__icon {
  flex-shrink: 0;
  color: var(--vampire-blood);
  margin-top: 2px;
}

.vampire-error-banner__content {
  flex: 1;
  min-width: 0;
}

.vampire-error-banner__message {
  font-size: 0.875rem;
  line-height: 1.5;
}

.vampire-error-banner__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.vampire-error-banner__retry {
  padding: 4px 12px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: var(--vampire-blood-dim);
  color: var(--vampire-text-primary);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: background var(--vampire-transition-fast);
}

.vampire-error-banner__retry:hover {
  background: var(--vampire-blood);
}

.vampire-error-banner__dismiss {
  padding: 4px 8px;
  font-size: 0.875rem;
  background: none;
  border: none;
  color: var(--vampire-text-muted);
  cursor: pointer;
  transition: color var(--vampire-transition-fast);
}

.vampire-error-banner__dismiss:hover {
  color: var(--vampire-text-primary);
}
</style>
