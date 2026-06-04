// ── 类型定义与常量 ──

export interface VampireSkill {
  id: string;
  name: string;
  description: string;
  tested: boolean;
  linked_memory_id?: string;
}

export interface VampireResource {
  id: string;
  name: string;
  description: string;
  lost: boolean;
  kind?: 'generic' | 'diary';
}

export interface VampireMark {
  id: string;
  name: string;
  description: string;
}

export interface VampireState {
  mortal_name: string | null;
  appearance: string[];
  born_era: string | null;
  turned_era: string | null;
  current_alias: string | null;
  skills: VampireSkill[];
  resources: VampireResource[];
  marks: VampireMark[];
  active_memory_ids: string[];
  character_ids: string[];
  diary_id: string | null;
  // 提示池：打乱的环形缓冲区
  prompt_cursor: number;        // 当前在 prompt_order 中的下标
  prompt_order: number[];       // 打乱后的 position 序列
  dice_roll_count: number;      // 投骰次数（前端用刷新触发）
  game_phase: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ── 常量 ──

export const VAMPIRE_STATE_ID = 'actor_vampire';
export const DIARY_ID = 'artifact_diary';

// ── 配置变量读取 ──

export const DEFAULT_VARIABLES: Record<string, number> = {
  prompt_pool_capacity: 100,
  prompt_replenish_threshold: 45,
  max_memories: 5,
  max_experiences_per_memory: 3,
  max_diary_memories: 4
};

export async function getPackVariable(_host: any, key: string): Promise<number | null> {
  return DEFAULT_VARIABLES[key] ?? null;
}
