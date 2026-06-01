import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Prompt {
  id: string
  content: string
  position: number
  consumed: boolean
  consumedAt?: string
}

export const usePromptStore = defineStore('prompt', () => {
  // ─── 提示池 ───
  const promptPool = ref<Prompt[]>([])
  const currentPosition = ref<number>(0)
  const consumedHistory = ref<Prompt[]>([])

  // ─── 配置 ───
  const poolCapacity = ref<number>(100)
  const replenishThreshold = ref<number>(45)

  // ─── 计算属性 ───
  const currentPrompt = computed(() => 
    promptPool.value.find((p: Prompt) => p.position === currentPosition.value && !p.consumed)
  )

  const consumedCount = computed(() => consumedHistory.value.length)

  const needsReplenish = computed(() => 
    consumedCount.value >= replenishThreshold.value
  )

  const availablePrompts = computed(() => 
    promptPool.value.filter((p: Prompt) => !p.consumed)
  )

  // ─── 操作 ───
  function setCurrentPosition(position: number) {
    currentPosition.value = position
  }

  function slideToNewPosition(diceResult: number) {
    // 根据骰子结果滑动到新位置
    const newPosition = currentPosition.value + diceResult
    // 确保位置在有效范围内
    if (newPosition >= 0 && newPosition < poolCapacity.value) {
      currentPosition.value = newPosition
    }
  }

  function consumeCurrentPrompt() {
    const prompt = currentPrompt.value
    if (prompt) {
      prompt.consumed = true
      prompt.consumedAt = new Date().toISOString()
      consumedHistory.value.unshift(prompt)
    }
  }

  function addPrompts(prompts: Prompt[]) {
    promptPool.value.push(...prompts)
  }

  function setPoolCapacity(capacity: number) {
    poolCapacity.value = capacity
  }

  function setReplenishThreshold(threshold: number) {
    replenishThreshold.value = threshold
  }

  function resetPromptPool() {
    promptPool.value = []
    currentPosition.value = 0
    consumedHistory.value = []
  }

  return {
    // 状态
    promptPool,
    currentPosition,
    consumedHistory,
    // 配置
    poolCapacity,
    replenishThreshold,
    // 计算属性
    currentPrompt,
    consumedCount,
    needsReplenish,
    availablePrompts,
    // 操作
    setCurrentPosition,
    slideToNewPosition,
    consumeCurrentPrompt,
    addPrompts,
    setPoolCapacity,
    setReplenishThreshold,
    resetPromptPool
  }
})
