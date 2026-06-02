import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface DiceResult {
  d10: number
  d6: number
  total: number
}

export interface GameStoreState {
  currentEra: string
  diceResult: DiceResult | null
  gamePhase: 'uninitialized' | 'character_creation' | 'playing' | 'paused' | 'ended'
  vampireMode: 'agent' | 'player'
  currentTick: number
  lastPromptId: string | null
}

export const useGameStore = defineStore('game', () => {
  // ─── 状态 ───
  const currentEra = ref<string>('中世纪')
  const diceResult = ref<DiceResult | null>(null)
  const gamePhase = ref<GameStoreState['gamePhase']>('uninitialized')
  const vampireMode = ref<GameStoreState['vampireMode']>('player')
  const currentTick = ref<number>(0)
  const lastPromptId = ref<string | null>(null)
  const diceRollCount = ref<number>(0)

  // ─── 计算属性 ───
  const isPlaying = computed(() => gamePhase.value === 'playing')
  const isEnded = computed(() => gamePhase.value === 'ended')
  const isDiceRolled = computed(() => diceResult.value !== null)

  // ─── 操作 ───
  function setDiceResult(result: DiceResult) {
    diceResult.value = result
  }

  function clearDiceResult() {
    diceResult.value = null
  }

  function setGamePhase(phase: GameStoreState['gamePhase']) {
    gamePhase.value = phase
  }

  function setVampireMode(mode: GameStoreState['vampireMode']) {
    vampireMode.value = mode
  }

  function incrementDiceRollCount() {
    diceRollCount.value++
  }

  function advanceTick(steps: number = 1) {
    currentTick.value += steps
  }

  function resetGame() {
    currentEra.value = '中世纪'
    diceResult.value = null
    gamePhase.value = 'uninitialized'
    vampireMode.value = 'player'
    currentTick.value = 0
    lastPromptId.value = null
    diceRollCount.value = 0
  }

  return {
    // 状态
    currentEra,
    diceResult,
    gamePhase,
    vampireMode,
    currentTick,
    lastPromptId,
    diceRollCount,
    // 计算属性
    isPlaying,
    isEnded,
    isDiceRolled,
    // 操作
    setDiceResult,
    clearDiceResult,
    setGamePhase,
    setVampireMode,
    advanceTick,
    resetGame,
    incrementDiceRollCount
  }
})
