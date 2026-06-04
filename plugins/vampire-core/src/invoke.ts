// ── invoke.* 动作处理器 ──

import type { VampireState } from './types';
import { VAMPIRE_STATE_ID, isRecord, getPackVariable } from './types';
import { getHost, loadVampireState, defaultVampireState, saveVampireState } from './state';
import { rollD10, rollD6, shuffle } from './dice';
import { replenishPromptPool, ensurePromptPoolSeeded, generateReplacementPrompt } from './prompt-pool';

// ── 同步动作处理工具 ──

/**
 * 将异步 invoke 处理器包装为 perceive 处理器。
 * perceive 路由会剥离 { success, data } 信封；失败时需 throw 让平台返回 HTTP 错误。
 */
export function makeThrowingHandler(
  handler: (payload: unknown) => Promise<Record<string, unknown>>) {
  return async (payload: unknown) => {
    const result = await handler(payload);
    if (result && result.success === false) {
      throw new Error(typeof result.error === 'string' ? result.error : 'operation_failed');
    }
    return result;
  };
}

// ── invoke.roll_dice ──

export async function invokeRollDice(_payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  await ensurePromptPoolSeeded(host);
  const state = await loadVampireState(host);

  const d10 = rollD10();
  const d6 = rollD6();
  const total = d10 - d6;
  const order = state.prompt_order ?? [];

  if (order.length === 0) {
    return { success: false, error: 'prompt_pool_empty' };
  }

  // 计算新光标位置（在打乱序列中移动）
  let newCursor = state.prompt_cursor + total;
  if (newCursor < 0) newCursor = 0;
  if (newCursor >= order.length) newCursor = order.length - 1;

  const landingPosition = order[newCursor];

  // 只消费落地的那一条提示
  const records = await host.listPackCollectionRecords('prompt_pool');
  const landingRecord = records.find((r: any) => r.position === landingPosition);

  // 创建编年史记录（在覆盖 position 之前）
  const chronicleId = `chr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (landingRecord) {
    // 1. 创建编年史条目（用独立 ID 做主键）
    await host.upsertPackCollectionRecord('chronicle_entries', {
      id: chronicleId,
      position: landingPosition,
      content: landingRecord.content,
      dice_result: `${d10} - ${d6} = ${total > 0 ? '+' : ''}${total}`,
      consumed_at: new Date().toISOString(),
      response_content: null,
      experience_id: null,
      memory_id: null,
      diary_entry_id: null
    });

    // 2. 标记原提示为已消费
    await host.upsertPackCollectionRecord('prompt_pool', {
      position: landingPosition,
      content: landingRecord.content,
      consumed: true
    });

    // 3. 在同位置生成替换提示（保持池大小不变）
    const replacementContent = generateReplacementPrompt(landingRecord.content);
    await host.upsertPackCollectionRecord('prompt_pool', {
      position: landingPosition,
      content: replacementContent,
      consumed: false
    });
  }

  // 定期重新打乱（每投 8 次骰子）
  if (state.dice_roll_count > 0 && state.dice_roll_count % 8 === 0) {
    state.prompt_order = shuffle(order);
    // 重新定位光标到中间附近
    state.prompt_cursor = Math.floor(order.length / 2);
  } else {
    state.prompt_cursor = newCursor;
  }
  state.dice_roll_count++;

  await saveVampireState(host, state);

  // 返回落地提示内容（供前端直接显示）
  const promptContent = landingRecord?.content ?? '未知提示';

  return {
    success: true,
    data: {
      intent_id: `roll_${Date.now()}`,
      d10,
      d6,
      total,
      cursor: state.prompt_cursor,
      poolSize: order.length,
      prompt: {
        id: chronicleId,
        content: promptContent,
        position: landingPosition
      }
    }
  };
}

// ── invoke.respond_to_prompt ──

export async function invokeRespondToPrompt(payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  const input = payload as {
    promptId?: string;
    response?: string;
    mode?: string;
    memoryId?: string;
  };

  if (!input.response) {
    return { success: false, error: 'response_required' };
  }

  const state = await loadVampireState(host);
  const maxExperiences = (await getPackVariable(host, 'max_experiences_per_memory')) ?? 3;
  const maxMemories = (await getPackVariable(host, 'max_memories')) ?? 5;

  // 确定目标回忆
  let activeMemoryId: string;
  let activeMemory: any = null;

  if (input.memoryId) {
    // 前端指定了回忆 ID
    const memories = await host.listPackCollectionRecords('vampire_memories');
    activeMemory = memories.find((r: any) => r.id === input.memoryId);
    if (!activeMemory) {
      return { success: false, error: 'memory_not_found' };
    }
    if ((activeMemory.experience_count ?? 0) >= maxExperiences) {
      return { success: false, error: 'memory_full' };
    }
    activeMemoryId = input.memoryId;
  } else {
    // 自动分配：找最近的未满回忆，或创建新回忆
    activeMemoryId = state.active_memory_ids[state.active_memory_ids.length - 1];
    if (activeMemoryId) {
      const records = await host.listPackCollectionRecords('vampire_memories');
      activeMemory = records.find((r: any) => r.id === activeMemoryId);
    }

    if (!activeMemory || (activeMemory.experience_count ?? 0) >= maxExperiences) {
      // 创建新回忆
      activeMemoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await host.upsertPackCollectionRecord('vampire_memories', {
        id: activeMemoryId,
        vampire_id: VAMPIRE_STATE_ID,
        name: `回忆 #${state.active_memory_ids.length + 1}`,
        experience_count: 0,
        archived_to_diary: false,
        created_at: new Date().toISOString()
      });
      state.active_memory_ids.push(activeMemoryId);

      // 回忆满时移除最早的（非日记中的）
      if (state.active_memory_ids.length > maxMemories) {
        const memories = await host.listPackCollectionRecords('vampire_memories');
        const nonArchived = state.active_memory_ids.filter((id: string) => {
          const m = memories.find((r: any) => r.id === id);
          return m && !m.archived_to_diary;
        });
        if (nonArchived.length > 0) {
          state.active_memory_ids = state.active_memory_ids.filter(
            (id: string) => id !== nonArchived[0]
          );
        }
      }
    }
  }

  // 创建经历
  const experienceId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await host.upsertPackCollectionRecord('vampire_experiences', {
    id: experienceId,
    memory_id: activeMemoryId,
    vampire_id: VAMPIRE_STATE_ID,
    content: input.response,
    created_at: new Date().toISOString()
  });

  // 更新回忆计数
  const memories = await host.listPackCollectionRecords('vampire_memories');
  activeMemory = memories.find((r: any) => r.id === activeMemoryId);
  const newCount = (activeMemory?.experience_count ?? 0) + 1;
  await host.upsertPackCollectionRecord('vampire_memories', {
    id: activeMemoryId,
    vampire_id: VAMPIRE_STATE_ID,
    name: activeMemory?.name ?? '回忆',
    experience_count: newCount,
    archived_to_diary: activeMemory?.archived_to_diary ?? false,
    created_at: activeMemory?.created_at ?? new Date().toISOString()
  });

  // 更新编年史条目（promptId 现在是 chronicleId）
  if (input.promptId) {
    const chronicleRecords = await host.listPackCollectionRecords('chronicle_entries');
    const entry = chronicleRecords.find((r: any) => r.id === input.promptId);
    if (entry) {
      await host.upsertPackCollectionRecord('chronicle_entries', {
        ...entry,
        memory_id: activeMemoryId,
        experience_id: experienceId,
        response_content: input.response
      });
    }
  }

  await saveVampireState(host, state);

  return {
    success: true,
    data: {
      intent_id: `respond_${Date.now()}`,
      experienceId,
      memoryId: activeMemoryId,
      experienceCount: newCount
    }
  };
}

