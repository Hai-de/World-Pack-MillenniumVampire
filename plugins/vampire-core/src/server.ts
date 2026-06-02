// 千年吸血鬼核心逻辑插件
// 运行在 Worker 线程中，通过 ServerPluginHostApi 与主机通信
//
// 职责：
//   - perceive.* 查询处理器 (5 个)
//   - invoke.* 动作处理器 (3 个新增 + 保留原有逻辑)
//   - 替代规则评估
//   - 提示池管理（种子 + 补充）
//   - 行为树 callHandler (process_turn / process_demise)
//   - 回忆衰减 DataCleaner

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
    const raw = record.state_json as Record<string, unknown>;
    // 向后兼容：迁移旧 state 格式（prompt_pool_position → prompt_cursor + prompt_order）
    if (raw.prompt_cursor === undefined && raw.prompt_order === undefined) {
      raw.prompt_cursor = (raw.prompt_pool_position as number) ?? 0;
      raw.prompt_order = [];
      raw.dice_roll_count = (raw.consumed_prompt_count as number) ?? 0;
    }
    return raw as unknown as VampireState;
  }
  return defaultVampireState();
}

function defaultVampireState(): VampireState {
  return {
    mortal_name: null,
    appearance: [],
    born_era: null,
    turned_era: null,
    current_alias: null,
    skills: [],
    resources: [],
    marks: [],
    active_memory_ids: [],
    character_ids: [],
    diary_id: DIARY_ID,
    prompt_cursor: 0,
    prompt_order: [],
    dice_roll_count: 0,
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

// Fisher-Yates 洗牌，返回新数组
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 确保光标落在未消费提示上（从 cursor 向两端搜索）
function clampCursorToUnconsumed(
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

// ── perceive.current_prompt ──

async function perceiveCurrentPrompt(_payload: unknown): Promise<Record<string, unknown>> {
  const host = (globalThis as any).__vampire_host;
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

async function perceiveCharacterState(_payload: unknown): Promise<Record<string, unknown>> {
  const host = (globalThis as any).__vampire_host;
  if (!host) return { success: false, error: 'host_not_available' };

  const state = await loadVampireState(host);

  // 加载回忆 — 只加载 active_memory_ids 中的回忆
  const allMemories = await host.listPackCollectionRecords('vampire_memories');
  const memories = allMemories.filter((m: any) => state.active_memory_ids.includes(m.id));
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
      prompt_cursor: state.prompt_cursor,
      prompt_order: state.prompt_order,
      dice_roll_count: state.dice_roll_count
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

  if (landingRecord) {
    // 标记落地提示为已消费
    await host.upsertPackCollectionRecord('prompt_pool', {
      position: landingPosition,
      content: landingRecord.content,
      consumed: true
    });

    // 在同位置生成替换提示（保持池大小不变）
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
        id: String(landingPosition),
        content: promptContent,
        position: landingPosition
      }
    }
  };
}

// ── 替换提示生成（静态循环，不依赖 AI） ──

const replacementPrompts = [
  '一群猎魔人追踪到了你的踪迹。你如何甩掉他们？检验一项技艺，失去一种资源。',
  '你在一个陌生的城市醒来，发现自己被埋在地下已有一个月。谁把你挖出来的？创建一个角色。',
  '月光洒在你的脸上，你感到一阵久违的平静。记录下这一刻的思绪。获得一段经历。',
  '一位陌生的访客送来了一份礼物——一瓶古老的血液。谁送的？你喝下后发生了什么？获得一项技艺。',
  '你的旧友从远方归来，但他已经不再是人类。你们之间发生了什么？创建一个不朽角色。',
  '一场大火烧毁了你的藏身之所，你失去了多年收集的宝物。失去两项资源，创建一个提供帮助的角色。',
  '你遇到了一个知道你所有秘密的凡人。她威胁要揭露你，但提出了一个交易。创建一个角色，失去一种资源。',
  '街头的流言说有一个更古老的吸血鬼来到了这座城市。你决定去拜访他。创造一个不朽角色，检验一项技艺。',
  '一个孩子在你的门前留下了一束花。这个孩子的家族曾经侍奉过你。创建一个角色，获得一种资源。',
  '你的身体突然开始衰老——只是暂时的，但足够让你恐惧。这期间发生了什么？划掉一段回忆。',
  '一只黑猫每天都来你的窗前。它似乎是某个已故老友的灵魂。记录这段奇怪的经历。获得一项技艺。',
  '你救下了一个即将被处决的女巫。她用什么报答你？创建一个角色，获得一种资源。',
  '暴风雨之夜，一个陌生人敲响了你的门。他浑身是血，声称是你杀了他。但他还活着——或者说，某种意义上的活着。创建一个角色。',
  '你在古董市场发现了一件属于你三百年前的物品。它怎么会在这里？获得一种资源。',
  '一个被遗忘的印记突然发作，让你几乎失去了控制。这个印记是什么？你如何重新掌控自己？检验一项技艺。',
];

let replacementIndex = 0;

function generateReplacementPrompt(_consumedContent: string): string {
  const prompt = replacementPrompts[replacementIndex % replacementPrompts.length];
  replacementIndex++;
  return prompt;
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

  // 找到或创建当前活跃回忆
  let activeMemoryId = state.active_memory_ids[state.active_memory_ids.length - 1];
  let activeMemory: any = null;

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
  state.skills = filterEmpty(fd.skills).map((name: string) => ({ name, tested: false }));

  // 3. 资源
  state.resources = filterEmpty(fd.resources).map((name: string) => ({
    name,
    description: '',
    lost: false,
    kind: 'generic' as const
  }));

  // 4. 印记
  const markText = (fd.mark as string)?.trim();
  if (markText) {
    state.marks = markText
      .split(/[\n,、]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)
      .map((name: string) => ({ name, description: '' }));
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

  // 10. 初始化提示池（打乱 + 光标居中）
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

async function invokeArchiveMemory(payload: unknown): Promise<Record<string, unknown>> {
  const host = (globalThis as any).__vampire_host;
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

  return {
    success: true,
    data: { memoryId: input.memoryId, archived: true }
  };
}

// ── invoke.delete_memory ──

async function invokeDeleteMemory(payload: unknown): Promise<Record<string, unknown>> {
  const host = (globalThis as any).__vampire_host;
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

async function invokeRenameMemory(payload: unknown): Promise<Record<string, unknown>> {
  const host = (globalThis as any).__vampire_host;
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

// ── invoke.reset_game ──

async function invokeResetGame(_payload: unknown): Promise<Record<string, unknown>> {
  const host = (globalThis as any).__vampire_host;
  if (!host) return { success: false, error: 'host_not_available' };

  // 重置状态为初始值（保留日记 ID）
  const resetState = defaultVampireState();
  await saveVampireState(host, resetState);

  return {
    success: true,
    data: { game_phase: 'uninitialized' }
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

  const cursorPos = state.prompt_order?.[state.prompt_cursor];
  const prompt = unconsumed.find(
    (r: any) => r.position === cursorPos
  ) ?? unconsumed[0];

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
      name: `回忆 #${state.active_memory_ids.length + 1}`,
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
    name: activeMemory?.name ?? '回忆',
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

  // 每 8 次骰子检查一次是否需要刷新（与 reshuffle 同步）
  if (state.dice_roll_count === 0 || state.dice_roll_count % 8 !== 0) return;
  // 只在 8 的倍数 + 4 时执行，避免与 reshuffle 冲突
  if (state.dice_roll_count % 16 !== 8) return;

  const records = await host.listPackCollectionRecords('prompt_pool');
  const consumedPositions = records
    .filter((r: any) => r.consumed)
    .map((r: any) => r.position as number);

  // 如果超过 40% 已被消费过，刷新部分陈旧提示
  const consumedRatio = consumedPositions.length / records.length;
  if (consumedRatio < 0.4) return;

  // 选取 5 个最旧的未消费提示，用新鲜内容替换
  const unconsumedRecords = records.filter((r: any) => !r.consumed);
  const toRefresh = unconsumedRecords.slice(0, Math.min(5, unconsumedRecords.length));

  for (const r of toRefresh) {
    const freshContent = generateReplacementPrompt(r.content);
    await host.upsertPackCollectionRecord('prompt_pool', {
      position: r.position,
      content: freshContent,
      consumed: false
    });
  }

  // 重新打乱
  if (toRefresh.length > 0) {
    state.prompt_order = shuffle(state.prompt_order);
    state.prompt_cursor = Math.floor(state.prompt_order.length / 2);
    await saveVampireState(host, state);
  }
}

// ── DataCleaner: 回忆衰减 ──

async function memoryDecay(input: {
  text: string;
  options?: Record<string, unknown>;
}): Promise<{ cleaned: string; metadata: Record<string, unknown> }> {
  return {
    cleaned: input.text,
    metadata: { memory_decay_applied: false }
  };
}

// ── 懒初始化：任意 handler 检测到空池时自动补种 ──
let seedingLock = false;

async function ensurePromptPoolSeeded(host: any): Promise<void> {
  const records = await host.listPackCollectionRecords('prompt_pool');
  if (records.length > 0) return;
  if (seedingLock) return; // 防止并发重复播种
  seedingLock = true;
  try {
    await seedPromptPool(host);
  } finally {
    seedingLock = false;
  }
}

// ── 种子提示池 ──

async function seedPromptPool(host: any): Promise<void> {
  const records = await host.listPackCollectionRecords('prompt_pool');
  if (records.length > 0) return;

  const seedPrompts = [
    // ── 第1组：基础引导 (0-9) ──
    '新的法律和社会习俗让你更难藏身于人群之中。你几乎被捕，险些丧命的过程是怎么样的？检验一项技艺，创造一项技艺，创造一个为你提供帮助的罪犯凡俗生物。',
    '当太阳升起时，你被困在外面，躲在一个你未曾预料的地方。一个孩子发现了你并与你成为朋友。创建一个凡人儿童角色并记录一次人性化的经历。',
    '因为对鲜血的渴望，你杀死了身边的某个人。杀死一个凡俗生物，如果没有可用角色，那就创造一个凡俗生物再杀死。获得技艺：嗜血。',
    '某个凡俗生物开始侍奉你。那是怎么样的人？为何被你吸引？创造一个新的凡俗生物。',
    '某个值得信赖的凡俗生物以令人震惊的方式背叛了你。失去一种资源，这个人为什么要这么做？你为什么选择宽恕？',
    '某个凡俗生物为了救你牺牲了自己。检验一项技艺，获得一项与爱或信任相关的技艺。',
    '同一个家族的几代人为你服务。这条血脉从任何活着的凡人角色开始，或者从死去的凡人角色的后代开始。她们为自己的服务指定了哪些奇怪的仪式？失去一项资源并创建一个仆从家族资源。',
    '你被某个与你相仿的生物认了出来。创造一个不朽生物，失去一种资源，并获得一项技艺。你会为此失去什么？',
    '夜晚的星辰如风车轮转，季节的变换如白驹过隙，一个世纪过去了。划掉一段回忆，划掉所有凡俗生物。',
    '岁月侵蚀了你的日记。从日记中最早的回忆开始，遗忘其中三个名词。',
    // ── 第2组：城市与隐匿 (10-19) ──
    '你的藏身之处被发现了，一群陌生人正在靠近。你必须立即逃离。失去了什么？获得了什么新的庇护？失去一种资源，获得一种新资源。',
    '你在一座废弃的建筑里发现了一件看起来很古老的物品。它散发出微弱的血腥气息。获得一种新资源。',
    '一个猎人正在城市中寻找超自然存在。他有什么特别的装备？你如何避免被发现？检验一项技艺。',
    '城市中爆发了疾病，医院人满为患。你看到凡人在痛苦中挣扎。创建一个在这场危机中与你产生交集的凡人角色。',
    '有人发现你不需要睡觉。你必须解释这个异常现象。检验一项技艺，失去一种资源。',
    '在一场社交聚会上，你感觉到了另一个非人类的存在。她正在观察你。创造一个不朽角色。',
    '你的旧住所被查封了。你被迫在雨夜中寻找新的住处。失去一种资源，获得一种新资源。',
    '一个孩子注意到你的皮肤在月光下会微微发光。你如何处理这个观察者？创建一个凡人角色。',
    '一封没有署名的信件被送到你手中，里面写着一些只有你才知道的历史细节。获得一项技艺。',
    '你在地下室中意外地沉睡了很久。醒来时，外面已经是另一个季节。创建一个凡人角色。',
    // ── 第3组：际遇与羁绊 (20-29) ──
    '一个凡人向你伸出了手，她的目光里没有恐惧，只有好奇。她正在邀请你做某件事。创建一个凡人角色，获得一项与情感相关的技艺。',
    '一个陌生人用熟悉的眼神看着你，仿佛认识你很久。她称呼你一个旧日的名字。创建一个角色，检验一项技艺。',
    '有人将一封信放在你的门前，信中详细描述了你过去的行为，字里行间充满了愤怒。创建一个敌对凡人角色，失去一种资源。',
    '两个长相相似的女子出现在你面前，一个温柔，一个警惕。其中一个正在打量你的反应。创建一个角色，杀死一个角色。',
    '一个孤儿站在你的门前，手里拿着一个破旧的玩偶。她抬头看着你，眼中没有恐惧。创建一个角色，检验一项技艺。',
    '另一个不朽存在站在你面前，沉默了很久。她的眼神平静而坚决，然后说出了一个决定。杀死一个不朽角色，划掉一段回忆。',
    '一位老妇人临终前交给你一个盒子，里面装着记录你某些行踪的纸页。失去一种资源，创建一个角色。',
    '你在街上看到一个女子，她的容貌与你回忆中的某人完全一致。她正在与别人交谈。创建一个角色，检验一项技艺。',
    '一封古老的信件被一个陌生人交到你手中，信封已经发黄，但字迹依然清晰。创建一个角色。',
    '你在月光下演奏乐器，旋律中包含了只有你才懂的回忆片段。获得一项技艺，记录一段经历。',
    // ── 第4组：冲突与战争 (30-39) ──
    '远处传来战斗的声音，人们正在为某种目标而战。你看到一个受伤的士兵在废墟中爬行。创建一个凡人角色。',
    '有人闯入了你的住所，他们穿着制服，手持武器。杀死一个凡人角色，获得一种新资源。',
    '你在街上遇到了另一个明显不是人类的存在。他正在喝一个容器中的液体。创造一个不朽角色，检验一项技艺。',
    '你回到你的住所，发现它已经被摧毁。废墟中散落着各种物品。失去两项资源，创建一个新的凡人角色。',
    '一个陌生人突然出现在你的面前，他浑身是伤，眼神中充满了恐惧。创建一个角色，获得一项技艺。',
    '有人邀请你加入一个由各种存在组成的团体。他们的目的是什么？检验一项技艺，创建一个不朽角色。',
    '你在人群中看到一个你似乎曾经见过的面孔。他正在庆祝什么，但注意到你后表情凝固了。创建一个角色。',
    '一个孩子独自站在街上，眼中充满了迷茫。他身上有贵族的徽记。创建一个角色，获得一种资源。',
    '阳光突然照进你的藏身之处。你的皮肤开始发热。失去一种资源。',
    '你决定整理你的回忆，将某些过去封存起来。划掉一段回忆，获得一种资源。',
    // ── 第5组：探索与发现 (40-49) ──
    '你进入了一个从未去过的区域。这里有什么吸引你的东西？检验一项技艺，创建一个角色。',
    '你在冰天雪地中发现了一个奇怪的建筑。它看起来不属于这个时代。创建一个不朽角色，获得一项技艺。',
    '你遇到了一个教你特殊技巧的老师。这个技巧能帮助你控制自己。获得一项技艺，失去一种资源。',
    '你在水中发现了一本古老的书。书页虽然湿透，但字迹依然可读。创建一个角色，检验一项技艺。',
    '你尝试了一种不同来源的液体。它的味道与你习惯的不同。获得一项技艺，失去一种资源。',
    '你在沙漠中遇到了一个自称很古老的居民。他知道很多关于这片土地的故事。创建一个不朽角色。',
    '你发现了一个通往另一个地方的入口。入口那边隐约可以看到不同的景象。检验一项技艺，创造一项技艺。',
    '你得到了一张详细的地图，上面标记着多个地点。获得一种资源，创建一个角色。',
    '一种新发明的设备出现在你面前。它对你的存在有反应。失去一种资源，获得一项技艺。',
    '你在旅途中遇到了其他长寿的存在。他们分享了一些经历。创建一个角色，获得一项技艺。',
    // ── 第6组：权力与阴谋 (50-59) ──
    '有人邀请你参加一个秘密聚会。聚会上都是与你类似的存在。创建一个不朽角色，获得一种资源。',
    '你发现一群人正在秘密策划改变现状。他们希望你能加入。检验一项技艺，创建一个角色。',
    '一个古老的文本被交到你手中，其中描述了关于你的内容。创建一个角色，获得一项技艺。',
    '一个年长的存在要求你服从他的命令。他看起来很有权威。检验一项技艺。',
    '一个为你做事的凡人在一场权力斗争中消失了。杀死一个凡人角色，失去一种资源，获得一项技艺。',
    '你看到了一个改变权力结构的机会。你采取了行动。创建一个角色，获得一种资源。',
    '一个凡人组织开始系统地调查超自然存在。他们的首领是谁？创建一个角色，检验一项技艺。',
    '你与另一个存在达成了一项协议。协议的条件是什么？创建一个不朽角色，获得一种资源。',
    '你被要求证明自己的实力。你的对手是谁？检验一项技艺，如果失败则失去一种资源。',
    '一群人将你视为他们信仰的中心。他们向你献上供品。创建一个角色，获得一种资源。'
  ];

  for (let i = 0; i < seedPrompts.length; i++) {
    await host.upsertPackCollectionRecord('prompt_pool', {
      position: i,
      content: seedPrompts[i],
      consumed: false
    });
  }

  // 打乱提示顺序，光标置于中间
  const order = shuffle(Array.from({ length: seedPrompts.length }, (_, i) => i));
  const state = defaultVampireState();
  state.prompt_order = order;
  state.prompt_cursor = Math.floor(order.length / 2);
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
  host.registerHandler('perceive.roll_dice', invokeRollDice);  // 同步骰子

  // ── invoke 动作处理器 ──
  host.registerHandler('invoke.roll_dice', invokeRollDice);
  host.registerHandler('invoke.respond_to_prompt', invokeRespondToPrompt);
  host.registerHandler('invoke.character_creation', invokeCharacterCreation);
  host.registerHandler('invoke.reset_game', invokeResetGame);
  host.registerHandler('invoke.archive_memory', invokeArchiveMemory);
  host.registerHandler('invoke.delete_memory', invokeDeleteMemory);
  host.registerHandler('invoke.rename_memory', invokeRenameMemory);

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

  // ── DataCleaner: 回忆衰减 ──
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
