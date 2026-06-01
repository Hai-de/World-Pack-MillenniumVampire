// 千年吸血鬼核心逻辑插件
// 运行在 Worker 线程中，通过 ServerPluginHostApi 与主机通信
//
// 职责：
//   - perceive.* 查询处理器 (5 个)
//   - invoke.* 动作处理器 (3 个新增 + 保留原有逻辑)
//   - 替代规则评估
//   - 提示池管理（种子 + 补充）
//   - 行为树 callHandler (process_turn / process_demise)
//   - 记忆衰减 DataCleaner

// ── 类型定义 ──

interface VampireSkill {
  name: string;
  tested: boolean;
  linked_memory_id?: string;
}

interface VampireResource {
  name: string;
  description: string;
  lost: boolean;
  kind?: 'generic' | 'diary';
}

interface VampireMark {
  name: string;
  description: string;
}

interface VampireState {
  mortal_name: string | null;
  born_era: string | null;
  turned_era: string | null;
  current_alias: string | null;
  skills: VampireSkill[];
  resources: VampireResource[];
  marks: VampireMark[];
  active_memory_ids: string[];
  diary_id: string | null;
  prompt_pool_position: number;
  consumed_prompt_count: number;
  game_phase: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ── 状态读写 ──

const VAMPIRE_STATE_ID = 'actor_vampire';
const DIARY_ID = 'artifact_diary';

async function loadVampireState(host: any): Promise<VampireState> {
  const records = await host.listPackCollectionRecords('vampire_state');
  const record = records.find((r: any) => r.id === VAMPIRE_STATE_ID);
  if (record && isRecord(record.state_json)) {
    return record.state_json as unknown as VampireState;
  }
  return defaultVampireState();
}

function defaultVampireState(): VampireState {
  return {
    mortal_name: null,
    born_era: null,
    turned_era: null,
    current_alias: null,
    skills: [],
    resources: [],
    marks: [],
    active_memory_ids: [],
    diary_id: DIARY_ID,
    prompt_pool_position: 0,
    consumed_prompt_count: 0,
    game_phase: 'uninitialized'
  };
}

async function saveVampireState(host: any, state: VampireState): Promise<void> {
  await host.upsertPackCollectionRecord('vampire_state', {
    id: VAMPIRE_STATE_ID,
    state_json: state,
    updated_at: new Date().toISOString()
  });
}

// ── 配置变量读取 ──

const DEFAULT_VARIABLES: Record<string, number> = {
  prompt_pool_capacity: 100,
  prompt_replenish_threshold: 45,
  max_memories: 5,
  max_experiences_per_memory: 3,
  max_diary_memories: 4
};

async function getPackVariable(host: any, key: string): Promise<number | null> {
  return DEFAULT_VARIABLES[key] ?? null;
}

// ── 骰子 ──

function rollD10(): number {
  return Math.floor(Math.random() * 10) + 1;
}

function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// ── perceive.current_prompt ──

async function perceiveCurrentPrompt(_payload: unknown): Promise<Record<string, unknown>> {
  const host = (globalThis as any).__vampire_host;
  if (!host) return { success: false, error: 'host_not_available' };

  const state = await loadVampireState(host);
  const records = await host.listPackCollectionRecords('prompt_pool');
  const unconsumed = records
    .filter((r: any) => !r.consumed)
    .sort((a: any, b: any) => a.position - b.position);

  if (unconsumed.length === 0) {
    return { success: true, data: null };
  }

  // 找到当前位置或最近的未消费提示
  const prompt = unconsumed.find((r: any) => r.position >= state.prompt_pool_position)
    ?? unconsumed[0];

  if (!prompt) {
    return { success: true, data: null };
  }

  return {
    success: true,
    data: {
      id: String(prompt.position),
      content: prompt.content,
      position: prompt.position
    }
  };
}

// ── perceive.character_state ──

async function perceiveCharacterState(_payload: unknown): Promise<Record<string, unknown>> {
  const host = (globalThis as any).__vampire_host;
  if (!host) return { success: false, error: 'host_not_available' };

  const state = await loadVampireState(host);

  // 加载回忆
  const memories = await host.listPackCollectionRecords('vampire_memories');
  const experiences = await host.listPackCollectionRecords('vampire_experiences');
  const characters = await host.listPackCollectionRecords('vampire_characters');

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
      diary: {
        id: DIARY_ID,
        holder: VAMPIRE_STATE_ID,
        memory_ids: memories.filter((m: any) => m.archived_to_diary).map((m: any) => m.id),
        max_capacity: (await getPackVariable(host, 'max_diary_memories')) ?? 4,
        lost: false,
        entry_count: memories.filter((m: any) => m.archived_to_diary).length
      },
      active_memory_ids: state.active_memory_ids,
      game_phase: state.game_phase,
      prompt_pool_position: state.prompt_pool_position,
      consumed_prompt_count: state.consumed_prompt_count
    }
  };
}

