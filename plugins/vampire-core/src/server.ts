// 千年吸血鬼核心逻辑插件 — 入口
// 运行在 Worker 线程中，通过 ServerPluginHostApi 与主机通信

import { perceiveCurrentPrompt, perceiveCharacterState, perceiveDiaryEntries, perceiveChronicle, perceiveFullStateSnapshot } from './perceive';
import { invokeRollDice, invokeRespondToPrompt, invokeCharacterCreation, invokeCreateMemory, invokeArchiveMemory, invokeDeleteMemory, invokeRenameMemory, invokeUpdateExperience, invokeDeleteExperience, invokeResetGame, invokeUpdateStateFields, makeThrowingHandler } from './invoke';
import { processTurn, processDemise } from './narrative';
import { contributeExecution } from './contributor';
import { replenishPromptPool, memoryDecay, seedPromptPool } from './prompt-pool';

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
  host.registerHandler('invoke.create_memory', invokeCreateMemory);
  host.registerHandler('invoke.character_creation', invokeCharacterCreation);
  host.registerHandler('invoke.reset_game', invokeResetGame);
  host.registerHandler('invoke.archive_memory', invokeArchiveMemory);
  host.registerHandler('invoke.delete_memory', invokeDeleteMemory);
  host.registerHandler('invoke.rename_memory', invokeRenameMemory);
  host.registerHandler('invoke.update_experience', invokeUpdateExperience);
  host.registerHandler('invoke.delete_experience', invokeDeleteExperience);
  host.registerHandler('invoke.update_state_fields', invokeUpdateStateFields);

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

  // ── perceive 同步动作处理器（记忆/经历 CRUD） ──
  // perceive 路由会剥离 { success, data } 信封；失败时需 throw 让平台返回 HTTP 错误
  host.registerHandler('perceive.create_memory', makeThrowingHandler(invokeCreateMemory));
  host.registerHandler('perceive.respond_to_prompt', makeThrowingHandler(invokeRespondToPrompt));
  host.registerHandler('perceive.archive_memory', makeThrowingHandler(invokeArchiveMemory));
  host.registerHandler('perceive.delete_memory', makeThrowingHandler(invokeDeleteMemory));
  host.registerHandler('perceive.rename_memory', makeThrowingHandler(invokeRenameMemory));
  host.registerHandler('perceive.update_experience', makeThrowingHandler(invokeUpdateExperience));
  host.registerHandler('perceive.delete_experience', makeThrowingHandler(invokeDeleteExperience));
}
