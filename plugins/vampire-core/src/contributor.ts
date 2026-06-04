// ── 规则贡献者 ──

import { getHost, loadVampireState } from './state';

export async function contributeExecution(
  input: unknown,
  _context: unknown
): Promise<unknown> {
  const host = getHost();
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
