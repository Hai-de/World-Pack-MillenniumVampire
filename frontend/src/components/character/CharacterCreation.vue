<template>
  <div class="vampire-character-creation">
    <!-- 进度条 -->
    <div class="vampire-character-creation__progress">
      <div
        class="vampire-character-creation__progress-bar"
        :style="{ width: `${((currentStep + 1) / totalSteps) * 100}%` }"
      />
    </div>

    <!-- 步骤信息 -->
    <div class="vampire-character-creation__step-info">
      <span class="vampire-character-creation__step-count">
        {{ currentStep + 1 }}/{{ totalSteps }}
      </span>
      <h2 class="vampire-character-creation__step-title">
        {{ steps[currentStep].title }}
      </h2>
    </div>

    <!-- 步骤内容 -->
    <div class="vampire-character-creation__content">
      <div class="vampire-character-creation__prompt">
        {{ steps[currentStep].prompt }}
      </div>

      <!-- 输入区域 -->
      <div class="vampire-character-creation__input-area">
        <textarea
          v-model="formData[steps[currentStep].field]"
          class="vampire-character-creation__textarea"
          :placeholder="steps[currentStep].placeholder"
          rows="6"
        />
      </div>

      <!-- 示例参考 -->
      <div v-if="steps[currentStep].example" class="vampire-character-creation__example">
        <h4 class="vampire-character-creation__example-title">示例参考</h4>
        <p class="vampire-character-creation__example-text">
          {{ steps[currentStep].example }}
        </p>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="vampire-character-creation__actions">
      <button
        type="button"
        class="vampire-character-creation__btn vampire-character-creation__btn--back"
        :disabled="currentStep === 0"
        @click="prevStep"
      >
        ← 上一步
      </button>

      <button
        type="button"
        class="vampire-character-creation__btn vampire-character-creation__btn--skip"
        @click="skipStep"
      >
        跳过
      </button>

      <button
        type="button"
        class="vampire-character-creation__btn vampire-character-creation__btn--next"
        :disabled="isNextDisabled"
        @click="nextStep"
      >
        {{ isLastStep ? '完成创建' : '下一步 →' }}
      </button>
    </div>

    <!-- 断点续填提示 -->
    <div v-if="hasDraft" class="vampire-character-creation__draft-notice">
      <p>检测到未完成的车卡记录（第 {{ draftStep + 1 }} 步）</p>
      <div class="vampire-character-creation__draft-actions">
        <button type="button" @click="resumeDraft">继续</button>
        <button type="button" @click="clearDraft">重新开始</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useShellAuth } from '../../composables/useShellAuth'
import { useCharacterStore } from '../../stores/characterStore'
import { useGameStore } from '../../stores/gameStore'

const router = useRouter()
const { httpClient, shellContext } = useShellAuth()
const gameStore = useGameStore()
const characterStore = useCharacterStore()

interface CreationStep {
  title: string
  prompt: string
  field: string
  placeholder: string
  example?: string
}

