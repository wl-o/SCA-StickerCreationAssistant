import { defineStore } from 'pinia'
import { ref } from 'vue'

import { createAIService } from '@/services/ai'
import { resolveProviderDefaults } from '@/services/ai/types'
import { api } from '@/services/storage/api'
import type { AISettings } from '@/types'

const LEGACY_STORAGE_KEY = 'ai-sticker-creator-settings'

const defaultSettings = (): AISettings => ({
  provider: 'deepseek',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-flash',
  temperature: 0.8,
  maxTokens: 2000,
})

/** 旧模型 ID → 当前可用 ID */
function normalizeDeepSeekModel(model: string): string {
  const m = (model || '').trim().toLowerCase()
  if (
    m === 'deepseek-chat' ||
    m === 'deepseek-reasoner' ||
    m === 'deepseek-v4-flash' ||
    m === 'deepseek-v4-flash-vision-exp'
  ) {
    return 'deepseek-flash'
  }
  return model
}

export const useSettingsStore = defineStore('settings', () => {
  const ai = ref<AISettings>(defaultSettings())
  const loaded = ref(false)
  const connectionStatus = ref<'idle' | 'testing' | 'success' | 'failed'>('idle')
  const connectionMessage = ref('')

  async function loadSettings() {
    const remote = await api.get<AISettings>('/api/settings/ai')
    ai.value = { ...defaultSettings(), ...remote }

    // 迁移旧 localStorage 配置到 SQLite（仅一次）
    try {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacy && !ai.value.apiKey) {
        const parsed = JSON.parse(legacy) as Partial<AISettings>
        if (parsed.apiKey) {
          ai.value = { ...ai.value, ...parsed }
          await api.put('/api/settings/ai', ai.value)
          localStorage.removeItem(LEGACY_STORAGE_KEY)
        }
      } else if (legacy) {
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      }
    } catch {
      // ignore migration errors
    }

    // DeepSeek 旧模型名自动切到 deepseek-flash
    if (ai.value.provider === 'deepseek' || ai.value.baseUrl.includes('deepseek.com')) {
      const normalized = normalizeDeepSeekModel(ai.value.model)
      if (normalized !== ai.value.model) {
        ai.value = { ...ai.value, model: normalized }
        try {
          await api.put('/api/settings/ai', ai.value)
        } catch {
          // ignore
        }
      }
    }

    loaded.value = true
  }

  async function saveSettings() {
    ai.value = await api.put<AISettings>('/api/settings/ai', ai.value)
  }

  async function updateAI(patch: Partial<AISettings>) {
    const next = { ...ai.value, ...patch }

    if (patch.provider && patch.provider !== ai.value.provider) {
      const defaults = resolveProviderDefaults(patch.provider)
      if (!patch.baseUrl) next.baseUrl = defaults.baseUrl || next.baseUrl
      if (!patch.model) next.model = defaults.model || next.model
    }

    ai.value = next
    await saveSettings()
  }

  async function testConnection() {
    connectionStatus.value = 'testing'
    connectionMessage.value = '正在测试连接...'

    if (!ai.value.apiKey.trim()) {
      connectionStatus.value = 'failed'
      connectionMessage.value = '请先填写 API Key'
      return false
    }
    if (!ai.value.baseUrl.trim()) {
      connectionStatus.value = 'failed'
      connectionMessage.value = '请先填写 Base URL'
      return false
    }
    if (!ai.value.model.trim()) {
      connectionStatus.value = 'failed'
      connectionMessage.value = '请先填写 Model'
      return false
    }

    try {
      await createAIService(ai.value).testConnection()
      connectionStatus.value = 'success'
      connectionMessage.value = `连接成功 · ${ai.value.model}`
      await saveSettings()
      return true
    } catch (error) {
      connectionStatus.value = 'failed'
      connectionMessage.value = error instanceof Error ? error.message : '连接失败'
      return false
    }
  }

  return {
    ai,
    loaded,
    connectionStatus,
    connectionMessage,
    loadSettings,
    updateAI,
    saveSettings,
    testConnection,
  }
})
