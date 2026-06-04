// ── 状态读写 ──

import type { VampireState } from './types';
import { VAMPIRE_STATE_ID, isRecord } from './types';

export function getHost(): any {
  return (globalThis as any).__vampire_host;
}

export async function loadVampireState(host: any): Promise<VampireState> {
  const records = await host.listPackCollectionRecords('vampire_state');
  const record = records.find((r: any) => r.id === VAMPIRE_STATE_ID);
  if (record && isRecord(record.state_json)) {
    const raw = record.state_json as Record<string, unknown>;
    return raw as unknown as VampireState;
  }
  return defaultVampireState();
}

export function defaultVampireState(): VampireState {
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
    diary_id: null,
    prompt_cursor: 0,
    prompt_order: [],
    dice_roll_count: 0,
    game_phase: 'uninitialized'
  };
}

export async function saveVampireState(host: any, state: VampireState): Promise<void> {
  await host.upsertPackCollectionRecord('vampire_state', {
    id: VAMPIRE_STATE_ID,
    state_json: state,
    updated_at: new Date().toISOString()
  });
}
