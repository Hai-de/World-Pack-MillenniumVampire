import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface AudioSettings {
  enabled: boolean
  masterVolume: number
  diceVolume: number
  pageFlipVolume: number
  ambientVolume: number
}

export const useUiStore = defineStore('ui', () => {
  // ─── 侧边栏状态 ───
  const sidebarOpen = ref<boolean>(true)
  const activePanel = ref<string>('vampire')

  // ─── 连接状态 ───
  const connectionStatus = ref<'connected' | 'reconnecting' | 'disconnected'>('connected')
  const lastSyncTime = ref<Date | null>(null)

  // ─── 音效设置 ───
  const audioSettings = ref<AudioSettings>({
    enabled: true,
    masterVolume: 70,
    diceVolume: 80,
    pageFlipVolume: 60,
    ambientVolume: 50
  })

  // ─── 从 localStorage 加载音效设置 ───
  function loadAudioSettings(packId: string) {
    try {
      const saved = localStorage.getItem(`vampire_audio_${packId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        audioSettings.value = { ...audioSettings.value, ...parsed }
      }
    } catch (e) {
      console.warn('Failed to load audio settings:', e)
    }
  }

  // ─── 保存音效设置到 localStorage ───
  function saveAudioSettings(packId: string) {
    try {
      localStorage.setItem(`vampire_audio_${packId}`, JSON.stringify(audioSettings.value))
    } catch (e) {
      console.warn('Failed to save audio settings:', e)
    }
  }

  // ─── 计算属性 ───
  const isAudioEnabled = computed(() => audioSettings.value.enabled)
  const effectiveVolume = computed(() => 
    audioSettings.value.enabled ? audioSettings.value.masterVolume / 100 : 0
  )

  // ─── 操作 ───
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function setActivePanel(panel: string) {
    activePanel.value = panel
  }

  function setConnectionStatus(status: 'connected' | 'reconnecting' | 'disconnected') {
    connectionStatus.value = status
    if (status === 'connected') {
      lastSyncTime.value = new Date()
    }
  }

  function updateAudioSettings(settings: Partial<AudioSettings>) {
    audioSettings.value = { ...audioSettings.value, ...settings }
  }

  function toggleAudio() {
    audioSettings.value.enabled = !audioSettings.value.enabled
  }

  return {
    // 状态
    sidebarOpen,
    activePanel,
    connectionStatus,
    lastSyncTime,
    audioSettings,
    // 计算属性
    isAudioEnabled,
    effectiveVolume,
    // 操作
    toggleSidebar,
    setActivePanel,
    setConnectionStatus,
    loadAudioSettings,
    saveAudioSettings,
    updateAudioSettings,
    toggleAudio
  }
})
