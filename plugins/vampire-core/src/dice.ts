// ── 骰子 ──

export function rollD10(): number {
  return Math.floor(Math.random() * 10) + 1;
}

export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// Fisher-Yates 洗牌，返回新数组
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 确保光标落在未消费提示上（从 cursor 向两端搜索）
export function clampCursorToUnconsumed(
  cursor: number,
  order: number[],
  consumedSet: Set<number>
): number {
  if (order.length === 0) return 0;
  if (!consumedSet.has(order[cursor])) return cursor;
  // 向两端扩散搜索
  for (let d = 1; d < order.length; d++) {
    const right = cursor + d;
    if (right < order.length && !consumedSet.has(order[right])) return right;
    const left = cursor - d;
    if (left >= 0 && !consumedSet.has(order[left])) return left;
  }
  return cursor; // 全部消费时原地不动
}
