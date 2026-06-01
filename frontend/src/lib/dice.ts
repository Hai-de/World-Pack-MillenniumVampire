/**
 * 骰子计算逻辑。
 * 投掷 1d10 和 1d6，计算 1d10 - 1d6。
 * 结果为正 → 向前滑动
 * 结果为负 → 向后滑动
 */

export interface DiceRollResult {
  d10: number
  d6: number
  total: number
  direction: 'forward' | 'backward' | 'neutral'
}

/** 客户端预览骰子结果（用于动画，实际结果以服务端为准） */
export function previewDiceRoll(): DiceRollResult {
  const d10 = Math.floor(Math.random() * 10) + 1  // 1-10
  const d6 = Math.floor(Math.random() * 6) + 1     // 1-6
  const total = d10 - d6

  return {
    d10,
    d6,
    total,
    direction: total > 0 ? 'forward' : total < 0 ? 'backward' : 'neutral'
  }
}

/** 骰子动画时长（毫秒） */
export const DICE_ANIMATION_DURATION = 1800

/** 骰子面文本映射 */
export const D10_FACES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
export const D6_FACES = [1, 2, 3, 4, 5, 6]
