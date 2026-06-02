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
      const errorInfo = errorBody.error
      const message = typeof errorInfo === 'object' && errorInfo !== null
        ? errorInfo.message ?? errorInfo.code ?? `Action failed: ${response.status}`
        : typeof errorInfo === 'string'
          ? errorInfo
          : `Action failed: ${response.status}`
      console.error(`[HttpClient] ${capabilityKey} failed (${response.status}):`, message, errorBody)
      throw new Error(message)
    }

    const result: ActionResponse<T> = await response.json()
    if (!result.success) {
      console.error(`[HttpClient] ${capabilityKey} returned success=false:`, result.error)
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

  async rollDice(): Promise<{ d10: number; d6: number; total: number; prompt: { id: string; content: string; position: number } }> {
    return this.request('perceive.roll_dice')
  }

  async respondToPrompt(payload: {
    promptId: string
    response: string
    mode: 'agent' | 'player'
  }): Promise<{ intent_id: string }> {
    return this.request('invoke.respond_to_prompt', payload)
  }

  async characterCreation(payload: {
    formData: Record<string, unknown>
  }): Promise<{ intent_id: string }> {
    return this.request('invoke.character_creation', payload)
  }

  async archiveMemory(payload: {
    memoryId: string
  }): Promise<{ memoryId: string; archived: boolean }> {
    return this.request('invoke.archive_memory', payload)
  }

  async deleteMemory(payload: {
    memoryId: string
  }): Promise<{ memoryId: string; deleted: boolean }> {
    return this.request('invoke.delete_memory', payload)
  }

  async renameMemory(payload: {
    memoryId: string
    name: string
  }): Promise<{ memoryId: string; name: string }> {
    return this.request('invoke.rename_memory', payload)
  }

  async resetGame(): Promise<{ intent_id: string }> {
    return this.request('invoke.reset_game')
  }

  async passTime(): Promise<{ intent_id: string }> {
    return this.request('invoke.pass_time')
  }

  // ─── 插件查询 ───

  async getPlugins(): Promise<{ pack_id: string; items: PluginSummary[]; enable_warning?: unknown }> {
    const url = `${this.baseUrl}/api/packs/${this.packId}/plugins`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch plugins: ${response.status}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to fetch plugins')
    }

    return result.data
  }
}

export interface PluginSummary {
  installation_id: string
  plugin_id: string
  name: string
  version: string
  description?: string
  lifecycle_state: string
  last_error?: string | null
  enabled: boolean
}
