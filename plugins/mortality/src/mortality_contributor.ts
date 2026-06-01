/**
 * Mortality Contributor — 凡俗生物死亡判定插件 (pack-local plugin)
 *
 * 放置位置：<pack-dir>/plugins/mortality/src/mortality_contributor.ts
 *
 * 使用项目框架提供的 StepContributor 扩展点，在每次 sim loop step 2
 * (world engine prepare) 时自动运行。遍历所有 tags 包含 "mortal" 的实体，
 * 按死亡曲线判定生死。
 *
 * 框架层提供的能力：
 *   - requestedStep 管道 (agent 输出 → sim loop 消费)
 *   - set_requested_step_ticks 内核 intent
 *   - StepContributor 插件注册机制
 *
 * 本插件提供的逻辑：
 *   - 凡俗生物识别 (tags: ["mortal"])
 *   - 年龄累加 (每次 tick age += elapsedTicks)
 *   - Sigmoid 死亡曲线判定
 */

// ── 本地类型定义 ──────────────────────────────────────────
// 不引用 @yidhras/contracts，插件运行在隔离的 Worker 线程中。

interface WorldStepPrepareRequest {
  step_ticks: string;
  reason: string;
  [key: string]: unknown;
}

interface WorldEngineSessionContext {
  readonly pack_id: string;
  readonly current_tick: string;
  readonly current_revision: string;
  readonly world_entities: ReadonlyArray<Record<string, unknown>>;
  readonly entity_states: ReadonlyArray<Record<string, unknown>>;
}

interface WorldStateDeltaOperation {
  op: string;
  target_ref: string;
  namespace: string;
  payload: Record<string, unknown>;
}

interface WorldDomainEvent {
  event_id: string;
  pack_id: string;
  event_type: string;
  emitted_at_tick: string;
  emitted_at_revision: string;
  entity_id: string;
  refs: Record<string, string | null>;
  payload: Record<string, string>;
}

interface WorldEngineObservationRecord {
  kind: string;
  level: string;
  code: string;
  message?: string;
  recorded_at_tick?: string;
  attributes: Record<string, string>;
}

interface StepContribution {
  delta_operations: WorldStateDeltaOperation[];
  emitted_events: WorldDomainEvent[];
  observability: WorldEngineObservationRecord[];
}

// ── Mortality curve ──────────────────────────────────────────

interface MortalityCurveParams {
  maxProbability: number;
  midpoint: number;
  steepness: number;
}

const DEFAULT_PARAMS: MortalityCurveParams = {
  maxProbability: 0.8,
  midpoint: 60,
  steepness: 0.08
};

interface MortalRecord {
  entity_id: string;
  age: number;
  alive: boolean;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

const mortalityProbability = (age: number, params: MortalityCurveParams): number => {
  if (age <= 0) return 0;
  return params.maxProbability / (1 + Math.exp(-params.steepness * (age - params.midpoint)));
};

const parseStepTicks = (input: WorldStepPrepareRequest): number => {
  const ticks = parseInt(input.step_ticks, 10);
  return Number.isFinite(ticks) && ticks > 0 ? ticks : 0;
};

const extractMortals = (context: WorldEngineSessionContext): MortalRecord[] => {
  const mortals: MortalRecord[] = [];
  for (const entity of context.world_entities) {
    if (!isRecord(entity)) continue;
    if (!asStringArray(entity.tags).includes('mortal')) continue;

    const entityId = typeof entity.id === 'string' ? entity.id : null;
    if (!entityId) continue;

    const coreState = context.entity_states.find(
      s => isRecord(s) && s.entity_id === entityId && s.state_namespace === 'core'
    );
    if (!coreState || !isRecord(coreState)) continue;

    const stateJson = isRecord(coreState.state_json) ? coreState.state_json : null;
    if (!stateJson) continue;

    mortals.push({
      entity_id: entityId,
      age: typeof stateJson.age === 'number' ? stateJson.age : 0,
      alive: stateJson.alive !== false
    });
  }
  return mortals;
};

// ── Contributor logic ────────────────────────────────────────

/**
 * 每 tick step 2 调用的 mortality check。
 * 由插件 worker 的 handleInvoke 触发。
 */
const checkMortality = (payload: {
  prepareInput: WorldStepPrepareRequest;
  context: WorldEngineSessionContext;
}): StepContribution | null => {
  const { prepareInput: input, context } = payload;

  const elapsedTicks = parseStepTicks(input);
  if (elapsedTicks <= 0) return null;

  const mortals = extractMortals(context);
  if (mortals.length === 0) return null;

  const pack = context.pack_id;
  const currentTick = context.current_tick;
  const deltaOps: WorldStateDeltaOperation[] = [];
  const deathEvents: WorldDomainEvent[] = [];
  let diedCount = 0;

  for (const mortal of mortals) {
    if (!mortal.alive) {
      // 已死亡的保持原状，但仍需更新 age
      deltaOps.push({
        op: 'upsert_entity_state',
        target_ref: mortal.entity_id,
        namespace: 'core',
        payload: { next: { age: mortal.age + elapsedTicks, alive: false }, reason: 'mortality_check' }
      });
      continue;
    }

    const newAge = mortal.age + elapsedTicks;
    const probability = mortalityProbability(newAge, DEFAULT_PARAMS);
    const roll = Math.random();
    const died = roll < probability;

    deltaOps.push({
      op: 'upsert_entity_state',
      target_ref: mortal.entity_id,
      namespace: 'core',
      payload: { next: { age: newAge, alive: !died }, reason: 'mortality_check' }
    });

    if (died) {
      diedCount++;
      deathEvents.push({
        event_id: `mortality:${mortal.entity_id}:${currentTick}`,
        pack_id: pack,
        event_type: 'mortal_died',
        emitted_at_tick: currentTick,
        emitted_at_revision: currentTick,
        entity_id: mortal.entity_id,
        refs: { entity_id: mortal.entity_id },
        payload: { reason: `Died of old age at ${newAge}`, age: newAge.toString() }
      });
    }
  }

  const observability: WorldEngineObservationRecord[] = [{
    kind: 'log',
    level: 'info',
    code: 'WORLD_PREPARED_STATE_SUMMARY',
    message: `Mortality: ${mortals.length} checked, ${diedCount} died`,
    recorded_at_tick: currentTick,
    attributes: {
      pack_id: pack,
      mortals_checked: mortals.length.toString(),
      mortals_died: diedCount.toString()
    }
  }];

  return {
    delta_operations: deltaOps,
    emitted_events: deathEvents,
    observability
  };
};

// ── Plugin activation ────────────────────────────────────────

/**
 * 插件入口。由 plugin worker 在激活时调用。
 * host 是 ServerPluginHostApi 的 worker-side 实现。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plugin host boundary
export function activate(host: any): void {
  // 注册 StepContributor
  host.registerStepContributor({
    type: 'step_contributor',
    name: 'pack:mortality',
    priority: 10,
    invoke: 'mortality:check_mortality',
    config: {}
  });

  // 注册 handler（invoke 名称必须与 manifest 中的 invoke 一致）
  host.registerHandler('mortality:check_mortality', (input: unknown) => {
    const payload = input as {
      prepareInput: WorldStepPrepareRequest;
      context: WorldEngineSessionContext;
    };
    return checkMortality(payload);
  });
}
