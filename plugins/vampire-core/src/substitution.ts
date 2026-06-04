// ── 替代规则 ──

import type { VampireState } from './types';

export interface SubstitutionResult {
  action_type: string;
  target_ref: unknown;
  payload: Record<string, unknown>;
  reasoning: string;
  confidence: number;
}

export function checkSubstitution(
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

export function applySubstitution(
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