// ── perceive.diary_entries ──

async function perceiveDiaryEntries(_payload: unknown): Promise<Record<string, unknown>> {
  const host = (globalThis as any).__vampire_host;
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

async function perceiveChronicle(_payload: unknown): Promise<Record<string, unknown>> {
  const host = (globalThis as any).__vampire_host;
  if (!host) return { success: false, error: 'host_not_available' };

  const records = await host.listPackCollectionRecords('prompt_pool');
  const consumed = records
    .filter((r: any) => r.consumed)
    .sort((a: any, b: any) => (b.consumed_at ?? '').localeCompare(a.consumed_at ?? ''));

  return {
    success: true,
    data: {
      records: consumed.map((r: any) => ({
        id: String(r.position),
        tick: r.position,
        diceResult: r.dice_result ?? '?',
        prompt: r.content,
        memoryId: r.memory_id ?? null,
        diaryEntryId: r.diary_entry_id ?? null,
        consumedAt: r.consumed_at
      }))
    }
  };
}

// ── perceive.full_state_snapshot ──

async function perceiveFullStateSnapshot(_payload: unknown): Promise<Record<string, unknown>> {
  const host = (globalThis as any).__vampire_host;
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

// ── invoke.roll_dice ──

async function invokeRollDice(_payload: unknown): Promise<Record<string, unknown>> {
  const host = (globalThis as any).__vampire_host;
  if (!host) return { success: false, error: 'host_not_available' };

  const state = await loadVampireState(host);

  const d10 = rollD10();
  const d6 = rollD6();
  const total = d10 - d6;
  const capacity = (await getPackVariable(host, 'prompt_pool_capacity')) ?? 100;

  const oldPosition = state.prompt_pool_position;
  let newPosition = oldPosition + total;
  if (newPosition < 0) newPosition = 0;
  if (newPosition >= capacity) newPosition = capacity - 1;

  // 标记已过的提示为 consumed
  const records = await host.listPackCollectionRecords('prompt_pool');
  const from = Math.min(oldPosition, newPosition);
  const to = Math.max(oldPosition, newPosition);

  for (const r of records) {
    const pos = r.position as number;
    if (pos >= from && pos <= to && !r.consumed) {
      await host.upsertPackCollectionRecord('prompt_pool', {
        ...r,
        consumed: true,
        consumed_at: new Date().toISOString(),
        dice_result: `${d10}-${d6}=${total}`
      });
      state.consumed_prompt_count++;
    }
  }

  state.prompt_pool_position = newPosition;
  await saveVampireState(host, state);

  return {
    success: true,
    data: {
      intent_id: `roll_${Date.now()}`,
      d10,
      d6,
      total,
      newPosition
    }
  };
}

// ── invoke.respond_to_prompt ──

async function invokeRespondToPrompt(payload: unknown): Promise<Record<string, unknown>> {
  const host = (globalThis as any).__vampire_host;
  if (!host) return { success: false, error: 'host_not_available' };

  const input = payload as {
    promptId?: string;
    response?: string;
    mode?: string;
  };

  if (!input.response) {
    return { success: false, error: 'response_required' };
  }

  const state = await loadVampireState(host);
  const maxExperiences = (await getPackVariable(host, 'max_experiences_per_memory')) ?? 3;
  const maxMemories = (await getPackVariable(host, 'max_memories')) ?? 5;

  // 找到或创建当前活跃记忆
  let activeMemoryId = state.active_memory_ids[state.active_memory_ids.length - 1];
  let activeMemory: any = null;

  if (activeMemoryId) {
    const records = await host.listPackCollectionRecords('vampire_memories');
    activeMemory = records.find((r: any) => r.id === activeMemoryId);
  }

  if (!activeMemory || (activeMemory.experience_count ?? 0) >= maxExperiences) {
    // 创建新记忆
    activeMemoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await host.upsertPackCollectionRecord('vampire_memories', {
      id: activeMemoryId,
      vampire_id: VAMPIRE_STATE_ID,
      name: `记忆 #${state.active_memory_ids.length + 1}`,
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

  // 创建经历
  const experienceId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await host.upsertPackCollectionRecord('vampire_experiences', {
    id: experienceId,
    memory_id: activeMemoryId,
    vampire_id: VAMPIRE_STATE_ID,
    content: input.response,
    created_at: new Date().toISOString()
  });

  // 更新记忆计数
  const memories = await host.listPackCollectionRecords('vampire_memories');
  activeMemory = memories.find((r: any) => r.id === activeMemoryId);
  const newCount = (activeMemory?.experience_count ?? 0) + 1;
  await host.upsertPackCollectionRecord('vampire_memories', {
    id: activeMemoryId,
    vampire_id: VAMPIRE_STATE_ID,
    name: activeMemory?.name ?? '记忆',
    experience_count: newCount,
    archived_to_diary: activeMemory?.archived_to_diary ?? false,
    created_at: activeMemory?.created_at ?? new Date().toISOString()
  });

  // 标记当前提示为已消费
  if (input.promptId) {
    const poolRecords = await host.listPackCollectionRecords('prompt_pool');
    const prompt = poolRecords.find(
      (r: any) => String(r.position) === input.promptId && !r.consumed
    );
    if (prompt) {
      await host.upsertPackCollectionRecord('prompt_pool', {
        ...prompt,
        consumed: true,
        consumed_at: new Date().toISOString(),
        memory_id: activeMemoryId
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

// ── invoke.character_creation ──

async function invokeCharacterCreation(payload: unknown): Promise<Record<string, unknown>> {
  const host = (globalThis as any).__vampire_host;
  if (!host) return { success: false, error: 'host_not_available' };

  const input = payload as { formData?: Record<string, string> };
  if (!input.formData) {
    return { success: false, error: 'formData_required' };
  }

  const fd = input.formData;
  const state = defaultVampireState();

  // 1. 身份信息
  state.mortal_name = fd.name || null;
  state.current_alias = fd.name || null;

  // 2. 解析技艺（按行分割）
  if (fd.skills) {
    state.skills = fd.skills
      .split(/[\n,、]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)
      .map((name: string) => ({
        name,
        tested: false
      }));
  }

  // 3. 解析资源
  if (fd.resources) {
    state.resources = fd.resources
      .split(/[\n,、]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)
      .map((name: string) => ({
        name,
        description: '',
        lost: false,
        kind: 'generic' as const
      }));
  }

  // 4. 解析印记
  if (fd.mark) {
    state.marks = fd.mark
      .split(/[\n,、]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)
      .map((name: string) => ({
        name,
        description: ''
      }));
  }

  // 5. 创建凡人角色
  if (fd.mortalCharacters) {
    const charLines = fd.mortalCharacters
      .split('\n')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    for (const line of charLines) {
      const match = line.match(/^[\d.]*\s*([^\s—–-]+)\s*[—–-]\s*(.+)/);
      const name = match ? match[1] : line.slice(0, 20);
      const desc = match ? match[2] : '';
      await host.upsertPackCollectionRecord('vampire_characters', {
        id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        description: desc,
        kind: 'mortal',
        alive: true
      });
    }
  }

  // 6. 创建不朽者角色
  if (fd.immortalCharacter) {
    const line = fd.immortalCharacter.trim();
    const match = line.match(/^[\d.]*\s*([^\s—–-]+)\s*[—–-]\s*(.+)/);
    const name = match ? match[1] : line.slice(0, 20);
    const desc = match ? match[2] : '';
    await host.upsertPackCollectionRecord('vampire_characters', {
      id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      description: desc,
      kind: 'immortal',
      alive: true
    });
  }

  // 7. 创建经历和回忆
  const experienceSources = [
    fd.preVampireExperience,
    fd.turningExperience,
    fd.experiences
  ].filter(Boolean);

  for (const content of experienceSources) {
    if (!content) continue;

    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await host.upsertPackCollectionRecord('vampire_memories', {
      id: memoryId,
      vampire_id: VAMPIRE_STATE_ID,
      name: `记忆 #${state.active_memory_ids.length + 1}`,
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

  // 8. 添加日记为特殊资源
  state.resources.push({
    name: '吸血鬼日记',
    description: '记录你漫长生命的日记本',
    lost: false,
    kind: 'diary'
  });
  state.diary_id = DIARY_ID;

  // 9. 更新游戏阶段
  state.game_phase = 'playing';

  // 10. 保存状态
  state.prompt_pool_position = 0;
  await saveVampireState(host, state);

  return {
    success: true,
    data: {
      intent_id: `cc_${Date.now()}`,
      state
    }
  };
}

// ── 替代规则 ──

interface SubstitutionResult {
  action_type: string;
  target_ref: unknown;
  payload: Record<string, unknown>;
  reasoning: string;
  confidence: number;
}

function checkSubstitution(
  state: VampireState,
  requiredSkillName?: string
): {
  result: 'test_skill' | 'lose_resource' | 'demise';
  skillName?: string;
  resourceName?: string;
} {
  if (requiredSkillName) {
    const skill = state.skills.find(
      s => s.name === requiredSkillName && !s.tested
    );
    if (skill) return { result: 'test_skill', skillName: skill.name };

    const availableResource = state.resources.find(r => !r.lost);
    if (availableResource)
      return { result: 'lose_resource', resourceName: availableResource.name };

    return { result: 'demise' };
  }

  const availableResource = state.resources.find(r => !r.lost);
  if (availableResource)
    return { result: 'lose_resource', resourceName: availableResource.name };

  const untestedSkill = state.skills.find(s => !s.tested);
  if (untestedSkill)
    return { result: 'test_skill', skillName: untestedSkill.name };

  return { result: 'demise' };
}

function applySubstitution(
  state: VampireState,
  substitution: ReturnType<typeof checkSubstitution>
): void {
  switch (substitution.result) {
    case 'test_skill': {
      const skill = state.skills.find(
        s => s.name === substitution.skillName
      );
      if (skill) skill.tested = true;
      break;
    }
    case 'lose_resource': {
      const resource = state.resources.find(
        r => r.name === substitution.resourceName
      );
      if (resource) resource.lost = true;
      break;
    }
  }
}

// ── 叙事生成 ──

async function generateNarrative(
  host: any,
  prompt: string,
  state: VampireState,
  substitution: ReturnType<typeof checkSubstitution>
): Promise<string> {
  const substitutionDesc =
    substitution.result === 'test_skill'
      ? `检验技艺: ${substitution.skillName}`
      : substitution.result === 'lose_resource'
        ? `失去资源: ${substitution.resourceName}`
        : '';

  const systemPrompt = `你是一名活了一千年的吸血鬼，正在用第一人称写日记。
你的技艺: ${state.skills.map(s => `${s.name}(${s.tested ? '已检验' : '未检验'})`).join('、') || '无'}
你的资源: ${state.resources.map(r => `${r.name}${r.lost ? '(已失去)' : ''}`).join('、') || '无'}
你的印记: ${state.marks.map(m => m.name).join('、') || '无'}
当前别名: ${state.current_alias || '未知'}
${substitutionDesc ? `本回合机械结果: ${substitutionDesc}` : ''}

用简洁、诗意的语言回应。不必回答所有问题，自然地将提示融入叙事。`;

  try {
    const result = await host.requestInference({
      purpose: 'narrative_response',
      systemPrompt,
      userPrompt: prompt,
      maxTokens: 1024
    });
    return result.content;
  } catch {
    return `[无法生成叙事回应] 面对 "${prompt.slice(0, 100)}..." ，吸血鬼陷入了沉默。`;
  }
}

// ── Handler: process_turn (行为树 callHandler) ──

async function processTurn(payload: unknown): Promise<SubstitutionResult> {
  const host = (globalThis as any).__vampire_host;
  if (!host) {
    return {
      action_type: 'idle',
      target_ref: null,
      payload: { reason: 'host_not_available' },
      reasoning: 'Plugin host API not available',
      confidence: 0
    };
  }

  const state = await loadVampireState(host);

  // 1. 获取当前提示
  const records = await host.listPackCollectionRecords('prompt_pool');
  const unconsumed = records
    .filter((r: any) => !r.consumed)
    .sort((a: any, b: any) => a.position - b.position);

  const prompt = unconsumed.find(
    (r: any) => r.position >= state.prompt_pool_position
  );

  if (!prompt) {
    return {
      action_type: 'idle',
      target_ref: null,
      payload: { reason: 'no_prompts_available' },
      reasoning: '提示池为空，等待补充',
      confidence: 0
    };
  }

  // 2. 检查替代规则
  const substitution = checkSubstitution(state);

  // 3. 生成叙事
  const narrative = await generateNarrative(host, prompt.content, state, substitution);

  // 4. 应用机械结果
  applySubstitution(state, substitution);

  // 5. 保存状态
  await saveVampireState(host, state);

  // 6. 记录经历
  const maxExperiences = (await getPackVariable(host, 'max_experiences_per_memory')) ?? 3;
  const maxMemories = (await getPackVariable(host, 'max_memories')) ?? 5;

  let activeMemoryId = state.active_memory_ids[state.active_memory_ids.length - 1];
  let activeMemory: any = null;

  if (activeMemoryId) {
    const memRecords = await host.listPackCollectionRecords('vampire_memories');
    activeMemory = memRecords.find((r: any) => r.id === activeMemoryId);
  }

  if (!activeMemory || (activeMemory.experience_count ?? 0) >= maxExperiences) {
    activeMemoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await host.upsertPackCollectionRecord('vampire_memories', {
      id: activeMemoryId,
      vampire_id: VAMPIRE_STATE_ID,
      name: `记忆 #${state.active_memory_ids.length + 1}`,
      experience_count: 0,
      archived_to_diary: false,
      created_at: new Date().toISOString()
    });
    state.active_memory_ids.push(activeMemoryId);

    if (state.active_memory_ids.length > maxMemories) {
      const memRecords = await host.listPackCollectionRecords('vampire_memories');
      const nonArchived = state.active_memory_ids.filter((id: string) => {
        const m = memRecords.find((r: any) => r.id === id);
        return m && !m.archived_to_diary;
      });
      if (nonArchived.length > 0) {
        state.active_memory_ids = state.active_memory_ids.filter(
          (id: string) => id !== nonArchived[0]
        );
      }
    }
  }

  const experienceId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await host.upsertPackCollectionRecord('vampire_experiences', {
    id: experienceId,
    memory_id: activeMemoryId,
    vampire_id: VAMPIRE_STATE_ID,
    content: narrative,
    created_at: new Date().toISOString()
  });

  const memRecords = await host.listPackCollectionRecords('vampire_memories');
  activeMemory = memRecords.find((r: any) => r.id === activeMemoryId);
  const newCount = (activeMemory?.experience_count ?? 0) + 1;
  await host.upsertPackCollectionRecord('vampire_memories', {
    id: activeMemoryId,
    vampire_id: VAMPIRE_STATE_ID,
    name: activeMemory?.name ?? '记忆',
    experience_count: newCount,
    archived_to_diary: activeMemory?.archived_to_diary ?? false,
    created_at: activeMemory?.created_at ?? new Date().toISOString()
  });

  await saveVampireState(host, state);

  return {
    action_type: 'narrative_response',
    target_ref: { entity_id: VAMPIRE_STATE_ID, kind: 'actor' },
    payload: {
      prompt: prompt.content,
      narrative,
      substitution: substitution.result,
      dice_result: null
    },
    reasoning: narrative.slice(0, 500),
    confidence: 0.8
  };
}

// ── Handler: process_demise (行为树 callHandler) ──

async function processDemise(_payload: unknown): Promise<SubstitutionResult> {
  const host = (globalThis as any).__vampire_host;
  if (!host) {
    return {
      action_type: 'idle',
      target_ref: null,
      payload: { reason: 'host_not_available' },
      reasoning: 'Plugin host API not available',
      confidence: 0
    };
  }

  const state = await loadVampireState(host);

  const narrative = await generateNarrative(
    host,
    '技艺与资源双双枯竭，吸血鬼迎来了最终的消亡。描述你的终结。',
    state,
    { result: 'demise' }
  );

  state.game_phase = 'ended';
  await saveVampireState(host, state);

  return {
    action_type: 'demise',
    target_ref: { entity_id: VAMPIRE_STATE_ID, kind: 'actor' },
    payload: {
      narrative,
      final_state: state
    },
    reasoning: narrative.slice(0, 500),
    confidence: 1.0
  };
}

// ── RuleContributor ──

async function contributeExecution(
  input: unknown,
  _context: unknown
): Promise<unknown> {
  const host = (globalThis as any).__vampire_host;
  if (!host) return null;

  const req = input as { rule_id: string };
  const state = await loadVampireState(host);

  switch (req.rule_id) {
    case 'rule_skill_substitution': {
      const hasSkill = state.skills.length > 0;
      const hasResource = state.resources.some(r => !r.lost);
      return {
        rule_id: req.rule_id,
        mutations: [],
        emitted_events: [],
        diagnostics: {
          no_match_reason: hasSkill
            ? null
            : hasResource
              ? 'skill_unavailable_resource_fallback'
              : 'both_depleted',
          evaluated_rule_count: 1
        }
      };
    }
    case 'rule_resource_substitution': {
      const hasResource = state.resources.some(r => !r.lost);
      const hasUntestedSkill = state.skills.some(s => !s.tested);
      return {
        rule_id: req.rule_id,
        mutations: [],
        emitted_events: [],
        diagnostics: {
          no_match_reason: hasResource
            ? null
            : hasUntestedSkill
              ? 'resource_unavailable_skill_fallback'
              : 'both_depleted',
          evaluated_rule_count: 1
        }
      };
    }
    case 'rule_demise': {
      const hasSkill = state.skills.some(s => !s.tested);
      const hasResource = state.resources.some(r => !r.lost);
      return {
        rule_id: req.rule_id,
        mutations: [],
        emitted_events: [],
        diagnostics: {
          no_match_reason:
            !hasSkill && !hasResource ? 'both_depleted' : null,
          evaluated_rule_count: 1
        }
      };
    }
    default:
      return null;
  }
}

// ── LoopHook: 提示池补充 ──

async function replenishPromptPool(_ctx: Record<string, unknown>): Promise<void> {
  const host = (globalThis as any).__vampire_host;
  if (!host) return;

  const state = await loadVampireState(host);
  const threshold = (await getPackVariable(host, 'prompt_replenish_threshold')) ?? 45;
  const capacity = (await getPackVariable(host, 'prompt_pool_capacity')) ?? 100;

  if (state.consumed_prompt_count < threshold) return;

  const records = await host.listPackCollectionRecords('prompt_pool');
  const consumedCount = records.filter((r: any) => r.consumed).length;
  const totalCount = records.length;
  const emptySlots = capacity - (totalCount - consumedCount);

  if (emptySlots <= 0) return;

  const countToGenerate = Math.min(emptySlots, 10);
  try {
    const result = await host.requestInference({
      purpose: 'prompt_generation',
      systemPrompt: `你是一个吸血鬼叙事游戏的提示生成器。
根据以下风格示例，生成 ${countToGenerate} 条新的游戏提示：

示例:
- "新的法律和社会习俗让你更难藏身于人群之中，你几乎被捕，险些丧命的过程是怎么样的？检验一项技艺，创造一项技艺，创造一个为你提供帮助的罪犯凡俗生物。"
- "因为对鲜血的渴望，你杀死了身边的某个人。杀死一个凡俗生物，如果没有可用角色，那就创造一个凡俗生物再杀死。获得技艺：嗜血。"
- "你被某个与你相仿的生物认了出来。创造一个不朽生物，失去一种资源，并获得一项技艺。"
- "夜晚的星辰如风车轮转，季节的变换如白驹过隙，一个世纪过去了。划掉一段回忆，划掉所有凡俗生物。"

要求：
- 每条提示需包含至少一个机械操作（检验技艺/失去资源/创建角色/获得印记/划掉回忆等）
- 提示之间保持主题多样性
- 使用简洁直白的语言
- 每条提示占一行，用 "---" 分隔`,
      userPrompt: `生成 ${countToGenerate} 条吸血鬼叙事游戏提示`,
      maxTokens: 2048
    });

    const prompts = result.content
      .split('---')
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 10);

    const nextPosition = totalCount;
    for (let i = 0; i < prompts.length; i++) {
      await host.upsertPackCollectionRecord('prompt_pool', {
        position: nextPosition + i,
        content: prompts[i],
        consumed: false
      });
    }

    state.consumed_prompt_count = 0;
    await saveVampireState(host, state);
  } catch {
    // AI 调用失败，静默跳过本 tick
  }
}

// ── DataCleaner: 记忆衰减 ──

async function memoryDecay(input: {
  text: string;
  options?: Record<string, unknown>;
}): Promise<{ cleaned: string; metadata: Record<string, unknown> }> {
  return {
    cleaned: input.text,
    metadata: { memory_decay_applied: false }
  };
}

// ── 种子提示池 ──

async function seedPromptPool(host: any): Promise<void> {
  const records = await host.listPackCollectionRecords('prompt_pool');
  if (records.length > 0) return;

  const seedPrompts = [
    '新的法律和社会习俗让你更难藏身于人群之中。你几乎被捕，险些丧命的过程是怎么样的？检验一项技艺，创造一项技艺，创造一个为你提供帮助的罪犯凡俗生物。',
    '当太阳升起时，你被困在外面，躲在一个你未曾预料的地方。一个孩子发现了你并与你成为朋友。创建一个凡人儿童角色并记录一次人性化的经历。',
    '因为对鲜血的渴望，你杀死了身边的某个人。杀死一个凡俗生物，如果没有可用角色，那就创造一个凡俗生物再杀死。获得技艺：嗜血。',
    '某个凡俗生物开始侍奉你。那是怎么样的人？为何被你吸引？创造一个新的凡俗生物。',
    '某个值得信赖的凡俗生物以令人震惊的方式背叛了你。失去一种资源，这个人为什么要这么做？你为什么选择宽恕？',
    '某个凡俗生物为了救你牺牲了自己。检验一项技艺，获得一项与爱或信任相关的技艺。',
    '同一个家族的几代人为你服务。这条血脉从任何活着的凡人角色开始，或者从死去的凡人角色的后代开始。她们为自己的服务指定了哪些奇怪的仪式？失去一项资源并创建一个仆从家族资源。',
    '你被某个与你相仿的生物认了出来。创造一个不朽生物，失去一种资源，并获得一项技艺。你会为此失去什么？',
    '夜晚的星辰如风车轮转，季节的变换如白驹过隙，一个世纪过去了。划掉一段回忆，划掉所有凡俗生物。',
    '岁月侵蚀了你的日记。从日记中最早的记忆开始，遗忘其中三个名词。'
  ];

  for (let i = 0; i < seedPrompts.length; i++) {
    await host.upsertPackCollectionRecord('prompt_pool', {
      position: i,
      content: seedPrompts[i],
      consumed: false
    });
  }

  const state = defaultVampireState();
  state.prompt_pool_position = 0;
  state.game_phase = 'uninitialized';
  await saveVampireState(host, state);
}

// ── 激活入口 ──

export function activate(host: any): void {
  // 保存 host 引用供 handler 使用
  (globalThis as any).__vampire_host = host;

  // ── perceive 查询处理器 ──
  host.registerHandler('perceive.current_prompt', perceiveCurrentPrompt);
  host.registerHandler('perceive.character_state', perceiveCharacterState);
  host.registerHandler('perceive.diary_entries', perceiveDiaryEntries);
  host.registerHandler('perceive.chronicle', perceiveChronicle);
  host.registerHandler('perceive.full_state_snapshot', perceiveFullStateSnapshot);

  // ── invoke 动作处理器 ──
  host.registerHandler('invoke.roll_dice', invokeRollDice);
  host.registerHandler('invoke.respond_to_prompt', invokeRespondToPrompt);
  host.registerHandler('invoke.character_creation', invokeCharacterCreation);

  // ── BT callHandler ──
  host.registerHandler('vampire:process_turn', processTurn);
  host.registerHandler('vampire:process_demise', processDemise);

  // ── RuleContributor ──
  host.registerRuleContributor({
    type: 'rule_contributor',
    name: 'vampire-substitution-rules',
    priority: 50,
    supportsRuleIds: [
      'rule_skill_substitution',
      'rule_resource_substitution',
      'rule_demise'
    ],
    invoke: 'vampire:rule_contributor',
    config: {}
  });
  host.registerHandler('vampire:rule_contributor', async (payload: unknown) => {
    const { input, context } = payload as {
      input: unknown;
      context: unknown;
    };
    return contributeExecution(input, context);
  });

  // ── LoopHook: 提示池补充 ──
  host.registerLoopHook('afterStep7', replenishPromptPool);

  // ── DataCleaner: 记忆衰减 ──
  host.registerDataCleaner({
    type: 'data_cleaner',
    name: 'vampire-memory-decay',
    key: 'data_cleaner.vampire.memory_decay',
    version: '1.0.0',
    trigger: 'on_tick',
    priority: 50,
    invoke: 'vampire:memory_decay'
  });
  host.registerHandler('vampire:memory_decay', memoryDecay);

  // 种子提示池（首次激活时）
  seedPromptPool(host);
}
