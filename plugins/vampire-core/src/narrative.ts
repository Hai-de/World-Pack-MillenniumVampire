// ── 叙事生成 ──

import type { VampireState } from './types';
import { VAMPIRE_STATE_ID, getPackVariable } from './types';
import { getHost, loadVampireState, saveVampireState } from './state';
import type { SubstitutionResult } from './substitution';
import { checkSubstitution, applySubstitution } from './substitution';

export async function generateNarrative(
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

export async function processTurn(payload: unknown): Promise<SubstitutionResult> {
  const host = getHost();
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

export async function processDemise(_payload: unknown): Promise<SubstitutionResult> {
  const host = getHost();
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