const steps: CreationStep[] = [
  {
    title: '设定你的吸血鬼的名字',
    prompt: '为你的吸血鬼设定一个名字（本名或化名）以及外观描述。这将帮助AI Agent更好地进入角色。',
    field: 'name',
    placeholder: '例：马库斯·艾什顿，一位有着苍白皮肤和深邃眼眸的吸血鬼...',
    example: '亚历山大·莫罗，一个看起来永远三十岁的男人，有着乌黑的头发和苍白如纸的皮肤。'
  },
  {
    title: '成为吸血鬼前的经历',
    prompt: '叙述主角在成为吸血鬼之前的人生。是什么样的人？从事什么职业？',
    field: 'preVampireExperience',
    placeholder: '例：在十五世纪的佛罗伦萨，我是一名医生...'
  },
  {
    title: '创建三个凡人角色',
    prompt: '创建三个与吸血鬼有关的凡人角色，用简单的句子概括。',
    field: 'mortalCharacters',
    placeholder: '例：\n1. 爱丽丝 - 一个红发的乡村少女，因好奇而接近吸血鬼\n2. ...'
  },
  {
    title: '创建三个技艺',
    prompt: '创建三个符合角色的技艺（能力和特质）。',
    field: 'skills',
    placeholder: '例：剑术、伪装、古老语言'
  },
  {
    title: '创建三个资源',
    prompt: '创建三个符合角色的资源（资产、组织或珍视之物）。',
    field: 'resources',
    placeholder: '例：黑曜石小刀、古老的日记本、一个忠诚的仆人'
  },
  {
    title: '创建三段经历',
    prompt: '创建三段经历，分别录入不同的回忆中。',
    field: 'experiences',
    placeholder: '例：\n1. 第一次品尝人血的恐惧与渴望\n2. ...'
  },
  {
    title: '创建一个不朽者角色',
    prompt: '创建一个与吸血鬼相仿的不朽生物角色。',
    field: 'immortalCharacter',
    placeholder: '例：马库斯 - 一个古老的吸血鬼猎人，因共同的过去而成为朋友'
  },
  {
    title: '创建一个印记',
    prompt: '创建一个代表吸血鬼非人特征的印记。',
    field: 'mark',
    placeholder: '例：苍白的皮肤、永恒的饥饿、不会眨眼'
  },
  {
    title: '变为吸血鬼的经历',
    prompt: '描述主角是如何变成吸血鬼的。',
    field: 'turningExperience',
    placeholder: '例：在一个暴风雨的夜晚，我被一个古老的吸血鬼袭击...'
  }
]

const currentStep = ref(0)
const totalSteps = steps.length
const formData = ref<Record<string, string>>({})
const hasDraft = ref(false)
const draftStep = ref(0)

// 初始化表单数据
steps.forEach(step => {
  formData.value[step.field] = ''
})

// 自动保存草稿
watch(formData, () => {
  saveDraft()
}, { deep: true })

const isLastStep = computed(() => currentStep.value === totalSteps - 1)

const isNextDisabled = computed(() => {
  const field = steps[currentStep.value].field
  return !formData.value[field]?.trim()
})

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function nextStep() {
  if (isLastStep.value) {
    submitCreation()
  } else {
    currentStep.value++
  }
}

function skipStep() {
  // 跳过当前步骤，清空该步骤数据
  const field = steps[currentStep.value].field
  formData.value[field] = ''
  nextStep()
}

function saveDraft() {
  try {
    const draftData = {
      packVersion: '0.1.0',
      currentStep: currentStep.value,
      formData: formData.value
    }
    localStorage.setItem(`vampire_cc_draft_${shellContext.pack_id}`, JSON.stringify(draftData))
  } catch (e) {
    console.warn('Failed to save draft:', e)
  }
}

function loadDraft() {
  try {
    const saved = localStorage.getItem(`vampire_cc_draft_${shellContext.pack_id}`)
    if (saved) {
      const draft = JSON.parse(saved)
      // 版本校验
      if (draft.packVersion === '0.1.0') {
        hasDraft.value = true
        draftStep.value = draft.currentStep
        formData.value = { ...formData.value, ...draft.formData }
      } else {
        // 版本不匹配，清除草稿
        localStorage.removeItem(`vampire_cc_draft_${shellContext.pack_id}`)
      }
    }
  } catch (e) {
    console.warn('Failed to load draft:', e)
  }
}

function resumeDraft() {
  currentStep.value = draftStep.value
  hasDraft.value = false
}

function clearDraft() {
  localStorage.removeItem(`vampire_cc_draft_${shellContext.pack_id}`)
  hasDraft.value = false
  currentStep.value = 0
  // 重置表单
  steps.forEach(step => {
    formData.value[step.field] = ''
  })
}

async function submitCreation() {
  try {
    await httpClient.characterCreation({ formData: formData.value })

    // 清除草稿
    localStorage.removeItem(`vampire_cc_draft_${shellContext.pack_id}`)

    // 轮询等待插件异步处理完成，然后同步角色状态到 store
    await syncCharacterStateAfterCreation()

    // 更新游戏状态
    gameStore.setGamePhase('playing')

    // 导航到主游戏界面
    router.push('/')
  } catch (err) {
    console.error('Failed to submit character creation:', err)
  }
}

