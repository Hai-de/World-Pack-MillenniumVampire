<template>
  <div class="vampire-character-creation-page">
    <CharacterCreation />
  </div>
</template>

<script setup lang="ts">
import CharacterCreation from '../components/character/CharacterCreation.vue'
</script>

<style scoped>
.vampire-character-creation-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(ellipse at 50% 0%, var(--vampire-blood-dim) 0%, transparent 60%),
    var(--vampire-bg-deep);
}
</style>
