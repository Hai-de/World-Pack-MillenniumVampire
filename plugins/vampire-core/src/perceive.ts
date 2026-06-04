// ── perceive.* 查询处理器 ──

import type { VampireState } from './types';
import { DIARY_ID, VAMPIRE_STATE_ID, getPackVariable } from './types';
import { getHost, loadVampireState } from './state';
import { clampCursorToUnconsumed } from './dice';
import { ensurePromptPoolSeeded } from './prompt-pool';

// ── perceive.current_prompt ──

export async function perceiveCurrentPrompt(_payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  await ensurePromptPoolSeeded(host);
  const state = await loadVampireState(host);
  const order = state.prompt_order ?? [];
  if (order.length === 0) {
    return { success: true, data: null };
  }

  const cursor = clampCursorToUnconsumed(
    state.prompt_cursor,
    order,
    new Set() // 不从 state 读取 consumed —— 每次从 DB 查
  );

  // 从 DB 读取实际消费状态
  const records = await host.listPackCollectionRecords('prompt_pool');
  const consumedMap = new Map<number, boolean>();
  for (const r of records) {
    consumedMap.set(r.position as number, r.consumed as boolean);
  }

  // 找到光标处或最近的有效提示
  const validCursor = clampCursorToUnconsumed(cursor, order, new Set(
    [...consumedMap.entries()].filter(([, c]) => c).map(([p]) => p)
  ));

  const position = order[validCursor];
  const prompt = records.find((r: any) => r.position === position);

  if (!prompt) {
    return { success: true, data: null };
  }

  return {
    success: true,
    data: {
      id: String(prompt.position),
      content: prompt.content,
      position: prompt.position,
      cursor: validCursor,
      poolSize: order.length
    }
  };
}

// ── perceive.character_state ──

export async function perceiveCharacterState(_payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  const state = await loadVampireState(host);

  // 加载回忆 — 活跃回忆从 active_memory_ids 加载，已归档回忆从 archived_to_diary 标记加载
  const allMemories = await host.listPackCollectionRecords('vampire_memories');
  const activeMemories = allMemories.filter((m: any) => state.active_memory_ids.includes(m.id));
  const archivedMemories = allMemories.filter((m: any) => m.archived_to_diary);
  // 合并去重（活跃列表中理论上不含已归档，但防御性处理）
  const seen = new Set<string>();
  const memories = [...activeMemories, ...archivedMemories].filter((m: any) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  const experiences = await host.listPackCollectionRecords('vampire_experiences');
  // 加载角色 — 只加载 character_ids 中的角色（过滤旧残留数据）
  const allCharacters = await host.listPackCollectionRecords('vampire_characters');
  const characterIds = state.character_ids ?? [];
  const characters = allCharacters.filter((c: any) => characterIds.includes(c.id));

  // 为每个回忆附加经历列表
  const memoriesWithExperiences = memories.map((m: any) => ({
    id: m.id,
    name: m.name,
    experience_count: m.experience_count ?? 0,
    archived_to_diary: m.archived_to_diary ?? false,
    created_at: m.created_at,
    experiences: experiences
      .filter((e: any) => e.memory_id === m.id)
      .map((e: any) => ({
        id: e.id,
        content: e.content,
        createdAt: e.created_at
      }))
  }));

  return {
    success: true,
    data: {
      mortal_name: state.mortal_name,
      appearance: state.appearance,
      born_era: state.born_era,
      turned_era: state.turned_era,
      current_alias: state.current_alias,
      skills: state.skills,
      resources: state.resources,
      marks: state.marks,
      memories: memoriesWithExperiences,
      characters: characters.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        type: c.kind ?? 'mortal',
        alive: c.alive !== false
      })),
      diary: state.diary_id ? {
        id: DIARY_ID,
        holder: VAMPIRE_STATE_ID,
        memory_ids: memories.filter((m: any) => m.archived_to_diary).map((m: any) => m.id),
        max_capacity: (await getPackVariable(host, 'max_diary_memories')) ?? 4,
        lost: false,
        entry_count: memories.filter((m: any) => m.archived_to_diary).length
      } : undefined,
      active_memory_ids: state.active_memory_ids,
      game_phase: state.game_phase,
      prompt_cursor: state.prompt_cursor,
      prompt_order: state.prompt_order,
      dice_roll_count: state.dice_roll_count
    }
  };
}

// ── perceive.diary_entries ──

export async function perceiveDiaryEntries(_payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  const memories = await host.listPackCollectionRecords('vampire_memories');
  const experiences = await host.listPackCollectionRecords('vampire_experiences');

  // 归档到日记的回忆
  const archivedMemories = memories.filter((m: any) => m.archived_to_diary);

  const entries = archivedMemories.map((m: any) => {
    const memExperiences = experiences
      .filter((e: any) => e.memory_id === m.id)
      .sort((a: any, b: any) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));

    return {
      id: m.id,
      name: m.name,
      content: memExperiences.map((e: any) => e.content).join('\n\n'),
      experience_count: m.experience_count ?? 0,
      createdAt: m.created_at
    };
  });

  return {
    success: true,
    data: { entries }
  };
}

// ── perceive.chronicle ──

export async function perceiveChronicle(_payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  const entries = await host.listPackCollectionRecords('chronicle_entries');
  const sorted = entries
    .sort((a: any, b: any) => (b.consumed_at ?? '').localeCompare(a.consumed_at ?? ''));

  return {
    success: true,
    data: {
      records: sorted.map((r: any) => ({
        id: r.id,
        diceResult: r.dice_result ?? '?',
        prompt: r.content,
        memoryId: r.memory_id ?? null,
        diaryEntryId: r.diary_entry_id ?? null,
        consumedAt: r.consumed_at,
        response: r.response_content ?? null,
        experienceId: r.experience_id ?? null
      }))
    }
  };
}

// ── perceive.full_state_snapshot ──

export async function perceiveFullStateSnapshot(_payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  // 复用 character_state 的完整数据
  const characterState = await perceiveCharacterState(null);
  if (!characterState.success) return characterState;

  // 额外加载提示池和编年史
  const chronicle = await perceiveChronicle(null);
  const currentPrompt = await perceiveCurrentPrompt(null);

  return {
    success: true,
    data: {
      ...(characterState.data as Record<string, unknown>),
      chronicle: chronicle.success ? (chronicle.data as any).records : [],
      currentPrompt: currentPrompt.success ? (currentPrompt.data as any) : null
    }
  };
}
