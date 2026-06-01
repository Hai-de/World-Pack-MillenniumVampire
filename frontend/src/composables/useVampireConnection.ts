import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import type { ShellContext } from '../lib/types'
import { useUiStore } from '../stores/uiStore'

export interface PendingAction {
  id: string
  capabilityKey: string
  payload: Record<string, unknown>
  timestamp: string
}

export interface UseVampireConnectionReturn {
  connectionStatus: Ref<'connected' | 'reconnecting' | 'disconnected'>
  pendingActions: Ref<PendingAction[]>
  flushPending: () => Promise<void>
  manualReconnect: () => Promise<void>
  lastSyncTime: Ref<Date | null>
  isPolling: Ref<boolean>
}

/**
 * WebSocket 连接管理 composable。
 * 吸血鬼世界包是单人回合制游戏，WebSocket 主要用于推送后台 Agent 结果。
 * 断线时不影响阅读已有内容和本地编辑，仅禁用骰子投掷和 Agent 生成。
 */
export function useVampireConnection(shellContext: ShellContext): UseVampireConnectionReturn {
  const uiStore = useUiStore()

  const connectionStatus = ref<'connected' | 'reconnecting' | 'disconnected'>('connected')
  const pendingActions = ref<PendingAction[]>([])
  const lastSyncTime = ref<Date | null>(null)
  const isPolling = ref(false)

  let ws: WebSocket | null = null
  let reconnectAttempts = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let pollingTimer: ReturnType<typeof setInterval> | null = null
  const MAX_RECONNECT_ATTEMPTS = 5
  const POLLING_INTERVAL = 10_000

  function getWsUrl(): string {
    const protocol = shellContext.api_base_url.startsWith('https') ? 'wss' : 'ws'
    const host = new URL(shellContext.api_base_url).host
    return `${protocol}://${host}/ws/packs/${shellContext.pack_id}`
  }

  function connect() {
    if (ws?.readyState === WebSocket.OPEN) return

    try {
      ws = new WebSocket(getWsUrl())

      ws.onopen = () => {
        connectionStatus.value = 'connected'
        reconnectAttempts = 0
        lastSyncTime.value = new Date()
        uiStore.setConnectionStatus('connected')
        stopPolling()
      }

      ws.onclose = () => {
        if (connectionStatus.value === 'connected') {
          connectionStatus.value = 'reconnecting'
          uiStore.setConnectionStatus('reconnecting')
          scheduleReconnect()
        }
      }

      ws.onerror = () => {
        ws?.close()
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          // 处理后台 Agent 推送结果
          console.debug('[WS] Received:', message.type)
          lastSyncTime.value = new Date()
        } catch {
          console.warn('[WS] Failed to parse message')
        }
      }
    } catch {
      connectionStatus.value = 'reconnecting'
      uiStore.setConnectionStatus('reconnecting')
      scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      connectionStatus.value = 'disconnected'
      uiStore.setConnectionStatus('disconnected')
      return
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30_000)
    reconnectAttempts++

    reconnectTimer = setTimeout(() => {
      connect()
    }, delay)
  }

  function startPolling() {
    if (pollingTimer) return
    isPolling.value = true

    pollingTimer = setInterval(async () => {
      try {
        // HTTP 轮询降级 — 获取最新快照
        lastSyncTime.value = new Date()
      } catch {
        console.warn('[Polling] Failed to fetch snapshot')
      }
    }, POLLING_INTERVAL)
  }

  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
    isPolling.value = false
  }

  async function flushPending() {
    if (pendingActions.value.length === 0) return

    const actions = [...pendingActions.value]
    pendingActions.value = []

    for (const action of actions) {
      try {
        // replay 排队操作
        console.debug('[Replay] Flushing action:', action.capabilityKey)
      } catch {
        // replay 失败，重新入队
        pendingActions.value.push(action)
      }
    }
  }

  async function manualReconnect() {
    reconnectAttempts = 0
    connectionStatus.value = 'reconnecting'
    uiStore.setConnectionStatus('reconnecting')
    connect()
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    stopPolling()
    if (ws) {
      ws.close()
      ws = null
    }
  })

  return {
    connectionStatus,
    pendingActions,
    flushPending,
    manualReconnect,
    lastSyncTime,
    isPolling
  }
}