async function syncCharacterStateAfterCreation(maxRetries = 20, delayMs = 300) {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    try {
      const state = await httpClient.getCharacterState()
      if (state && (state as Record<string, unknown>).mortal_name) {
        characterStore.loadFromState(state as Record<string, unknown>)
        return
      }
      // Also check wrapped shape
      const data = (state as Record<string, unknown>).data as Record<string, unknown> | undefined
      if (data?.data && (data.data as Record<string, unknown>).mortal_name) {
        characterStore.loadFromState(state as Record<string, unknown>)
        return
      }
    } catch {
      // Plugin may not have processed the intent yet — continue polling
    }
  }
  // Last attempt — load whatever is available
  try {
    const state = await httpClient.getCharacterState()
    characterStore.loadFromState(state as Record<string, unknown>)
  } catch {
    console.warn('Failed to sync character state after creation')
  }
}

onMounted(() => {
  loadDraft()
})
</script>

<style scoped>
.vampire-character-creation {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  box-shadow: var(--vampire-shadow-card);
}

.vampire-character-creation__progress {
  height: 4px;
  background-color: var(--vampire-bg-deep);
  border-radius: 2px;
  margin-bottom: 24px;
  overflow: hidden;
}

.vampire-character-creation__progress-bar {
  height: 100%;
  background-color: var(--vampire-gold);
  transition: width var(--vampire-transition-normal);
}

.vampire-character-creation__step-info {
  margin-bottom: 24px;
}

.vampire-character-creation__step-count {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vampire-text-muted);
}

.vampire-character-creation__step-title {
  font-family: var(--vampire-font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vampire-gold);
  margin-top: 8px;
}

.vampire-character-creation__content {
  margin-bottom: 32px;
}

.vampire-character-creation__prompt {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--vampire-text-secondary);
  margin-bottom: 20px;
}

.vampire-character-creation__input-area {
  margin-bottom: 16px;
}

.vampire-character-creation__textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  font-family: var(--vampire-font-body);
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--vampire-text-primary);
  background-color: var(--vampire-bg-deep);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-md);
  resize: vertical;
  transition: border-color var(--vampire-transition-fast);
}

.vampire-character-creation__textarea:focus {
  outline: none;
  border-color: var(--vampire-gold);
}

.vampire-character-creation__example {
  padding: 12px;
  background-color: var(--vampire-parchment-dim);
  border-radius: var(--vampire-radius-md);
  border-left: 3px solid var(--vampire-gold-dim);
}

.vampire-character-creation__example-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vampire-text-muted);
  margin-bottom: 8px;
}

.vampire-character-creation__example-text {
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--vampire-text-secondary);
  font-style: italic;
}

.vampire-character-creation__actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.vampire-character-creation__btn {
  padding: 10px 20px;
  font-family: var(--vampire-font-body);
  font-size: 0.8125rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: none;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-character-creation__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vampire-character-creation__btn--back {
  background-color: var(--vampire-bg-deep);
  color: var(--vampire-text-secondary);
  border: 1px solid var(--vampire-border-muted);
}

.vampire-character-creation__btn--back:hover:not(:disabled) {
  background-color: var(--vampire-bg-elevated);
}

.vampire-character-creation__btn--skip {
  background: none;
  color: var(--vampire-text-muted);
}

.vampire-character-creation__btn--skip:hover {
  color: var(--vampire-text-secondary);
}

.vampire-character-creation__btn--next {
  background-color: var(--vampire-blood);
  color: var(--vampire-parchment);
}

.vampire-character-creation__btn--next:hover:not(:disabled) {
  background-color: #a00000;
}

.vampire-character-creation__draft-notice {
  margin-top: 24px;
  padding: 16px;
  background-color: var(--vampire-ink-dim);
  border-radius: var(--vampire-radius-md);
  text-align: center;
}

.vampire-character-creation__draft-notice p {
  font-size: 0.875rem;
  color: var(--vampire-text-secondary);
  margin-bottom: 12px;
}

.vampire-character-creation__draft-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.vampire-character-creation__draft-actions button {
  padding: 8px 16px;
  font-size: 0.8125rem;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-character-creation__draft-actions button:first-child {
  background-color: var(--vampire-gold);
  color: var(--vampire-bg-deep);
  border: none;
}

.vampire-character-creation__draft-actions button:last-child {
  background: none;
  color: var(--vampire-text-muted);
  border: 1px solid var(--vampire-border-muted);
}
</style>
