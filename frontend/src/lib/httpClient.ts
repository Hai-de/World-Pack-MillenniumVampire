import type { ShellContext } from './types'

interface ActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 基于 capability-based action dispatch 的 HTTP 客户端。
 * 所有游戏操作通过 POST /api/packs/:packId/actions 发送。
 * - perceive.* → 同步查询，返回数据
 * - invoke.* → 异步入队，返回 intent_id
 */
export class VampireHttpClient {
  private readonly baseUrl: string
  private readonly packId: string
  private readonly authToken: string

  constructor(context: ShellContext) {
    this.baseUrl = context.api_base_url
    this.packId = context.pack_id
    this.authToken = context.auth_token
  }

  private async request<T>(capabilityKey: string, payload: Record<string, unknown> = {}): Promise<T> {
    const url = `${this.baseUrl}/api/packs/${this.packId}/actions`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        capability_key: capabilityKey,
        payload
      })
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      throw new Error(errorBody.error ?? `Action failed: ${response.status}`)
    }

    const result: ActionResponse<T> = await response.json()
    if (!result.success) {
      throw new Error(result.error ?? 'Action returned success=false')
    }

    return result.data as T
  }

  // ─── perceive.* 查询（同步） ───

  async getCurrentPrompt(): Promise<{ id: string; content: string; position: number }> {
    return this.request('perceive.current_prompt')
  }

  async getCharacterState(): Promise<Record<string, unknown>> {
    return this.request('perceive.character_state')
  }

  async getDiaryEntries(): Promise<{ entries: Array<{ id: string; content: string; createdAt: string }> }> {
    return this.request('perceive.diary_entries')
  }

  async getChronicle(): Promise<{ records: Array<Record<string, unknown>> }> {
    return this.request('perceive.chronicle')
  }

  async getFullStateSnapshot(): Promise<Record<string, unknown>> {
    return this.request('perceive.full_state_snapshot')
  }

  // ─── invoke.* 调用（异步，返回 intent_id） ───

  async rollDice(): Promise<{ intent_id: string; d10: number; d6: number; total: number }> {
    return this.request('invoke.roll_dice')
  }

  async respondToPrompt(payload: {
    promptId: string
    response: string
    mode: 'agent' | 'player'
  }): Promise<{ intent_id: string }> {
    return this.request('invoke.respond_to_prompt', payload)
  }

  async writeDiaryEntry(payload: {
    memoryId: string
  }): Promise<{ intent_id: string }> {
    return this.request('invoke.write_diary_entry', payload)
  }

  async characterCreation(payload: {
    formData: Record<string, unknown>
  }): Promise<{ intent_id: string }> {
    return this.request('invoke.character_creation', payload)
  }

  async passTime(): Promise<{ intent_id: string }> {
    return this.request('invoke.pass_time')
  }
}