// ── invoke.create_memory ──

export async function invokeCreateMemory(payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  const input = payload as { name?: string };
  const name = input.name?.trim();
  if (!name) {
    return { success: false, error: 'name_required' };
  }

  const state = await loadVampireState(host);
  const maxMemories = (await getPackVariable(host, 'max_memories')) ?? 5;

  // 检查活跃回忆是否已达上限
  if (state.active_memory_ids.length >= maxMemories) {
    return { success: false, error: 'max_memories_reached' };
  }

  const memoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await host.upsertPackCollectionRecord('vampire_memories', {
    id: memoryId,
    vampire_id: VAMPIRE_STATE_ID,
    name: name.slice(0, 50),
    experience_count: 0,
    archived_to_diary: false,
    created_at: new Date().toISOString()
  });

  state.active_memory_ids.push(memoryId);
  await saveVampireState(host, state);

  return {
    success: true,
    data: {
      memory_id: memoryId,
      name: name.slice(0, 50)
    }
  };
}


// ── invoke.character_creation ──

export async function invokeCharacterCreation(payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  const input = payload as { formData?: Record<string, unknown> };
  if (!input.formData) {
    return { success: false, error: 'formData_required' };
  }

  // 如果已有角色数据，允许覆盖重建（重置流程会先清空 state）
  const existingState = await loadVampireState(host);

  const fd = input.formData;
  const state = defaultVampireState();

  const filterEmpty = (arr: unknown): string[] =>
    Array.isArray(arr) ? arr.map((s: unknown) => String(s).trim()).filter((s: string) => s.length > 0) : [];

  // 1. 身份信息
  state.mortal_name = (fd.mortalName as string)?.trim() || null;
  state.current_alias = state.mortal_name;

  // 外观描述
  if (Array.isArray(fd.appearance)) {
    state.appearance = filterEmpty(fd.appearance);
  }

  // 2. 技艺
  const rawSkills = Array.isArray(fd.skills) ? fd.skills : []
  state.skills = rawSkills
    .filter((item: unknown) => isRecord(item) && typeof item.name === 'string' && item.name.trim().length > 0)
    .map((item: Record<string, unknown>) => ({
      id: `skill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: (item.name as string).trim(),
      description: typeof item.description === 'string' ? item.description.trim() : '',
      tested: false
    }));

  // 3. 资源
  const rawResources = Array.isArray(fd.resources) ? fd.resources : []
  state.resources = rawResources
    .filter((item: unknown) => isRecord(item) && typeof item.name === 'string' && item.name.trim().length > 0)
    .map((item: Record<string, unknown>) => ({
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: (item.name as string).trim(),
      description: typeof item.description === 'string' ? item.description.trim() : '',
      lost: false,
      kind: 'generic' as const
    }));

  // 4. 印记
  const markName = typeof fd.markName === 'string' ? fd.markName.trim() : '';
  if (markName) {
    state.marks = [{
      id: `mark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: markName,
      description: typeof fd.markDescription === 'string' ? fd.markDescription.trim() : ''
    }];
  }

  // 5. 凡人角色
  if (Array.isArray(fd.mortalCharacters)) {
    for (const char of fd.mortalCharacters as Array<{ name?: string; description?: string }>) {
      const name = (char.name || '').trim();
      const desc = (char.description || '').trim();
      if (!name && !desc) continue;
      const charId = `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await host.upsertPackCollectionRecord('vampire_characters', {
        id: charId,
        name: name || '无名',
        description: desc,
        kind: 'mortal',
        alive: true
      });
      state.character_ids.push(charId);
    }
  }

  // 6. 不朽者角色
  const immortalName = (fd.immortalName as string)?.trim();
  const immortalDesc = (fd.immortalDescription as string)?.trim();
  if (immortalName || immortalDesc) {
    const charId = `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await host.upsertPackCollectionRecord('vampire_characters', {
      id: charId,
      name: immortalName || '无名不朽者',
      description: immortalDesc || '',
      kind: 'immortal',
      alive: true
    });
    state.character_ids.push(charId);
  }

  // 7. 经历和回忆
  // 7a. 单文本域 → 各自独立回忆
  const singleExperienceSources: string[] = [
    fd.preVampireExperience as string,
    fd.turningExperience as string,
  ].filter((s: string | undefined): s is string => typeof s === 'string' && s.trim().length > 0);

  for (const content of singleExperienceSources) {
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const memoryName = content === fd.preVampireExperience
      ? '成为吸血鬼之前'
      : '变为吸血鬼';
    await host.upsertPackCollectionRecord('vampire_memories', {
      id: memoryId,
      vampire_id: VAMPIRE_STATE_ID,
      name: memoryName,
      experience_count: 1,
      archived_to_diary: false,
      created_at: new Date().toISOString()
    });
    state.active_memory_ids.push(memoryId);

    await host.upsertPackCollectionRecord('vampire_experiences', {
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      memory_id: memoryId,
      vampire_id: VAMPIRE_STATE_ID,
      content,
      created_at: new Date().toISOString()
    });
  }

  // 7b. 三段经历 → 合并为一个回忆（多个经历）
  const tripleExperiences = filterEmpty(fd.experiences);
  if (tripleExperiences.length > 0) {
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await host.upsertPackCollectionRecord('vampire_memories', {
      id: memoryId,
      vampire_id: VAMPIRE_STATE_ID,
      name: '人生经历',
      experience_count: tripleExperiences.length,
      archived_to_diary: false,
      created_at: new Date().toISOString()
    });
    state.active_memory_ids.push(memoryId);

    for (const content of tripleExperiences) {
      await host.upsertPackCollectionRecord('vampire_experiences', {
        id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        memory_id: memoryId,
        vampire_id: VAMPIRE_STATE_ID,
        content,
        created_at: new Date().toISOString()
      });
    }
  }

  // 8. 更新游戏阶段
  state.game_phase = 'playing';

  // 9. 初始化提示池（打乱 + 光标居中）
  const promptRecords = await host.listPackCollectionRecords('prompt_pool');
  const positions = promptRecords.map((r: any) => r.position as number);
  state.prompt_order = shuffle(positions);
  state.prompt_cursor = Math.floor(positions.length / 2);
  state.dice_roll_count = 0;
  await saveVampireState(host, state);

  return {
    success: true,
    data: {
      intent_id: `cc_${Date.now()}`,
      state
    }
  };
}

// ── invoke.archive_memory ──

export async function invokeArchiveMemory(payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  const input = payload as { memoryId?: string };
  if (!input.memoryId) {
    return { success: false, error: 'memoryId_required' };
  }

  const state = await loadVampireState(host);
  const maxDiary = (await getPackVariable(host, 'max_diary_memories')) ?? 4;

  // 检查日记容量
  const allMemories = await host.listPackCollectionRecords('vampire_memories');
  const archivedCount = allMemories.filter((m: any) => m.archived_to_diary).length;
  if (archivedCount >= maxDiary) {
    return { success: false, error: 'diary_full' };
  }

  // 查找目标回忆
  const memory = allMemories.find((m: any) => m.id === input.memoryId);
  if (!memory) {
    return { success: false, error: 'memory_not_found' };
  }
  if (memory.archived_to_diary) {
    return { success: false, error: 'already_archived' };
  }

  // 归档：更新 DB 记录
  await host.upsertPackCollectionRecord('vampire_memories', {
    ...memory,
    archived_to_diary: true
  });

  // 从活跃列表中移除
  state.active_memory_ids = state.active_memory_ids.filter((id: string) => id !== input.memoryId);
  await saveVampireState(host, state);

  return {
    success: true,
    data: { memoryId: input.memoryId, archived: true }
  };
}

// ── invoke.delete_memory ──

export async function invokeDeleteMemory(payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  const input = payload as { memoryId?: string };
  if (!input.memoryId) {
    return { success: false, error: 'memoryId_required' };
  }

  const state = await loadVampireState(host);

  // 查找目标回忆
  const allMemories = await host.listPackCollectionRecords('vampire_memories');
  const memory = allMemories.find((m: any) => m.id === input.memoryId);
  if (!memory) {
    return { success: false, error: 'memory_not_found' };
  }

  // 删除关联经历
  const allExperiences = await host.listPackCollectionRecords('vampire_experiences');
  for (const exp of allExperiences.filter((e: any) => e.memory_id === input.memoryId)) {
    await host.deletePackCollectionRecord('vampire_experiences', exp.id);
  }

  // 从 active_memory_ids 中移除
  state.active_memory_ids = state.active_memory_ids.filter((id: string) => id !== input.memoryId);
  await saveVampireState(host, state);

  // 删除回忆记录
  await host.deletePackCollectionRecord('vampire_memories', input.memoryId);

  return {
    success: true,
    data: { memoryId: input.memoryId, deleted: true }
  };
}

// ── invoke.rename_memory ──

export async function invokeRenameMemory(payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  const input = payload as { memoryId?: string; name?: string };
  if (!input.memoryId || !input.name?.trim()) {
    return { success: false, error: 'memoryId_and_name_required' };
  }

  // 查找目标回忆
  const allMemories = await host.listPackCollectionRecords('vampire_memories');
  const memory = allMemories.find((m: any) => m.id === input.memoryId);
  if (!memory) {
    return { success: false, error: 'memory_not_found' };
  }

  // 更新名称
  await host.upsertPackCollectionRecord('vampire_memories', {
    ...memory,
    name: input.name.trim().slice(0, 40)
  });

  return {
    success: true,
    data: { memoryId: input.memoryId, name: input.name.trim().slice(0, 40) }
  };
}

// ── invoke.update_experience ──

export async function invokeUpdateExperience(payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  const input = payload as { experienceId?: string; content?: string };
  if (!input.experienceId || !input.content?.trim()) {
    return { success: false, error: 'experienceId_and_content_required' };
  }

  // 查找目标经历
  const allExperiences = await host.listPackCollectionRecords('vampire_experiences');
  const experience = allExperiences.find((e: any) => e.id === input.experienceId);
  if (!experience) {
    return { success: false, error: 'experience_not_found' };
  }

  // 更新内容
  await host.upsertPackCollectionRecord('vampire_experiences', {
    ...experience,
    content: input.content.trim()
  });

  return {
    success: true,
    data: { experienceId: input.experienceId, content: input.content.trim() }
  };
}

// ── invoke.delete_experience ──

export async function invokeDeleteExperience(payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  const input = payload as { experienceId?: string };
  if (!input.experienceId) {
    return { success: false, error: 'experienceId_required' };
  }

  // 查找目标经历
  const allExperiences = await host.listPackCollectionRecords('vampire_experiences');
  const experience = allExperiences.find((e: any) => e.id === input.experienceId);
  if (!experience) {
    return { success: false, error: 'experience_not_found' };
  }

  // 更新所属回忆的 experience_count
  const memoryId = experience.memory_id;
  if (memoryId) {
    const allMemories = await host.listPackCollectionRecords('vampire_memories');
    const memory = allMemories.find((m: any) => m.id === memoryId);
    if (memory) {
      await host.upsertPackCollectionRecord('vampire_memories', {
        ...memory,
        experience_count: Math.max(0, (memory.experience_count ?? 1) - 1)
      });
    }
  }

  // 删除经历
  await host.deletePackCollectionRecord('vampire_experiences', input.experienceId);

  return {
    success: true,
    data: { experienceId: input.experienceId, deleted: true }
  };
}

// ── invoke.reset_game ──

export async function invokeResetGame(_payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  // 重置状态为初始值（保留日记 ID）
  const resetState = defaultVampireState();
  await saveVampireState(host, resetState);

  // 清除所有游戏数据集合
  // 注意：各集合主键不同，prompt_pool 用 position，其余用 id
  const collections: Array<[string, string]> = [
    ['prompt_pool', 'position'],
    ['chronicle_entries', 'id'],
    ['vampire_memories', 'id'],
    ['vampire_experiences', 'id'],
    ['vampire_characters', 'id'],
    ['vampire_aliases', 'id'],
  ];
  for (const [col, pkField] of collections) {
    const records = await host.listPackCollectionRecords(col);
    for (const record of records) {
      await host.deletePackCollectionRecord(col, String(record[pkField]));
    }
  }

  return {
    success: true,
    data: { game_phase: 'uninitialized' }
  };
}

// ── invoke.update_state_fields ──

const ALLOWED_STATE_FIELDS = new Set(['skills', 'resources', 'marks', 'diary_id']);

export async function invokeUpdateStateFields(payload: unknown): Promise<Record<string, unknown>> {
  const host = getHost();
  if (!host) return { success: false, error: 'host_not_available' };

  const input = payload as Record<string, unknown>;
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'invalid_payload' };
  }

  const fields = input.fields as Record<string, unknown> | undefined;
  if (!fields || typeof fields !== 'object') {
    return { success: false, error: 'fields_required' };
  }

  // 只允许白名单内的字段
  const keysToPatch = Object.keys(fields).filter(k => ALLOWED_STATE_FIELDS.has(k));
  if (keysToPatch.length === 0) {
    return { success: false, error: 'no_valid_fields' };
  }

  const state = await loadVampireState(host);

  for (const key of keysToPatch) {
    (state as any)[key] = fields[key];
  }

  await saveVampireState(host, state);

  return {
    success: true,
    data: { updated_fields: keysToPatch }
  };
}
