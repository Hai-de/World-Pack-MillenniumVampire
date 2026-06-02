<template>
  <div class="vampire-welcome vampire-standalone-page vampire-standalone-page--centered">
    <div class="vampire-welcome__bg" />

    <div class="vampire-welcome__container">
      <!-- 顶部：标题区 -->
      <header class="vampire-welcome__header">
        <h1 class="vampire-welcome__title">千年吸血鬼</h1>
        <p class="vampire-welcome__subtitle">Millennium Vampire</p>
      </header>

      <!-- 中间：世界观介绍 -->
      <section class="vampire-welcome__lore">
        <div class="vampire-welcome__lore-card">
          <p class="vampire-welcome__lore-line">
            你是一名吸血鬼。
          </p>
          <p class="vampire-welcome__lore-line">
            在这里，吸血鬼并非世俗意义上的传统吸血鬼——食用人类某个部位的生物都可以被认为是吸血鬼，也就是食人的怪物。
          </p>
          <p class="vampire-welcome__lore-line">
            你将在千年历史中用第一人称记录自己的经历。
          </p>
        </div>
      </section>

      <!-- 核心机制简述 -->
      <section class="vampire-welcome__rules">
        <div class="vampire-welcome__rule-grid">
          <div class="vampire-welcome__rule-item">
            <span class="vampire-welcome__rule-icon">🎲</span>
            <span class="vampire-welcome__rule-text">骰子决定时间的滑动方向</span>
          </div>
          <div class="vampire-welcome__rule-item">
            <span class="vampire-welcome__rule-icon">📝</span>
            <span class="vampire-welcome__rule-text">回应提示，产生经历与回忆</span>
          </div>
          <div class="vampire-welcome__rule-item">
            <span class="vampire-welcome__rule-icon">💀</span>
            <span class="vampire-welcome__rule-text">技艺与资源双双枯竭时——消亡</span>
          </div>
        </div>
      </section>

      <!-- 底部：CTA -->
      <footer class="vampire-welcome__footer">
        <button
          type="button"
          class="vampire-welcome__cta"
          @click="startCreation"
        >
          开始创建你的吸血鬼
        </button>
        <p class="vampire-welcome__hint">一名吸血鬼，一段千年日记。没有胜利条件。</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'

const router = useRouter()
const gameStore = useGameStore()

function startCreation() {
  gameStore.setGamePhase('character_creation')
  router.push('/character-creation')
}
</script>

<style scoped>
.vampire-welcome {
  overflow: hidden;
}

/* 渐变背景层 */
.vampire-welcome__bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse at 50% 0%, var(--vampire-blood-dim) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 100%, var(--vampire-ink-dim) 0%, transparent 50%),
    var(--vampire-bg-deep);
}

.vampire-welcome__container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
  text-align: center;
}

/* ─── 标题 ─── */
.vampire-welcome__header {
  margin-bottom: 40px;
}

.vampire-welcome__title {
  font-family: var(--vampire-font-heading);
  font-size: clamp(2rem, 6vw, 3rem);
  font-weight: 700;
  color: var(--vampire-gold);
  letter-spacing: 0.08em;
  line-height: 1.2;
  text-shadow: 0 0 40px var(--vampire-blood-dim);
}

.vampire-welcome__subtitle {
  font-family: var(--vampire-font-heading);
  font-size: clamp(0.75rem, 2vw, 1rem);
  font-weight: 400;
  color: var(--vampire-text-muted);
  letter-spacing: 0.25em;
  text-transform: uppercase;
  margin-top: 8px;
}

/* ─── 世界观卡片 ─── */
.vampire-welcome__lore {
  margin-bottom: 40px;
  width: 100%;
}

.vampire-welcome__lore-card {
  padding: 28px 32px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  box-shadow: var(--vampire-shadow-card);
}

.vampire-welcome__lore-line {
  font-family: var(--vampire-font-body);
  font-size: 0.9375rem;
  line-height: 1.8;
  color: var(--vampire-text-secondary);
  margin-bottom: 12px;
}

.vampire-welcome__lore-line:first-child {
  font-family: var(--vampire-font-heading);
  font-size: 1.125rem;
  color: var(--vampire-text-primary);
  font-weight: 600;
}

.vampire-welcome__lore-line:last-child {
  margin-bottom: 0;
}

/* ─── 核心机制 ─── */
.vampire-welcome__rules {
  margin-bottom: 48px;
  width: 100%;
}

.vampire-welcome__rule-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vampire-welcome__rule-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--vampire-bg-base);
  border: 1px solid var(--vampire-border-subtle);
  border-radius: var(--vampire-radius-md);
}

.vampire-welcome__rule-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.vampire-welcome__rule-text {
  font-size: 0.8125rem;
  color: var(--vampire-text-secondary);
  line-height: 1.5;
  text-align: left;
}

/* ─── CTA ─── */
.vampire-welcome__footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.vampire-welcome__cta {
  padding: 14px 48px;
  font-family: var(--vampire-font-heading);
  font-size: clamp(0.875rem, 2.5vw, 1rem);
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--vampire-parchment);
  background-color: var(--vampire-blood);
  border: 1px solid var(--vampire-border-strong);
  border-radius: var(--vampire-radius-md);
  cursor: pointer;
  transition: all var(--vampire-transition-normal);
  box-shadow: 0 0 20px var(--vampire-blood-glow);
}

.vampire-welcome__cta:hover {
  background-color: #a00000;
  box-shadow: 0 0 32px var(--vampire-blood-dim);
  transform: translateY(-1px);
}

.vampire-welcome__cta:active {
  transform: translateY(0);
}

.vampire-welcome__hint {
  font-size: 0.75rem;
  color: var(--vampire-text-muted);
  font-style: italic;
}

/* ─── 响应式：平板竖屏及以下 ─── */
@media (max-width: 767px) {
  .vampire-welcome__container {
    padding: 24px 0;
  }

  .vampire-welcome__header {
    margin-bottom: 28px;
  }

  .vampire-welcome__lore {
    margin-bottom: 28px;
  }

  .vampire-welcome__lore-card {
    padding: 20px;
  }

  .vampire-welcome__lore-line {
    font-size: 0.875rem;
  }

  .vampire-welcome__rules {
    margin-bottom: 32px;
  }

  .vampire-welcome__cta {
    width: 100%;
    max-width: 100%;
    padding: 14px 24px;
  }
}

/* ─── 响应式：小屏手机 ─── */
@media (max-width: 479px) {
  .vampire-welcome__container {
    padding: 16px 0;
  }

  .vampire-welcome__header {
    margin-bottom: 24px;
  }

  .vampire-welcome__lore-card {
    padding: 16px;
  }

  .vampire-welcome__rule-item {
    padding: 10px 12px;
    gap: 8px;
  }

  .vampire-welcome__rule-text {
    font-size: 0.75rem;
  }

  .vampire-welcome__hint {
    font-size: 0.6875rem;
  }
}
</style>
